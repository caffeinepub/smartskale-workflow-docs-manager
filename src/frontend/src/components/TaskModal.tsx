import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Clock,
  Loader2,
  Minus,
  Plus,
  Trash2,
  X,
} from "lucide-react";
// TaskModal.tsx — Task Creation & Editing Component
// Stack: React + TypeScript + Tailwind CSS + shadcn/ui
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Priority, Project, Task, TaskStatus } from "../backend";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Checkbox } from "../components/ui/checkbox";
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

// ─── Types ───────────────────────────────────────────────────────────────────

export type TaskStatusKey = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
export type PriorityKey = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface SubtaskLocal {
  id: number;
  title: string;
  completed: boolean;
}

interface TaskFormState {
  title: string;
  description: string;
  projectId: string;
  status: TaskStatusKey;
  priority: PriorityKey;
  assigneeEmail: string;
  dueDate: string;
  estimatedHours: string;
  tags: string[];
  subtasks: SubtaskLocal[];
}

interface TaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  task?: Task | null;
  projects: Project[];
  teamMembers: Array<{ email: string; name: string }>;
  onSaved: () => void;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: TaskStatusKey; label: string; color: string }[] =
  [
    { value: "TODO", label: "To Do", color: "bg-slate-100 text-slate-700" },
    {
      value: "IN_PROGRESS",
      label: "In Progress",
      color: "bg-blue-100 text-blue-700",
    },
    {
      value: "IN_REVIEW",
      label: "In Review",
      color: "bg-yellow-100 text-yellow-700",
    },
    { value: "DONE", label: "Done", color: "bg-green-100 text-green-700" },
  ];

const PRIORITY_OPTIONS: {
  value: PriorityKey;
  label: string;
  color: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "URGENT",
    label: "Urgent",
    color: "text-red-600",
    icon: <AlertCircle size={14} />,
  },
  {
    value: "HIGH",
    label: "High",
    color: "text-orange-500",
    icon: <ArrowUp size={14} />,
  },
  {
    value: "MEDIUM",
    label: "Medium",
    color: "text-blue-500",
    icon: <Minus size={14} />,
  },
  {
    value: "LOW",
    label: "Low",
    color: "text-slate-400",
    icon: <ArrowDown size={14} />,
  },
];

const SUBTASKS_KEY = "smartskale_subtasks";
const TAGS_KEY = "smartskale_task_tags";

function getStoredSubtasks(taskId: string): SubtaskLocal[] {
  try {
    const all = JSON.parse(
      localStorage.getItem(SUBTASKS_KEY) || "{}",
    ) as Record<string, SubtaskLocal[]>;
    return all[taskId] ?? [];
  } catch {
    return [];
  }
}

function saveSubtasks(taskId: string, subtasks: SubtaskLocal[]) {
  try {
    const all = JSON.parse(
      localStorage.getItem(SUBTASKS_KEY) || "{}",
    ) as Record<string, SubtaskLocal[]>;
    all[taskId] = subtasks;
    localStorage.setItem(SUBTASKS_KEY, JSON.stringify(all));
  } catch {}
}

function saveTags(taskId: string, tags: string[]) {
  try {
    const all = JSON.parse(localStorage.getItem(TAGS_KEY) || "{}") as Record<
      string,
      string[]
    >;
    all[taskId] = tags;
    localStorage.setItem(TAGS_KEY, JSON.stringify(all));
  } catch {}
}

let subtaskCounter = 10000;

function getKey(obj: unknown): string {
  return Object.keys(obj as object)[0];
}

function getAssigneeEmailFromTask(t: Task): string {
  const tag = t.tags.find((tag) => tag.startsWith("assignee:"));
  return tag ? tag.replace("assignee:", "") : "";
}

function buildTagsWithAssignee(
  tags: string[],
  assigneeEmail: string,
): string[] {
  const filtered = tags.filter((t) => !t.startsWith("assignee:"));
  if (assigneeEmail) filtered.push(`assignee:${assigneeEmail}`);
  return filtered;
}

function emptyForm(projectId: string): TaskFormState {
  return {
    title: "",
    description: "",
    projectId,
    status: "TODO",
    priority: "MEDIUM",
    assigneeEmail: "",
    dueDate: "",
    estimatedHours: "",
    tags: [],
    subtasks: [],
  };
}

