import { Badge } from "@/components/ui/badge";
import { statusLabel, type GroupStatus } from "@/lib/session";

const tone: Record<GroupStatus, string> = {
  open: "bg-secondary text-secondary-foreground",
  moq_reached: "bg-accent text-accent-foreground",
  supplier_confirmed: "bg-accent text-accent-foreground",
  supplier_rejected: "bg-destructive/15 text-destructive",
  ready: "bg-primary text-primary-foreground",
  fulfilled: "bg-primary text-primary-foreground",
  completed: "bg-success text-success-foreground",
  cancelled: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status }: { status: GroupStatus }) {
  return <Badge className={`border-0 ${tone[status]}`}>{statusLabel[status]}</Badge>;
}
