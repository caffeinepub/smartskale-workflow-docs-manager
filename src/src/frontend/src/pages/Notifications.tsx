import { Bell, CheckCheck, Circle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Notification } from "../backend";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { useActor } from "../hooks/useActor";
import { cn } from "../lib/utils";

function getKey(obj: unknown): string {
  return Object.keys(obj as object)[0];
}

const typeColors: Record<string, string> = {
  TASK_ASSIGNED: "bg-blue-100 text-blue-700",
  TASK_UPDATED: "bg-amber-100 text-amber-700",
  DOC_UPDATED: "bg-purple-100 text-purple-700",
  PROJECT_UPDATED: "bg-green-100 text-green-700",
};

export function Notifications() {
  const { actor } = useActor();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    if (!actor) return;
    actor
      .getMyNotifications()
      .then((n) => {
        setNotifs(n);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [actor]);

  const markRead = async (id: string) => {
    if (!actor) return;
    await actor.markNotificationRead(id);
    setNotifs((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
  };

  const markAll = async () => {
    if (!actor) return;
    await actor.markAllNotificationsRead();
    setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
    toast.success("All notifications marked as read");
  };

  const unread = notifs.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {unread > 0 ? `${unread} unread` : "All caught up"}
          </p>
        </div>
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={markAll}>
            <CheckCheck className="h-4 w-4 mr-1" /> Mark all read
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array(4)
            .fill(0)
            .map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
        </div>
      ) : notifs.length === 0 ? (
        <div className="text-center py-20">
          <Bell className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No notifications yet</p>
          <p className="text-slate-400 text-sm mt-1">
            You'll be notified when tasks are assigned to you
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifs
            .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))
            .map((n) => (
              <div
                key={n.id}
                className={cn(
                  "flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer hover:shadow-sm",
                  n.isRead
                    ? "bg-white border-slate-100"
                    : "bg-blue-50 border-blue-100",
                )}
                onClick={() => !n.isRead && markRead(n.id)}
              >
                <div className="mt-0.5">
                  {n.isRead ? (
                    <Circle className="h-4 w-4 text-slate-300" />
                  ) : (
                    <div className="h-4 w-4 rounded-full bg-blue-500 flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      className={`text-xs ${typeColors[getKey(n.notifType)] || ""}`}
                    >
                      {getKey(n.notifType).replace("_", " ")}
                    </Badge>
                    {!n.isRead && (
                      <span className="text-xs text-blue-600 font-medium">
                        New
                      </span>
                    )}
                  </div>
                  <p
                    className={cn(
                      "text-sm",
                      n.isRead
                        ? "text-slate-600"
                        : "text-slate-800 font-medium",
                    )}
                  >
                    {n.message}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(Number(n.createdAt) / 1_000_000).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
