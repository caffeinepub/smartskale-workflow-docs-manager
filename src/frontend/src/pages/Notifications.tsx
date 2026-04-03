import { Bell, BellOff, CheckCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Notification } from "../backend";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";
import { useActor } from "../hooks/useActor";

function timeAgo(nanoseconds: bigint): string {
  const ms = Number(nanoseconds) / 1_000_000;
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function getKey(obj: unknown): string {
  return Object.keys(obj as object)[0];
}

const NOTIF_TYPE_LABELS: Record<string, string> = {
  TASK_ASSIGNED: "Task Assigned",
  TASK_UPDATED: "Task Updated",
  DOC_UPDATED: "Doc Updated",
  PROJECT_UPDATED: "Project Updated",
};

interface Props {
  onRead?: () => void;
}

export function Notifications({ onRead }: Props) {
  const { actor } = useActor();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    if (!actor) return;
    actor
      .getMyNotifications()
      .then((n) => {
        setNotifs(n.sort((a, b) => Number(b.createdAt - a.createdAt)));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: load depends on actor
  useEffect(() => {
    load();
  }, [actor]);

  const markRead = async (id: string) => {
    if (!actor) return;
    await actor.markNotificationRead(id);
    setNotifs((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
    onRead?.();
  };

  const markAll = async () => {
    if (!actor) return;
    await actor.markAllNotificationsRead();
    setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
    toast.success("All notifications marked as read");
  };

  const unreadCount = notifs.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAll}>
            <CheckCheck className="h-4 w-4 mr-1" /> Mark all read
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {["a", "b", "c", "d"].map((k) => (
            <Skeleton key={k} className="h-20" />
          ))}
        </div>
      ) : notifs.length === 0 ? (
        <div className="text-center py-20">
          <BellOff className="h-14 w-14 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-600 mb-1">
            No notifications
          </h3>
          <p className="text-slate-400">You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifs.map((n) => {
            const typeKey = getKey(n.notifType);
            return (
              <Card
                key={n.id}
                className={`border-0 shadow-sm cursor-pointer transition-colors ${
                  n.isRead ? "opacity-60" : "ring-1 ring-blue-200 bg-blue-50/30"
                }`}
                onClick={() => !n.isRead && markRead(n.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        n.isRead ? "bg-slate-100" : "bg-blue-100"
                      }`}
                    >
                      <Bell
                        className={`h-4 w-4 ${n.isRead ? "text-slate-400" : "text-blue-600"}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className="bg-slate-100 text-slate-600 text-xs py-0">
                          {NOTIF_TYPE_LABELS[typeKey] || typeKey}
                        </Badge>
                        {!n.isRead && (
                          <Badge className="bg-blue-600 text-white text-xs py-0">
                            New
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-700 mt-1">{n.message}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
