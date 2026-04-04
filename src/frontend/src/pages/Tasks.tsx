import {
  ArrowLeftRight,
  CheckSquare,
  Edit2,
  Forward,
  Plus,
  Trash2,
  UserCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Page } from "../App";
import type { Priority, Project, Task, TaskStatus } from "../backend";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Progress } from "../components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Skeleton } from "../components/ui/skeleton";
import { Slider } from "../components/ui/slider";
import { Textarea } from "../components/ui/textarea";
import { useActor } from "../hooks/useActor";
import { CREDENTIALS } from "../hooks/useAuth";

interface Props {
  navigate: (p: Page) => void;
}

const STATUS_ORDER = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"] as const;

const statusColors: Record<string, string> = {
  TODO: "bg-slate-100 text-slate-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  IN_REVIEW: "bg-amber-100 text-amber-700",
  DONE: "bg-green-100 text-green-700",
};
const priorityColors: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-600",
  MEDIUM: "bg-blue-100 text-blue-600",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};

function getKey(obj: unknown): string {
  return Object.keys(obj as object)[0];
}

const COMPLETION_KEY = "smartskale_task_completion";

function getCompletions(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(COMPLETION_KEY) || "{}") as Record<
      string,
      number
    >;
  } catch {
    return {};
  }
}

function setCompletion(taskId: string, pct: number) {
  const all = getCompletions();
  all[taskId] = pct;
  localStorage.setItem(COMPLETION_KEY, JSON.stringify(all));
}

// Team members derived from hardcoded credentials
const TEAM_MEMBERS = CREDENTIALS.map((c) => ({
  email: c.profile.email,
  name: c.profile.name,
  jobTitle: c.profile.jobTitle,
}));

const UNASSIGNED = "__unassigned__";

