// TaskModal.tsx — Task Creation & Editing Component
// Stack: React + TypeScript + Tailwind CSS + shadcn/ui
// Compatible with Caffeine.ai (ICP / Motoko backend)
// -------------------------------------------------------
// HOW TO USE:
//   <TaskModal mode="create" onSave={handleSave} />
//   <TaskModal mode="edit" task={existingTask} onSave={handleSave} />

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, X, Trash2, AlertCircle, ArrowUp, ArrowDown, Minus, Clock } from "lucide-react";

// ─── Types (mirror your Motoko backend) ───────────────────────────────────────

export type TaskStatus = "Todo" | "InProgress" | "InReview" | "Done";
export type TaskPriority = "Urgent" | "High" | "Normal" | "Low";

export interface Subtask {
  id: number;
  title: string;
  completed: boolean;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignees: string[];
  dueDate?: string;
  estimatedHours?: number;
  tags: string[];
  subtasks: Subtask[];
  attachments: string[];
  createdAt: number;
  updatedAt: number;
  createdBy: string;
}

// Partial task used when creating (no id/timestamps yet)
export type TaskInput = Omit<Task, "id" | "createdAt" | "updatedAt" | "createdBy">;

interface TaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  task?: Task;                         // required when mode === "edit"
  onSave: (task: TaskInput) => Promise<void>;
  teamMembers?: string[];              // list of available assignees
}

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: TaskStatus; label: string; color: string }[] = [
  { value: "Todo",       label: "To Do",       color: "bg-slate-100 text-slate-700" },
  { value: "InProgress", label: "In Progress",  color: "bg-blue-100 text-blue-700" },
  { value: "InReview",   label: "In Review",    color: "bg-yellow-100 text-yellow-700" },
  { value: "Done",       label: "Done",         color: "bg-green-100 text-green-700" },
];

