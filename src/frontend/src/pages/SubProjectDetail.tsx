import {
  ArrowLeft,
  CheckSquare,
  FolderGit2,
  Loader2,
  Plus,
  Tag,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Page } from "../App";
import type { Priority, SubProject, Task, TaskStatus } from "../backend";
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
import { Skeleton } from "../components/ui/skeleton";
import { Textarea } from "../components/ui/textarea";
import { useActor } from "../hooks/useActor";

interface Props {
  id: string;
  parentId: string;
  navigate: (p: Page) => void;
}

function getKey(obj: unknown): string {
  return Object.keys(obj as object)[0];
}

const STATUS_COLORS: Record<string, string> = {
  PLANNING: "bg-slate-100 text-slate-700",
  ACTIVE: "bg-blue-100 text-blue-700",
  ON_HOLD: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-600",
  MEDIUM: "bg-blue-100 text-blue-600",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};

const TASK_STATUS_COLORS: Record<string, string> = {
  TODO: "bg-slate-100 text-slate-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  IN_REVIEW: "bg-amber-100 text-amber-700",
  DONE: "bg-green-100 text-green-700",
};

export function SubProjectDetail({ id, parentId, navigate }: Props) {
  const { actor } = useActor();
  const [subProject, setSubProject] = useState<SubProject | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskDialog, setTaskDialog] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
  });
  const [saving, setSaving] = useState(false);

  const load = () => {
    if (!actor) return;
    Promise.all([actor.getSubProject(id), actor.getTasksByProject(id)])
      .then(([sp, t]) => {
        if (sp.length > 0) setSubProject(sp[0]!);
        setTasks(t);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: load depends on actor and id
  useEffect(() => {
    load();
  }, [actor, id]);

  const createTask = async () => {
    if (!actor || !taskForm.title.trim()) return;
    setSaving(true);
    try {
      await actor.createTask(
        id,
        taskForm.title,
        taskForm.description,
        { TODO: null } as TaskStatus,
        { [taskForm.priority]: null } as Priority,
        [],
        [],
        [],
      );
      toast.success("Task created");
      setTaskDialog(false);
      setTaskForm({ title: "", description: "", priority: "MEDIUM" });
      load();
    } catch {
      toast.error("Failed to create task");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {["a", "b", "c"].map((k) => (
          <Skeleton key={k} className="h-20" />
        ))}
      </div>
    );
  }

  if (!subProject) {
    return (
      <div className="text-center py-20 text-slate-400">
        Sub-project not found.{" "}
        <Button
          variant="link"
          onClick={() => navigate({ name: "project-detail", id: parentId })}
        >
          Go back
        </Button>
      </div>
    );
  }

  const statusKey = getKey(subProject.status);
  const priorityKey = getKey(subProject.priority);

  return (
    <div className="space-y-6" data-ocid="sub_project_detail.page">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          data-ocid="sub_project_detail.back.button"
          onClick={() => navigate({ name: "project-detail", id: parentId })}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900 truncate">
              {subProject.name}
            </h1>
            <Badge className={`text-xs ${STATUS_COLORS[statusKey] || ""}`}>
              {statusKey.replace(/_/g, " ")}
            </Badge>
            <Badge className={`text-xs ${PRIORITY_COLORS[priorityKey] || ""}`}>
              {priorityKey}
            </Badge>
            {subProject.category && (
              <Badge className="text-xs bg-teal-100 text-teal-700">
                <Tag className="h-3 w-3 mr-1" />
                {subProject.category}
              </Badge>
            )}
          </div>
          {subProject.description && (
            <p className="text-slate-500 text-sm mt-1">
              {subProject.description}
            </p>
          )}
        </div>
      </div>

      {/* Meta info */}
      <div className="flex flex-wrap gap-4 text-sm text-slate-500">
        {subProject.dueDate.length > 0 && (
          <span>
            Due:{" "}
            <strong className="text-slate-700">
              {new Date(
                Number(subProject.dueDate[0]) / 1_000_000,
              ).toLocaleDateString()}
            </strong>
          </span>
        )}
        <span>
          Members:{" "}
          <strong className="text-slate-700">
            {subProject.memberIds.length}
          </strong>
        </span>
        <span>
          Created:{" "}
          <strong className="text-slate-700">
            {new Date(
              Number(subProject.createdAt) / 1_000_000,
            ).toLocaleDateString()}
          </strong>
        </span>
      </div>

      {/* Tasks section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-slate-400" />
            Tasks ({tasks.length})
          </h2>
          <Button
            size="sm"
            data-ocid="sub_project_detail.add_task.button"
            onClick={() => setTaskDialog(true)}
          >
            <Plus className="h-4 w-4 mr-1" /> Add Task
          </Button>
        </div>

        {tasks.length === 0 ? (
          <div
            className="text-center py-16 border-2 border-dashed border-slate-200 rounded-xl"
            data-ocid="sub_project_detail.tasks.empty_state"
          >
            <FolderGit2 className="h-10 w-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">No tasks yet</p>
            <p className="text-slate-300 text-sm mb-4">
              Add the first task to this sub-project
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setTaskDialog(true)}
            >
              <Plus className="h-4 w-4 mr-1" /> Add Task
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((t, i) => (
              <Card
                key={t.id}
                className="border-0 shadow-sm"
                data-ocid={`sub_project_detail.tasks.item.${i + 1}`}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-800">{t.title}</div>
                    {t.description && (
                      <div className="text-sm text-slate-500 mt-0.5 truncate">
                        {t.description}
                      </div>
                    )}
                  </div>
                  <Badge
                    className={`text-xs shrink-0 ${
                      TASK_STATUS_COLORS[getKey(t.status)] || ""
                    }`}
                  >
                    {getKey(t.status).replace(/_/g, " ")}
                  </Badge>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {getKey(t.priority)}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Task Dialog */}
      <Dialog open={taskDialog} onOpenChange={setTaskDialog}>
        <DialogContent data-ocid="sub_project_detail.add_task.dialog">
          <DialogHeader>
            <DialogTitle>New Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Title *</Label>
              <Input
                data-ocid="sub_project_detail.task_title.input"
                value={taskForm.title}
                onChange={(e) =>
                  setTaskForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="Task title"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                data-ocid="sub_project_detail.task_description.textarea"
                value={taskForm.description}
                onChange={(e) =>
                  setTaskForm((f) => ({ ...f, description: e.target.value }))
                }
                rows={2}
                placeholder="Optional description"
              />
            </div>
            <div>
              <Label>Priority</Label>
              <Select
                value={taskForm.priority}
                onValueChange={(v) =>
                  setTaskForm((f) => ({ ...f, priority: v }))
                }
              >
                <SelectTrigger data-ocid="sub_project_detail.task_priority.select">
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
            <Button
              variant="outline"
              data-ocid="sub_project_detail.cancel_task.button"
              onClick={() => setTaskDialog(false)}
            >
              Cancel
            </Button>
            <Button
              data-ocid="sub_project_detail.save_task.button"
              onClick={createTask}
              disabled={saving || !taskForm.title.trim()}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Task"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