export function Tasks({ navigate: _navigate }: Props) {
  const { actor } = useActor();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    projectId: "",
    status: "TODO",
    priority: "MEDIUM",
    completion: 0,
    assigneeEmail: UNASSIGNED,
  });
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterPriority, setFilterPriority] = useState("ALL");
  const [search, setSearch] = useState("");
  const [completions, setCompletions] = useState<Record<string, number>>({});

  // Transfer state
  const [transferTask, setTransferTask] = useState<Task | null>(null);
  const [transferProjectId, setTransferProjectId] = useState("");
  const [transferring, setTransferring] = useState(false);

  // Assign / Forward state
  const [assignTask, setAssignTask] = useState<Task | null>(null);
  const [assignEmail, setAssignEmail] = useState(UNASSIGNED);
  const [assignMode, setAssignMode] = useState<"assign" | "forward">("assign");
  const [forwardNote, setForwardNote] = useState("");
  const [assigning, setAssigning] = useState(false);

  const load = () => {
    if (!actor) return;
    Promise.all([actor.getTasks(), actor.getProjects()])
      .then(([t, p]) => {
        setTasks(t);
        setProjects(p);
        setCompletions(getCompletions());
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: load depends on actor
  useEffect(() => {
    load();
  }, [actor]);

  // Derive assignee email from assigneeId stored as a string (we store email in tags[0] as a workaround)
  // We store the assignee email in the task's tags array as a special marker: "assignee:<email>"
  function getAssigneeEmail(t: Task): string {
    const tag = t.tags.find((tag) => tag.startsWith("assignee:"));
    return tag ? tag.replace("assignee:", "") : UNASSIGNED;
  }

  function getAssigneeName(t: Task): string {
    const email = getAssigneeEmail(t);
    if (email === UNASSIGNED) return "Unassigned";
    const member = TEAM_MEMBERS.find(
      (m) => m.email.toLowerCase() === email.toLowerCase(),
    );
    return member?.name ?? email;
  }

  function buildTags(existingTags: string[], assigneeEmail: string): string[] {
    // Remove old assignee tag, add new one
    const filtered = existingTags.filter((t) => !t.startsWith("assignee:"));
    if (assigneeEmail && assigneeEmail !== UNASSIGNED) {
      filtered.push(`assignee:${assigneeEmail}`);
    }
    return filtered;
  }

  const openCreate = () => {
    setEditTask(null);
    setForm({
      title: "",
      description: "",
      projectId: projects[0]?.id ?? "",
      status: "TODO",
      priority: "MEDIUM",
      completion: 0,
      assigneeEmail: UNASSIGNED,
    });
    setOpen(true);
  };

  const openEdit = (t: Task) => {
    setEditTask(t);
    setForm({
      title: t.title,
      description: t.description,
      projectId: t.projectId,
      status: getKey(t.status),
      priority: getKey(t.priority),
      completion: completions[t.id] ?? 0,
      assigneeEmail: getAssigneeEmail(t),
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!actor || !form.title.trim()) return;
    if (!editTask && !form.projectId) {
      toast.error("Please select a project first");
      return;
    }
    setSaving(true);
    try {
      if (editTask) {
        const newTags = buildTags(editTask.tags, form.assigneeEmail);
        await actor.updateTask(
          editTask.id,
          form.title,
          form.description,
          { [form.status]: null } as TaskStatus,
          { [form.priority]: null } as Priority,
          [],
          [],
          newTags,
        );
        setCompletion(editTask.id, form.completion);
        toast.success("Task updated");
      } else {
        const newTags = buildTags([], form.assigneeEmail);
        const created = await actor.createTask(
          form.projectId,
          form.title,
          form.description,
          { [form.status]: null } as TaskStatus,
          { [form.priority]: null } as Priority,
          [],
          [],
          newTags,
        );
        setCompletion(created.id, form.completion);
        toast.success("Task created");
      }
      setOpen(false);
      load();
    } catch {
      toast.error("Failed to save task");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!actor) return;
    try {
      await actor.deleteTask(id);
      toast.success("Task deleted");
      load();
    } catch {
      toast.error("Failed to delete task");
    }
  };

  // Inline status cycle
  const cycleStatus = async (t: Task) => {
    if (!actor) return;
    const cur = getKey(t.status);
    const idx = STATUS_ORDER.indexOf(cur as (typeof STATUS_ORDER)[number]);
    const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
    try {
      await actor.updateTask(
        t.id,
        t.title,
        t.description,
        { [next]: null } as TaskStatus,
        t.priority,
        t.assigneeId,
        t.dueDate,
        t.tags,
      );
      toast.success(`Status \u2192 ${next.replace("_", " ")}`);
      load();
    } catch {
      toast.error("Failed to update status");
    }
  };

  // Transfer task to another project
  const openTransfer = (t: Task) => {
    setTransferTask(t);
    const other = projects.find((p) => p.id !== t.projectId);
    setTransferProjectId(other?.id ?? projects[0]?.id ?? "");
  };

  const doTransfer = async () => {
    if (!actor || !transferTask || !transferProjectId) return;
    if (transferProjectId === transferTask.projectId) {
      toast.error("Task is already in that project");
      return;
    }
    setTransferring(true);
    try {
      await actor.createTask(
        transferProjectId,
        transferTask.title,
        transferTask.description,
        transferTask.status,
        transferTask.priority,
        transferTask.assigneeId,
        transferTask.dueDate,
        transferTask.tags,
      );
      await actor.deleteTask(transferTask.id);
      toast.success("Task transferred");
      setTransferTask(null);
      load();
    } catch {
      toast.error("Transfer failed");
    } finally {
      setTransferring(false);
    }
  };

  // Open assign dialog
  const openAssign = (t: Task, mode: "assign" | "forward") => {
    setAssignTask(t);
    setAssignMode(mode);
    setAssignEmail(getAssigneeEmail(t));
    setForwardNote("");
  };

  // Do assign / forward
  const doAssign = async () => {
    if (!actor || !assignTask) return;
    setAssigning(true);
    try {
      const newTags = buildTags(assignTask.tags, assignEmail);
      // If forward mode and there is a note, add it as a comment
      if (assignMode === "forward" && forwardNote.trim()) {
        newTags.push(`forward-note:${forwardNote.trim()}`);
      }
      await actor.updateTask(
        assignTask.id,
        assignTask.title,
        assignTask.description,
        assignTask.status,
        assignTask.priority,
        [],
        assignTask.dueDate,
        newTags,
      );
      const memberName =
        TEAM_MEMBERS.find(
          (m) => m.email.toLowerCase() === assignEmail.toLowerCase(),
        )?.name ?? assignEmail;
      toast.success(
        assignMode === "forward"
          ? `Task forwarded to ${memberName}`
          : assignEmail === UNASSIGNED
            ? "Assignee removed"
            : `Task assigned to ${memberName}`,
      );
      setAssignTask(null);
      load();
    } catch {
      toast.error("Failed to assign task");
    } finally {
      setAssigning(false);
    }
  };

  const filtered = tasks.filter((t) => {
    if (filterStatus !== "ALL" && getKey(t.status) !== filterStatus)
      return false;
    if (filterPriority !== "ALL" && getKey(t.priority) !== filterPriority)
      return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  const getProjectName = (pid: string) =>
    projects.find((p) => p.id === pid)?.name || "Unknown";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tasks</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {tasks.length} total tasks
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> New Task
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-48"
        />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            {["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"].map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Priority</SelectItem>
            {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-2">
          {["a", "b", "c", "d", "e"].map((k) => (
            <Skeleton key={k} className="h-14" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <CheckSquare className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No tasks found</p>
          <Button className="mt-4" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Create Task
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
          <table className="w-full min-w-[900px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">
                  Task
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">
                  Project
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">
                  Assigned To
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">
                  Priority
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">
                  Completion
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">
                  Created
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((t) => {
                const pct = completions[t.id] ?? 0;
                const assigneeName = getAssigneeName(t);
                const isAssigned = assigneeName !== "Unassigned";
                return (
                  <tr
                    key={t.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800 text-sm">
                        {t.title}
                      </div>
                      {t.description && (
                        <div className="text-xs text-slate-400 truncate max-w-xs">
                          {t.description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {getProjectName(t.projectId)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium ${
                          isAssigned
                            ? "text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5"
                            : "text-slate-400"
                        }`}
                      >
                        {assigneeName}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        title="Click to change status"
                        onClick={() => cycleStatus(t)}
                      >
                        <Badge
                          className={`text-xs cursor-pointer hover:opacity-80 transition-opacity ${
                            statusColors[getKey(t.status)] || ""
                          }`}
                        >
                          {getKey(t.status).replace("_", " ")}
                        </Badge>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className={`text-xs ${
                          priorityColors[getKey(t.priority)] || ""
                        }`}
                      >
                        {getKey(t.priority)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 w-28">
                      <div className="flex items-center gap-1.5">
                        <Progress value={pct} className="h-1.5 flex-1" />
                        <span className="text-xs text-slate-500 w-8 text-right">
                          {pct}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {new Date(
                        Number(t.createdAt) / 1_000_000,
                      ).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Edit task"
                          onClick={() => openEdit(t)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-emerald-500 hover:text-emerald-700"
                          title="Assign to team member"
                          onClick={() => openAssign(t, "assign")}
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-violet-500 hover:text-violet-700"
                          title="Forward task to team member"
                          onClick={() => openAssign(t, "forward")}
                        >
                          <Forward className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-blue-400 hover:text-blue-600"
                          title="Transfer to another project"
                          onClick={() => openTransfer(t)}
                        >
                          <ArrowLeftRight className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-400 hover:text-red-600"
                          title="Delete task"
                          onClick={() => handleDelete(t.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Task Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTask ? "Edit Task" : "New Task"}</DialogTitle>
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
            {!editTask && (
              <div>
                <Label>Project</Label>
                <Select
                  value={form.projectId}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, projectId: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"].map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            <div>
              <Label>Assign To</Label>
              <Select
                value={form.assigneeEmail}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, assigneeEmail: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                  {TEAM_MEMBERS.map((m) => (
                    <SelectItem key={m.email} value={m.email}>
                      {m.name} — {m.jobTitle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Work Completion: {form.completion}%</Label>
              <Slider
                value={[form.completion]}
                onValueChange={([v]) =>
                  setForm((f) => ({ ...f, completion: v ?? 0 }))
                }
                min={0}
                max={100}
                step={5}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editTask ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Task Dialog */}
      <Dialog
        open={!!transferTask}
        onOpenChange={(o) => !o && setTransferTask(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Task to Another Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Task: <strong>{transferTask?.title}</strong>
            </p>
            <p className="text-xs text-slate-500">
              Currently in: {getProjectName(transferTask?.projectId ?? "")}
            </p>
            <div>
              <Label>Move to Project</Label>
              <Select
                value={transferProjectId}
                onValueChange={setTransferProjectId}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select target project" />
                </SelectTrigger>
                <SelectContent>
                  {projects
                    .filter((p) => p.id !== transferTask?.projectId)
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferTask(null)}>
              Cancel
            </Button>
            <Button
              onClick={doTransfer}
              disabled={transferring || !transferProjectId}
            >
              {transferring ? "Transferring..." : "Transfer Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign / Forward Task Dialog */}
      <Dialog
        open={!!assignTask}
        onOpenChange={(o) => !o && setAssignTask(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {assignMode === "forward"
                ? "Forward Task to Team Member"
                : "Assign Task to Team Member"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Task: <strong>{assignTask?.title}</strong>
            </p>
            {assignMode === "forward" && (
              <p className="text-xs text-slate-500">
                Currently assigned to:{" "}
                <strong>{getAssigneeName(assignTask!)}</strong>
              </p>
            )}
            <div>
              <Label>
                {assignMode === "forward"
                  ? "Forward to"
                  : "Assign to Team Member"}
              </Label>
              <Select value={assignEmail} onValueChange={setAssignEmail}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                  {TEAM_MEMBERS.map((m) => (
                    <SelectItem key={m.email} value={m.email}>
                      {m.name} — {m.jobTitle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {assignMode === "forward" && (
              <div>
                <Label>Note / Instruction (optional)</Label>
                <Textarea
                  value={forwardNote}
                  onChange={(e) => setForwardNote(e.target.value)}
                  placeholder="Add a note for the new assignee..."
                  rows={2}
                  className="mt-1"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignTask(null)}>
              Cancel
            </Button>
            <Button
              onClick={doAssign}
              disabled={assigning}
              className={
                assignMode === "forward"
                  ? "bg-violet-600 hover:bg-violet-700 text-white"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }
            >
              {assigning
                ? "Saving..."
                : assignMode === "forward"
                  ? "Forward Task"
                  : "Assign Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
