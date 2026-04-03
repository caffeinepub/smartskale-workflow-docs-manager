import { ArrowLeft, Calendar, GripVertical, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Page } from "../App";
import type { Priority, Task, TaskStatus } from "../backend";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { useActor } from "../hooks/useActor";

interface Props {
  projectId: string;
  navigate: (p: Page) => void;
}

type Column = {
  key: string;
  label: string;
  color: string;
  headerColor: string;
};

const COLUMNS: Column[] = [
  {
    key: "TODO",
    label: "To Do",
    color: "bg-slate-50 border-slate-200",
    headerColor: "bg-slate-200 text-slate-700",
  },
  {
    key: "IN_PROGRESS",
    label: "In Progress",
    color: "bg-blue-50 border-blue-200",
    headerColor: "bg-blue-200 text-blue-800",
  },
  {
    key: "IN_REVIEW",
    label: "In Review",
    color: "bg-amber-50 border-amber-200",
    headerColor: "bg-amber-200 text-amber-800",
  },
  {
    key: "DONE",
    label: "Done",
    color: "bg-green-50 border-green-200",
    headerColor: "bg-green-200 text-green-800",
  },
];

const priorityColors: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-600",
  MEDIUM: "bg-blue-100 text-blue-600",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};

function getKey(obj: unknown): string {
  return Object.keys(obj as object)[0];
}

export function KanbanBoard({ projectId, navigate }: Props) {
  const { actor } = useActor();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);
  const [addDialog, setAddDialog] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
  });
  const [saving, setSaving] = useState(false);

  const load = () => {
    if (!actor) return;
    actor
      .getTasksByProject(projectId)
      .then((t) => {
        setTasks(t);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [actor, projectId]);

  const handleDrop = async (targetStatus: string) => {
    if (!dragId || !actor) return;
    const task = tasks.find((t) => t.id === dragId);
    if (!task || getKey(task.status) === targetStatus) return;
    try {
      await actor.updateTask(
        task.id,
        task.title,
        task.description,
        { [targetStatus]: null } as TaskStatus,
        task.priority,
        task.assigneeId,
        task.dueDate,
        task.tags,
      );
      setTasks((prev) =>
        prev.map((t) =>
          t.id === dragId
            ? { ...t, status: { [targetStatus]: null } as TaskStatus }
            : t,
        ),
      );
    } catch {
      toast.error("Failed to update task");
    }
    setDragId(null);
  };

  const createTask = async () => {
    if (!actor || !form.title.trim()) return;
    setSaving(true);
    try {
      const t = await actor.createTask(
        projectId,
        form.title,
        form.description,
        { TODO: null } as TaskStatus,
        { [form.priority]: null } as Priority,
        [],
        [],
        [],
      );
      toast.success("Task created");
      setTasks((prev) => [...prev, t]);
      setAddDialog(false);
      setForm({ title: "", description: "", priority: "MEDIUM" });
    } catch {
      toast.error("Failed to create task");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 h-full">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ name: "projects" })}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold text-slate-900 flex-1">
          Kanban Board
        </h1>
        <Button onClick={() => setAddDialog(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add Task
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4 min-h-[70vh]">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => getKey(t.status) === col.key);
          return (
            <div
              key={col.key}
              className={`rounded-xl border-2 ${col.color} flex flex-col`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(col.key)}
            >
              <div
                className={`px-3 py-2.5 rounded-t-lg ${col.headerColor} flex items-center justify-between`}
              >
                <span className="font-semibold text-sm">{col.label}</span>
                <span className="text-xs font-bold bg-white/60 rounded-full px-2 py-0.5">
                  {colTasks.length}
                </span>
              </div>
              <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                {loading ? (
                  <div className="text-center py-4 text-slate-400 text-sm">
                    Loading...
                  </div>
                ) : colTasks.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    No tasks
                  </div>
                ) : (
                  colTasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => setDragId(task.id)}
                      onDragEnd={() => setDragId(null)}
                      className={`bg-white rounded-lg p-3 shadow-sm border border-transparent hover:border-blue-200 cursor-grab active:cursor-grabbing transition-all ${dragId === task.id ? "opacity-50" : ""}`}
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical className="h-3.5 w-3.5 text-slate-300 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-800 line-clamp-2">
                            {task.title}
                          </div>
                          {task.description && (
                            <div className="text-xs text-slate-500 mt-1 line-clamp-1">
                              {task.description}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-1 mt-2">
                            <Badge
                              className={`text-xs py-0 ${priorityColors[getKey(task.priority)] || ""}`}
                            >
                              {getKey(task.priority)}
                            </Badge>
                            {task.dueDate.length > 0 && (
                              <span className="flex items-center gap-0.5 text-xs text-slate-400">
                                <Calendar className="h-3 w-3" />
                                {new Date(
                                  Number(task.dueDate[0]) / 1_000_000,
                                ).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                rows={2}
              />
            </div>
            <div>
              <Label>Priority</Label>
              <Select
                value={form.priority}
                onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={createTask} disabled={saving}>
              {saving ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
