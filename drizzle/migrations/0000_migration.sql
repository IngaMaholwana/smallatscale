-- ROLES
create type public.app_role as enum ('admin','vendor','supplier');
create type public.verification_status as enum ('pending','verified','rejected');
create type public.group_status as enum ('open','moq_reached','supplier_confirmed','supplier_rejected','ready','fulfilled','completed','cancelled');
create type public.payment_status as enum ('unpaid','paid','refunded');
create type public.collection_method as enum ('supplier','shared_point');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  business_name text not null default '',
  phone text,
  location text,
  email text,
  created_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles readable by signed-in" on public.profiles for select to authenticated using (true);
create policy "update own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create policy "read own roles or admin" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create table public.supplier_verifications (
  supplier_id uuid primary key,
  status public.verification_status not null default 'pending',
  note text,
  updated_at timestamptz not null default now()
);
grant select on public.supplier_verifications to authenticated;
grant all on public.supplier_verifications to service_role;
alter table public.supplier_verifications enable row level security;
create policy "verifications readable" on public.supplier_verifications for select to authenticated using (true);

create or replace function public.is_verified_supplier(_uid uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.supplier_verifications where supplier_id = _uid and status = 'verified') $$;

-- signup trigger
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare r text := coalesce(new.raw_user_meta_data->>'role','vendor');
begin
  if r not in ('vendor','supplier') then r := 'vendor'; end if;
  insert into public.profiles (id, full_name, business_name, phone, location, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), coalesce(new.raw_user_meta_data->>'business_name',''),
          new.raw_user_meta_data->>'phone', new.raw_user_meta_data->>'location', new.email);
  insert into public.user_roles (user_id, role) values (new.id, r::public.app_role);
  if r = 'supplier' then insert into public.supplier_verifications (supplier_id) values (new.id); end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- CATALOGUE
create table public.products (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null,
  name text not null,
  description text not null default '',
  unit text not null default 'unit',
  base_price numeric(12,2) not null check (base_price > 0),
  moq integer not null check (moq > 0),
  stock_available integer not null default 0,
  lead_time_days integer not null default 3,
  collection_point text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "products visible" on public.products for select to authenticated
  using ((active and public.is_verified_supplier(supplier_id)) or supplier_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "supplier inserts own" on public.products for insert to authenticated
  with check (supplier_id = auth.uid() and public.has_role(auth.uid(),'supplier'));
create policy "supplier updates own" on public.products for update to authenticated using (supplier_id = auth.uid()) with check (supplier_id = auth.uid());
create policy "supplier deletes own" on public.products for delete to authenticated using (supplier_id = auth.uid());

create table public.price_tiers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  min_qty integer not null check (min_qty > 0),
  unit_price numeric(12,2) not null check (unit_price > 0),
  unique (product_id, min_qty)
);
grant select, insert, update, delete on public.price_tiers to authenticated;
grant all on public.price_tiers to service_role;
alter table public.price_tiers enable row level security;
create policy "tiers visible" on public.price_tiers for select to authenticated
  using (exists (select 1 from public.products p where p.id = product_id));
create policy "tiers owner write" on public.price_tiers for all to authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.supplier_id = auth.uid()))
  with check (exists (select 1 from public.products p where p.id = product_id and p.supplier_id = auth.uid()));

create or replace function public.unit_price_for(_product_id uuid, _qty integer)
returns numeric language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select unit_price from public.price_tiers where product_id = _product_id and min_qty <= _qty order by min_qty desc limit 1),
    (select base_price from public.products where id = _product_id))
$$;

-- GROUPS
create table public.buying_groups (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  supplier_id uuid not null,
  creator_id uuid not null,
  name text not null,
  moq integer not null,
  deadline timestamptz not null,
  status public.group_status not null default 'open',
  collection_method public.collection_method not null default 'supplier',
  collection_point text not null default '',
  final_unit_price numeric(12,2),
  supplier_note text,
  created_at timestamptz not null default now()
);
grant select on public.buying_groups to authenticated;
grant all on public.buying_groups to service_role;
alter table public.buying_groups enable row level security;
create policy "groups visible" on public.buying_groups for select to authenticated using (true);