function taskToForm(t: Task): TaskFormState {
  // Extract user-visible tags (exclude assignee: and forward-note: markers)
  const visibleTags = t.tags.filter(
    (tag) => !tag.startsWith("assignee:") && !tag.startsWith("forward-note:"),
  );
  return {
    title: t.title,
    description: t.description,
    projectId: t.projectId,
    status: getKey(t.status) as TaskStatusKey,
    priority: getKey(t.priority) as PriorityKey,
    assigneeEmail: getAssigneeEmailFromTask(t),
    dueDate: t.dueDate.length > 0 ? String(t.dueDate[0]) : "",
    estimatedHours: "",
    tags: visibleTags,
    subtasks: getStoredSubtasks(t.id),
  };
}

// ─── TaskModal Component ────────────────────────────────────────────────────

export function TaskModal({
  open,
  onOpenChange,
  mode,
  task,
  projects,
  teamMembers,
  onSaved,
}: TaskModalProps) {
  const { actor } = useActor();
  const [form, setForm] = useState<TaskFormState>(
    emptyForm(projects[0]?.id ?? ""),
  );
  const [newSubtask, setNewSubtask] = useState("");
  const [newTag, setNewTag] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      if (mode === "edit" && task) {
        setForm(taskToForm(task));
      } else {
        setForm(emptyForm(projects[0]?.id ?? ""));
      }
      setErrors({});
      setNewSubtask("");
      setNewTag("");
    }
  }, [open, mode, task, projects]);

  const set = <K extends keyof TaskFormState>(
    key: K,
    value: TaskFormState[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: "" }));
  };

  // ── Subtasks ────────────────────────────────────────────────────────────

  const addSubtask = () => {
    const title = newSubtask.trim();
    if (!title) return;
    const subtask: SubtaskLocal = {
      id: subtaskCounter++,
      title,
      completed: false,
    };
    set("subtasks", [...form.subtasks, subtask]);
    setNewSubtask("");
  };

  const toggleSubtask = (id: number) => {
    set(
      "subtasks",
      form.subtasks.map((s) =>
        s.id === id ? { ...s, completed: !s.completed } : s,
      ),
    );
  };

  const deleteSubtask = (id: number) => {
    set(
      "subtasks",
      form.subtasks.filter((s) => s.id !== id),
    );
  };

  // ── Tags ─────────────────────────────────────────────────────────────────

  const addTag = () => {
    const tag = newTag.trim().toLowerCase();
    if (!tag || form.tags.includes(tag)) return;
    set("tags", [...form.tags, tag]);
    setNewTag("");
  };

  // ── Submit ───────────────────────────────────────────────────────────────

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = "Title is required";
    if (!form.projectId) errs.projectId = "Project is required";
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    if (!actor) {
      toast.error("Not connected to backend. Please refresh.");
      return;
    }
    setSaving(true);
    try {
      // Build tags: include assignee marker + user visible tags
      const allTags = buildTagsWithAssignee(form.tags, form.assigneeEmail);

      if (mode === "edit" && task) {
        await actor.updateTask(
          task.id,
          form.title,
          form.description,
          { [form.status]: null } as TaskStatus,
          { [form.priority]: null } as Priority,
          [],
          form.dueDate
            ? [BigInt(new Date(form.dueDate).getTime() * 1_000_000)]
            : [],
          allTags,
        );
        // Persist subtasks and tags locally
        saveSubtasks(task.id, form.subtasks);
        saveTags(task.id, form.tags);
        toast.success(`"${form.title}" updated successfully.`);
      } else {
        const created = await actor.createTask(
          form.projectId,
          form.title,
          form.description,
          { [form.status]: null } as TaskStatus,
          { [form.priority]: null } as Priority,
          [],
          form.dueDate
            ? [BigInt(new Date(form.dueDate).getTime() * 1_000_000)]
            : [],
          allTags,
        );
        saveSubtasks(created.id, form.subtasks);
        saveTags(created.id, form.tags);
        toast.success(`"${form.title}" created successfully.`);
      }
      onSaved();
      onOpenChange(false);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const completedCount = form.subtasks.filter((s) => s.completed).length;
  const subtaskProgress =
    form.subtasks.length > 0
      ? Math.round((completedCount / form.subtasks.length) * 100)
      : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        data-ocid="task.dialog"
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {mode === "create" ? "Create new task" : "Edit task"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="tm-title">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="tm-title"
              data-ocid="task.input"
              placeholder="What needs to be done?"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              className={errors.title ? "border-red-400" : ""}
              autoFocus
            />
            {errors.title && (
              <p className="text-xs text-red-500" data-ocid="task.error_state">
                {errors.title}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="tm-desc">Description</Label>
            <Textarea
              id="tm-desc"
              data-ocid="task.textarea"
              placeholder="Add details, context, or acceptance criteria..."
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Project */}
          {mode === "create" && (
            <div className="space-y-1.5">
              <Label>
                Project <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.projectId}
                onValueChange={(v) => set("projectId", v)}
              >
                <SelectTrigger
                  data-ocid="task.select"
                  className={errors.projectId ? "border-red-400" : ""}
                >
                  <SelectValue placeholder="Select project..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.projectId && (
                <p className="text-xs text-red-500">{errors.projectId}</p>
              )}
            </div>
          )}

          {/* Status + Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => set("status", v as TaskStatusKey)}
              >
                <SelectTrigger data-ocid="task.tab">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          s.color
                        }`}
                      >
                        {s.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select
                value={form.priority}
                onValueChange={(v) => set("priority", v as PriorityKey)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      <span className={`flex items-center gap-1.5 ${p.color}`}>
                        {p.icon}
                        <span className="text-sm">{p.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Due Date + Estimated Hours */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="tm-due">Due date</Label>
              <Input
                id="tm-due"
                type="date"
                value={form.dueDate}
                onChange={(e) => set("dueDate", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tm-hours">
                <span className="flex items-center gap-1">
                  <Clock size={13} /> Estimated hours
                </span>
              </Label>
              <Input
                id="tm-hours"
                type="number"
                min="0"
                step="0.5"
                placeholder="e.g. 4"
                value={form.estimatedHours}
                onChange={(e) => set("estimatedHours", e.target.value)}
              />
            </div>
          </div>

          {/* Assignee */}
          <div className="space-y-1.5">
            <Label>Assign to</Label>
            <Select
              value={form.assigneeEmail || "__none__"}
              onValueChange={(v) =>
                set("assigneeEmail", v === "__none__" ? "" : v)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Unassigned</SelectItem>
                {teamMembers.map((m) => (
                  <SelectItem key={m.email} value={m.email}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {form.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="gap-1 pr-1 text-xs"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() =>
                      set(
                        "tags",
                        form.tags.filter((t) => t !== tag),
                      )
                    }
                    className="ml-1 hover:text-red-500 transition-colors"
                  >
                    <X size={10} />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add tag and press Enter..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
              />
              <Button variant="outline" size="sm" onClick={addTag}>
                <Plus size={14} />
              </Button>
            </div>
          </div>

          {/* Subtasks */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Subtasks</Label>
              {form.subtasks.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {completedCount}/{form.subtasks.length} done (
                  {subtaskProgress}%)
                </span>
              )}
            </div>

            {/* Progress bar */}
            {form.subtasks.length > 0 && (
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-300"
                  style={{ width: `${subtaskProgress}%` }}
                />
              </div>
            )}

            {/* Subtask list */}
            <div className="space-y-1.5 mt-1">
              {form.subtasks.map((s, idx) => (
                <div
                  key={s.id}
                  data-ocid={`task.item.${idx + 1}`}
                  className="flex items-center gap-2 group p-1 rounded hover:bg-slate-50"
                >
                  <Checkbox
                    checked={s.completed}
                    onCheckedChange={() => toggleSubtask(s.id)}
                    data-ocid={`task.checkbox.${idx + 1}`}
                  />
                  <span
                    className={`flex-1 text-sm ${
                      s.completed
                        ? "line-through text-muted-foreground"
                        : "text-foreground"
                    }`}
                  >
                    {s.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteSubtask(s.id)}
                    data-ocid={`task.delete_button.${idx + 1}`}
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add subtask */}
            <div className="flex gap-2">
              <Input
                placeholder="Add a subtask..."
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSubtask();
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={addSubtask}
                data-ocid="task.secondary_button"
              >
                <Plus size={14} />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            data-ocid="task.cancel_button"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving}
            data-ocid="task.submit_button"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : mode === "create" ? (
              "Create task"
            ) : (
              "Save changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Floating Create Button ──────────────────────────────────────────────────

interface CreateTaskButtonProps {
  projects: Project[];
  teamMembers: Array<{ email: string; name: string }>;
  onSaved: () => void;
}

export function CreateTaskButton({
  projects,
  teamMembers,
  onSaved,
}: CreateTaskButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-ocid="task.open_modal_button"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-primary text-primary-foreground rounded-full px-4 py-3 shadow-lg hover:shadow-xl hover:scale-105 transition-all font-medium text-sm"
      >
        <Plus size={18} />
        New task
      </button>
      <TaskModal
        open={open}
        onOpenChange={setOpen}
        mode="create"
        projects={projects}
        teamMembers={teamMembers}
        onSaved={onSaved}
      />
    </>
  );
}
