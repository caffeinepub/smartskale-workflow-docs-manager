import {
  Calendar,
  FolderGit2,
  FolderKanban,
  KanbanSquare,
  MoreVertical,
  Plus,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Page } from "../App";
import type { Priority, Project, ProjectStatus } from "../backend";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import { Progress } from "../components/ui/progress";
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

const ALL_STATUSES = [
  "PLANNING",
  "ACTIVE",
  "ON_HOLD",
  "COMPLETED",
  "CANCELLED",
] as const;

type FormState = {
  name: string;
  description: string;
  status: string;
  priority: string;
  dueDate: string;
};
const DEFAULT_FORM: FormState = {
  name: "",
  description: "",
  status: "PLANNING",
  priority: "MEDIUM",
  dueDate: "",
};

interface Props {
  navigate: (p: Page) => void;
}

export function Projects({ navigate }: Props) {
  const { actor } = useActor();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<{ projectId: string; done: boolean }[]>(
    [],
  );
  const [subProjectCounts, setSubProjectCounts] = useState<
    Record<string, number>
  >({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [deleteProject, setDeleteProject] = useState<Project | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [statusPopover, setStatusPopover] = useState<string | null>(null);

  const load = () => {
    if (!actor) return;
    Promise.all([actor.getProjects(), actor.getTasks(), actor.getSubProjects()])
      .then(([p, t, sp]) => {
        setProjects(p);
        setTasks(
          t.map((task) => ({
            projectId: task.projectId,
            done: getKey(task.status) === "DONE",
          })),
        );
        // Build sub-project count map
        const counts: Record<string, number> = {};
        for (const s of sp) {
          counts[s.parentProjectId] = (counts[s.parentProjectId] || 0) + 1;
        }
        setSubProjectCounts(counts);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: load depends on actor
  useEffect(() => {
    load();
  }, [actor]);

  const openCreate = () => {
    setEditProject(null);
    setForm(DEFAULT_FORM);
    setDialogOpen(true);
  };
  const openEdit = (p: Project) => {
    setEditProject(p);
    setForm({
      name: p.name,
      description: p.description,
      status: getKey(p.status),
      priority: getKey(p.priority),
      dueDate:
        p.dueDate.length > 0
          ? new Date(Number(p.dueDate[0]) / 1_000_000)
              .toISOString()
              .slice(0, 10)
          : "",
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!actor || !form.name.trim()) return;
    setSaving(true);
    try {
      const status = { [form.status]: null } as ProjectStatus;
      const priority = { [form.priority]: null } as Priority;
      const dueDate: [] | [bigint] = form.dueDate
        ? [BigInt(new Date(form.dueDate).getTime()) * 1_000_000n]
        : [];
      if (editProject) {
        await actor.updateProject(
          editProject.id,
          form.name,
          form.description,
          status,
          priority,
          dueDate,
          editProject.memberIds,
        );
        toast.success("Project updated");
      } else {
        await actor.createProject(
          form.name,
          form.description,
          status,
          priority,
          dueDate,
        );
        toast.success("Project created");
      }
      setDialogOpen(false);
      load();
    } catch {
      toast.error("Failed to save project");
    } finally {
      setSaving(false);
    }
  };

  const quickChangeStatus = async (project: Project, newStatus: string) => {
    if (!actor) return;
    try {
      await actor.updateProject(
        project.id,
        project.name,
        project.description,
        { [newStatus]: null } as ProjectStatus,
        project.priority,
        project.dueDate,
        project.memberIds,
      );
      toast.success(`Status changed to ${newStatus.replace(/_/g, " ")}`);
      setStatusPopover(null);
      load();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const doDelete = async () => {
    if (!actor || !deleteProject) return;
    try {
      await actor.deleteProject(deleteProject.id);
      toast.success("Project deleted");
      setDeleteProject(null);
      load();
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {projects.length} project{projects.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button data-ocid="projects.new_project.button" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> New Project
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {["a", "b", "c"].map((k) => (
            <Skeleton key={k} className="h-44" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20" data-ocid="projects.empty_state">
          <FolderKanban className="h-14 w-14 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-600 mb-1">
            No projects yet
          </h3>
          <p className="text-slate-400 mb-4">
            Create your first project to get started
          </p>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Create Project
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p, idx) => {
            const pTasks = tasks.filter((t) => t.projectId === p.id);
            const pct =
              pTasks.length > 0
                ? Math.round(
                    (pTasks.filter((t) => t.done).length / pTasks.length) * 100,
                  )
                : 0;
            const statusKey = getKey(p.status);
            const priorityKey = getKey(p.priority);
            const spCount = subProjectCounts[p.id] || 0;
            return (
              <Card
                key={p.id}
                className="border-0 shadow-sm hover:shadow-md transition-shadow"
                data-ocid={`projects.item.${idx + 1}`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <button
                      type="button"
                      className="flex-1 min-w-0 cursor-pointer text-left bg-transparent border-0 p-0"
                      onClick={() =>
                        navigate({ name: "project-detail", id: p.id })
                      }
                    >
                      <h3 className="font-semibold text-slate-900 truncate">
                        {p.name}
                      </h3>
                      {p.description && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                          {p.description}
                        </p>
                      )}
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(p)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => navigate({ name: "kanban", id: p.id })}
                        >
                          <KanbanSquare className="h-4 w-4 mr-2" /> Open Kanban
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => setDeleteProject(p)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {/* Clickable status badge with Popover */}
                    <Popover
                      open={statusPopover === p.id}
                      onOpenChange={(open) =>
                        setStatusPopover(open ? p.id : null)
                      }
                    >
                      <PopoverTrigger asChild>
                        <button type="button">
                          <Badge
                            className={`text-xs py-0 cursor-pointer hover:opacity-80 transition-opacity ${STATUS_COLORS[statusKey] || ""}`}
                          >
                            {statusKey.replace(/_/g, " ")}
                          </Badge>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-44 p-1" align="start">
                        <p className="text-xs text-slate-500 px-2 py-1 font-semibold">
                          Change Status
                        </p>
                        {ALL_STATUSES.map((s) => (
                          <button
                            key={s}
                            type="button"
                            className={`w-full text-left px-2 py-1.5 text-xs rounded hover:bg-slate-100 transition-colors ${
                              s === statusKey ? "font-semibold" : ""
                            }`}
                            onClick={() => quickChangeStatus(p, s)}
                          >
                            {s.replace(/_/g, " ")}
                          </button>
                        ))}
                      </PopoverContent>
                    </Popover>
                    <Badge
                      className={`text-xs py-0 ${PRIORITY_COLORS[priorityKey] || ""}`}
                    >
                      {priorityKey}
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>
                        {pTasks.filter((t) => t.done).length}/{pTasks.length}{" "}
                        tasks
                      </span>
                      <span>{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </div>

                  {/* Sub-project count */}
                  {spCount > 0 && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-teal-600">
                      <FolderGit2 className="h-3 w-3" />
                      <span>
                        {spCount} sub-project{spCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-3">
                    {p.dueDate.length > 0 ? (
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <Calendar className="h-3 w-3" />
                        {new Date(
                          Number(p.dueDate[0]) / 1_000_000,
                        ).toLocaleDateString()}
                      </div>
                    ) : (
                      <span />
                    )}
                    <span className="text-xs text-slate-400">
                      {p.memberIds.length} member
                      {p.memberIds.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-ocid="projects.project.dialog">
          <DialogHeader>
            <DialogTitle>
              {editProject ? "Edit Project" : "New Project"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name *</Label>
              <Input
                data-ocid="projects.project_name.input"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
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
                    {[
                      "PLANNING",
                      "ACTIVE",
                      "ON_HOLD",
                      "COMPLETED",
                      "CANCELLED",
                    ].map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replace(/_/g, " ")}
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
                    {["LOW", "MEDIUM", "HIGH", "URGENT"].map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Due Date</Label>
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, dueDate: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              data-ocid="projects.cancel_project.button"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              data-ocid="projects.save_project.button"
              onClick={save}
              disabled={saving || !form.name.trim()}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog
        open={!!deleteProject}
        onOpenChange={(o) => !o && setDeleteProject(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteProject?.name}"? This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="projects.delete_project_cancel.button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              data-ocid="projects.delete_project_confirm.button"
              onClick={doDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