const PRIORITY_OPTIONS: {
  value: TaskPriority;
  label: string;
  color: string;
  icon: JSX.Element;
}[] = [
  { value: "Urgent", label: "Urgent", color: "text-red-600",    icon: <AlertCircle size={14} /> },
  { value: "High",   label: "High",   color: "text-orange-500", icon: <ArrowUp size={14} /> },
  { value: "Normal", label: "Normal", color: "text-blue-500",   icon: <Minus size={14} /> },
  { value: "Low",    label: "Low",    color: "text-slate-400",  icon: <ArrowDown size={14} /> },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function emptyTask(): TaskInput {
  return {
    title: "",
    description: "",
    status: "Todo",
    priority: "Normal",
    assignees: [],
    dueDate: undefined,
    estimatedHours: undefined,
    tags: [],
    subtasks: [],
    attachments: [],
  };
}

function taskToInput(t: Task): TaskInput {
  return {
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    assignees: [...t.assignees],
    dueDate: t.dueDate,
    estimatedHours: t.estimatedHours,
    tags: [...t.tags],
    subtasks: t.subtasks.map((s) => ({ ...s })),
    attachments: [...t.attachments],
  };
}

let subtaskCounter = 1000; // local ID counter for new subtasks before save

// ─── Component ────────────────────────────────────────────────────────────────

export function TaskModal({
  open,
  onOpenChange,
  mode,
  task,
  onSave,
  teamMembers = [],
}: TaskModalProps) {
  const { toast } = useToast();
  const [form, setForm] = useState<TaskInput>(emptyTask());
  const [newSubtask, setNewSubtask] = useState("");
  const [newTag, setNewTag] = useState("");
  const [newAssignee, setNewAssignee] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate form when editing
  useEffect(() => {
    if (open) {
      setForm(mode === "edit" && task ? taskToInput(task) : emptyTask());
      setErrors({});
      setNewSubtask("");
      setNewTag("");
      setNewAssignee("");
    }
  }, [open, mode, task]);

  // ── Field updaters ───────────────────────────────────────────────────────────

  const set = <K extends keyof TaskInput>(key: K, value: TaskInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: "" }));
  };

  // ── Subtasks ─────────────────────────────────────────────────────────────────

  const addSubtask = () => {
    const title = newSubtask.trim();
    if (!title) return;
    const subtask: Subtask = { id: subtaskCounter++, title, completed: false };
    set("subtasks", [...form.subtasks, subtask]);
    setNewSubtask("");
  };

  const toggleSubtask = (id: number) => {
    set(
      "subtasks",
      form.subtasks.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s))
    );
  };

  const deleteSubtask = (id: number) => {
    set("subtasks", form.subtasks.filter((s) => s.id !== id));
  };

  // ── Tags ─────────────────────────────────────────────────────────────────────

  const addTag = () => {
    const tag = newTag.trim().toLowerCase();
    if (!tag || form.tags.includes(tag)) return;
    set("tags", [...form.tags, tag]);
    setNewTag("");
  };

  // ── Assignees ────────────────────────────────────────────────────────────────

  const addAssignee = (name: string) => {
    if (!name || form.assignees.includes(name)) return;
    set("assignees", [...form.assignees, name]);
    setNewAssignee("");
  };

  const removeAssignee = (name: string) => {
    set("assignees", form.assignees.filter((a) => a !== name));
  };

  // ── Validation & Submit ──────────────────────────────────────────────────────

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = "Title is required";
    if (form.estimatedHours !== undefined && form.estimatedHours < 0)
      errs.estimatedHours = "Must be a positive number";
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
      toast({
        title: mode === "create" ? "Task created" : "Task updated",
        description: `"${form.title}" has been ${mode === "create" ? "created" : "updated"} successfully.`,
      });
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  const completedCount = form.subtasks.filter((s) => s.completed).length;
  const subtaskProgress =
    form.subtasks.length > 0
      ? Math.round((completedCount / form.subtasks.length) * 100)
      : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {mode === "create" ? "Create new task" : "Edit task"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">

          {/* ── Title ─────────────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label htmlFor="title">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              placeholder="What needs to be done?"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              className={errors.title ? "border-red-400" : ""}
              autoFocus
            />
            {errors.title && (
              <p className="text-xs text-red-500">{errors.title}</p>
            )}
          </div>

          {/* ── Description ───────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Add details, context, or acceptance criteria..."
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* ── Status + Priority ─────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => set("status", v as TaskStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}>
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
                onValueChange={(v) => set("priority", v as TaskPriority)}
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

          {/* ── Due Date + Estimated Hours ────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="dueDate">Due date</Label>
              <Input
                id="dueDate"
                type="date"
                value={form.dueDate ?? ""}
                onChange={(e) =>
                  set("dueDate", e.target.value || undefined)
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="hours">
                <span className="flex items-center gap-1">
                  <Clock size={13} /> Estimated hours
                </span>
              </Label>
              <Input
                id="hours"
                type="number"
                min="0"
                step="0.5"
                placeholder="e.g. 4"
                value={form.estimatedHours ?? ""}
                onChange={(e) =>
                  set(
                    "estimatedHours",
                    e.target.value ? parseFloat(e.target.value) : undefined
                  )
                }
                className={errors.estimatedHours ? "border-red-400" : ""}
              />
              {errors.estimatedHours && (
                <p className="text-xs text-red-500">{errors.estimatedHours}</p>
              )}
            </div>
          </div>

          {/* ── Assignees ─────────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label>Assignees</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {form.assignees.map((a) => (
                <Badge key={a} variant="secondary" className="gap-1 pr-1">
                  {a}
                  <button
                    onClick={() => removeAssignee(a)}
                    className="ml-1 hover:text-red-500 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </Badge>
              ))}
            </div>
            {teamMembers.length > 0 ? (
              <Select
                value=""
                onValueChange={(v) => addAssignee(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Add assignee..." />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers
                    .filter((m) => !form.assignees.includes(m))
                    .map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="Type name and press Enter..."
                  value={newAssignee}
                  onChange={(e) => setNewAssignee(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addAssignee(newAssignee.trim());
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addAssignee(newAssignee.trim())}
                >
                  Add
                </Button>
              </div>
            )}
          </div>

          {/* ── Tags ──────────────────────────────────────────────────────── */}
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
                    onClick={() =>
                      set("tags", form.tags.filter((t) => t !== tag))
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

          {/* ── Subtasks ──────────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Subtasks</Label>
              {form.subtasks.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {completedCount}/{form.subtasks.length} done ({subtaskProgress}%)
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
              {form.subtasks.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-2 group p-1 rounded hover:bg-slate-50"
                >
                  <Checkbox
                    checked={s.completed}
                    onCheckedChange={() => toggleSubtask(s.id)}
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
                    onClick={() => deleteSubtask(s.id)}
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
              <Button variant="outline" size="sm" onClick={addSubtask}>
                <Plus size={14} />
              </Button>
            </div>
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <DialogFooter className="gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving
              ? "Saving..."
              : mode === "create"
              ? "Create task"
              : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Floating Create Button ────────────────────────────────────────────────────
// Drop this anywhere in your layout to open the create modal

interface CreateTaskButtonProps {
  onCreated?: (task: TaskInput) => void;
  teamMembers?: string[];
  onSave: (task: TaskInput) => Promise<void>;
}

export function CreateTaskButton({ onSave, teamMembers }: CreateTaskButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-primary text-primary-foreground rounded-full px-4 py-3 shadow-lg hover:shadow-xl hover:scale-105 transition-all font-medium text-sm"
      >
        <Plus size={18} />
        New task
      </button>
      <TaskModal
        open={open}
        onOpenChange={setOpen}
        mode="create"
        onSave={onSave}
        teamMembers={teamMembers}
      />
    </>
  );
}
