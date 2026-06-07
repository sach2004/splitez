import AppFrame from "@/components/AppFrame";
import EmptyState from "@/components/EmptyState";
export default function Friends() {
  return <AppFrame><h1 className="page-title">Friends</h1><EmptyState type="users" title="No friends yet" subtitle="Group members will show up here" /></AppFrame>;
}