create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.buying_groups(id) on delete cascade,
  vendor_id uuid not null,
  quantity integer not null check (quantity > 0),
  confirmed boolean not null default false,
  payment_status public.payment_status not null default 'unpaid',
  amount_due numeric(12,2),
  paid_at timestamptz,
  collected boolean not null default false,
  created_at timestamptz not null default now(),
  unique (group_id, vendor_id)
);
grant select on public.group_members to authenticated;
grant all on public.group_members to service_role;
alter table public.group_members enable row level security;
create policy "members visible" on public.group_members for select to authenticated using (true);

create table public.order_events (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.buying_groups(id) on delete cascade,
  actor_id uuid,
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
grant select on public.order_events to authenticated;
grant all on public.order_events to service_role;
alter table public.order_events enable row level security;
create policy "events visible to participants" on public.order_events for select to authenticated using (
  public.has_role(auth.uid(),'admin')
  or exists (select 1 from public.buying_groups g where g.id = group_id and (g.supplier_id = auth.uid() or g.creator_id = auth.uid()))
  or exists (select 1 from public.group_members m where m.group_id = order_events.group_id and m.vendor_id = auth.uid()));

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  body text not null default '',
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, update on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "own notifications" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "mark own read" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- HELPERS
create or replace function public._log(_group uuid, _type text, _details jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = public
as $$ insert into public.order_events (group_id, actor_id, event_type, details) values (_group, auth.uid(), _type, _details) $$;

create or replace function public._notify_group(_group uuid, _title text, _body text, _include_supplier boolean default true)
returns void language plpgsql security definer set search_path = public
as $$
begin
  insert into public.notifications (user_id, title, body, link)
  select m.vendor_id, _title, _body, '/groups/' || _group from public.group_members m where m.group_id = _group;
  if _include_supplier then
    insert into public.notifications (user_id, title, body, link)
    select g.supplier_id, _title, _body, '/groups/' || _group from public.buying_groups g where g.id = _group;
  end if;
end $$;

create or replace function public.group_total(_group uuid)
returns integer language sql stable security definer set search_path = public
as $$ select coalesce(sum(quantity),0)::int from public.group_members where group_id = _group $$;

create or replace function public._recompute_group(_group uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare g public.buying_groups; total int;
begin
  select * into g from public.buying_groups where id = _group for update;
  total := public.group_total(_group);
  if g.status = 'open' and total >= g.moq then
    update public.buying_groups set status = 'moq_reached' where id = _group;
    perform public._log(_group, 'moq_reached', jsonb_build_object('total', total));
    perform public._notify_group(_group, 'Minimum order reached', g.name || ' hit ' || total || ' units. Waiting for supplier confirmation.');
  elsif g.status = 'moq_reached' and total < g.moq then
    update public.buying_groups set status = 'open' where id = _group;
    perform public._log(_group, 'moq_lost', jsonb_build_object('total', total));
  end if;
end $$;

-- ACTIONS
create or replace function public.create_group(_product_id uuid, _name text, _deadline timestamptz, _quantity int, _collection_method public.collection_method, _collection_point text)
returns uuid language plpgsql security definer set search_path = public
as $$
declare p public.products; gid uuid;
begin
  if not public.has_role(auth.uid(),'vendor') then raise exception 'Only vendors can create groups'; end if;
  select * into p from public.products where id = _product_id and active;
  if p.id is null or not public.is_verified_supplier(p.supplier_id) then raise exception 'Product not available'; end if;
  if _quantity < 1 then raise exception 'Quantity must be at least 1'; end if;
  if _deadline <= now() then raise exception 'Deadline must be in the future'; end if;
  insert into public.buying_groups (product_id, supplier_id, creator_id, name, moq, deadline, collection_method, collection_point)
  values (p.id, p.supplier_id, auth.uid(), _name, p.moq, _deadline, _collection_method,
          case when _collection_method = 'supplier' then p.collection_point else coalesce(_collection_point,'') end)
  returning id into gid;
  insert into public.group_members (group_id, vendor_id, quantity) values (gid, auth.uid(), _quantity);
  perform public._log(gid, 'group_created', jsonb_build_object('quantity', _quantity));
  insert into public.notifications (user_id, title, body, link) values (p.supplier_id, 'New buying group', _name || ' started for ' || p.name, '/groups/' || gid);
  perform public._recompute_group(gid);
  return gid;
end $$;

create or replace function public.join_group(_group uuid, _quantity int)
returns void language plpgsql security definer set search_path = public
as $$
declare g public.buying_groups; existed boolean;
begin
  if not public.has_role(auth.uid(),'vendor') then raise exception 'Only vendors can join groups'; end if;
  if _quantity < 1 then raise exception 'Quantity must be at least 1'; end if;
  select * into g from public.buying_groups where id = _group;
  if g.status not in ('open','moq_reached') or g.deadline <= now() then raise exception 'This group is no longer accepting changes'; end if;
  select exists(select 1 from public.group_members where group_id = _group and vendor_id = auth.uid()) into existed;
  insert into public.group_members (group_id, vendor_id, quantity) values (_group, auth.uid(), _quantity)
  on conflict (group_id, vendor_id) do update set quantity = excluded.quantity;
  perform public._log(_group, case when existed then 'quantity_changed' else 'member_joined' end, jsonb_build_object('quantity', _quantity));
  perform public._recompute_group(_group);
end $$;

create or replace function public.leave_group(_group uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare g public.buying_groups;
begin
  select * into g from public.buying_groups where id = _group;
  if g.status not in ('open','moq_reached') then raise exception 'You can only leave before the supplier confirms'; end if;
  delete from public.group_members where group_id = _group and vendor_id = auth.uid();
  perform public._log(_group, 'member_left');
  if not exists (select 1 from public.group_members where group_id = _group) then
    update public.buying_groups set status = 'cancelled' where id = _group;
    perform public._log(_group, 'group_cancelled', jsonb_build_object('reason','no members'));
  else
    perform public._recompute_group(_group);
  end if;
end $$;

create or replace function public.supplier_decide(_group uuid, _accept boolean, _note text default null)
returns void language plpgsql security definer set search_path = public
as $$
declare g public.buying_groups; total int; price numeric;
begin
  select * into g from public.buying_groups where id = _group for update;
  if g.supplier_id <> auth.uid() then raise exception 'Not your group'; end if;
  if g.status <> 'moq_reached' then raise exception 'Group has not reached its minimum order'; end if;
  if _accept then
    total := public.group_total(_group);
    price := public.unit_price_for(g.product_id, total);
    update public.buying_groups set status = 'supplier_confirmed', final_unit_price = price, supplier_note = _note where id = _group;
    update public.group_members set amount_due = round(quantity * price, 2) where group_id = _group;
    perform public._log(_group, 'supplier_confirmed', jsonb_build_object('unit_price', price, 'total_qty', total));
    perform public._notify_group(_group, 'Supplier confirmed your order', g.name || ' is confirmed at R' || price || ' per unit. Please confirm and pay.', false);
  else
    update public.buying_groups set status = 'supplier_rejected', supplier_note = _note where id = _group;
    perform public._log(_group, 'supplier_rejected', jsonb_build_object('note', _note));
    perform public._notify_group(_group, 'Supplier declined the order', g.name || coalesce(': ' || _note, ''), false);
  end if;
end $$;

create or replace function public._check_ready(_group uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare g public.buying_groups;
begin
  select * into g from public.buying_groups where id = _group for update;
  if g.status = 'supplier_confirmed' and not exists (
    select 1 from public.group_members where group_id = _group and (not confirmed or payment_status <> 'paid')) then
    update public.buying_groups set status = 'ready' where id = _group;
    perform public._log(_group, 'all_members_paid');
    insert into public.notifications (user_id, title, body, link) values (g.supplier_id, 'Ready to fulfil', g.name || ': every member has confirmed and paid.', '/groups/' || _group);
  end if;
end $$;

create or replace function public.member_confirm(_group uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare g public.buying_groups;
begin
  select * into g from public.buying_groups where id = _group;
  if g.status <> 'supplier_confirmed' then raise exception 'Nothing to confirm yet'; end if;
  update public.group_members set confirmed = true where group_id = _group and vendor_id = auth.uid();
  if not found then raise exception 'You are not in this group'; end if;
  perform public._log(_group, 'member_confirmed');
  perform public._check_ready(_group);
end $$;

-- Simulated payment (sandbox). Replace with a real payment provider later.
create or replace function public.member_pay(_group uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare g public.buying_groups; m public.group_members;
begin
  select * into g from public.buying_groups where id = _group;
  if g.status <> 'supplier_confirmed' then raise exception 'Payment is not open'; end if;
  select * into m from public.group_members where group_id = _group and vendor_id = auth.uid();
  if m.id is null then raise exception 'You are not in this group'; end if;
  if not m.confirmed then raise exception 'Confirm your order first'; end if;
  if m.payment_status = 'paid' then return; end if;
  update public.group_members set payment_status = 'paid', paid_at = now() where id = m.id;
  perform public._log(_group, 'payment_received', jsonb_build_object('amount', m.amount_due, 'mode', 'simulated'));
  perform public._check_ready(_group);
end $$;

create or replace function public.supplier_fulfil(_group uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare g public.buying_groups;
begin
  select * into g from public.buying_groups where id = _group for update;
  if g.supplier_id <> auth.uid() then raise exception 'Not your group'; end if;
  if g.status <> 'ready' then raise exception 'Group is not ready to fulfil'; end if;
  update public.buying_groups set status = 'fulfilled' where id = _group;
  update public.products set stock_available = greatest(stock_available - public.group_total(_group), 0) where id = g.product_id;
  perform public._log(_group, 'order_fulfilled');
  perform public._notify_group(_group, 'Ready for collection', g.name || ' can be collected at ' || coalesce(nullif(g.collection_point,''),'the supplier') || '.', false);
end $$;

create or replace function public.confirm_collection(_group uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare g public.buying_groups;
begin
  select * into g from public.buying_groups where id = _group for update;
  if g.status <> 'fulfilled' then raise exception 'Order is not ready for collection'; end if;
  update public.group_members set collected = true where group_id = _group and vendor_id = auth.uid();
  if not found then raise exception 'You are not in this group'; end if;
  perform public._log(_group, 'collection_confirmed');
  if not exists (select 1 from public.group_members where group_id = _group and not collected) then
    update public.buying_groups set status = 'completed' where id = _group;
    perform public._log(_group, 'order_completed');
    insert into public.notifications (user_id, title, body, link) values (g.supplier_id, 'Order completed', g.name || ': all members collected.', '/groups/' || _group);
  end if;
end $$;

create or replace function public.admin_set_verification(_supplier uuid, _status public.verification_status, _note text default null)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Admins only'; end if;
  update public.supplier_verifications set status = _status, note = _note, updated_at = now() where supplier_id = _supplier;
  insert into public.notifications (user_id, title, body, link) values (_supplier,
    case when _status = 'verified' then 'You are verified' else 'Verification update' end,
    case when _status = 'verified' then 'Your products are now visible to vendors.' else 'Status: ' || _status || coalesce(' — ' || _note,'') end, '/supplier');
end $$;

-- First-admin bootstrap: only works while no admin exists.
create or replace function public.claim_first_admin()
returns boolean language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then return false; end if;
  if exists (select 1 from public.user_roles where role = 'admin') then return false; end if;
  insert into public.user_roles (user_id, role) values (auth.uid(), 'admin');
  return true;
end $$;

create or replace function public.admin_exists()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where role = 'admin') $$;

revoke execute on function public._log, public._notify_group, public._recompute_group, public._check_ready from public, anon, authenticated;
grant execute on function public.create_group, public.join_group, public.leave_group, public.supplier_decide, public.member_confirm,
  public.member_pay, public.supplier_fulfil, public.confirm_collection, public.admin_set_verification, public.claim_first_admin,
  public.admin_exists, public.unit_price_for, public.group_total, public.has_role, public.is_verified_supplier to authenticated;

alter publication supabase_realtime add table public.group_members;
alter publication supabase_realtime add table public.buying_groups;
alter publication supabase_realtime add table public.notifications;