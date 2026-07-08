import { ShieldAlert } from "lucide-react";
import { EmptyState } from "@/components/empty-state";

export function Forbidden() {
  return (
    <EmptyState
      icon={ShieldAlert}
      title="403 - Access denied"
      description="You don't have permission to view this page. Ask an admin if you think this is a mistake."
    />
  );
}
