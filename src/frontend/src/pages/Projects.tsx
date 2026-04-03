import {
  Calendar,
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
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [deleteProject, setDeleteProject] = useState<Project | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  const load = () => {
    if (!actor) return;
    Promise.all([actor.getProjects(), actor.getTasks()])
      .then(([p, t]) => {
        setProjects(p);
        setTasks(
          t.map((task) => ({
            projectId: task.projectId,
            done: getKey(task.status) === "DONE",
          })),
        );
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
        <Button onClick={openCreate}>
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
        <div className="text-center py-20">
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
          {projects.map((p) => {
            const pTasks = tasks.filter((t) => t.projectId === p.id);
            const pct =
              pTasks.length > 0
                ? Math.round(
                    (pTasks.filter((t) => t.done).length / pTasks.length) * 100,
                  )
                : 0;
            const statusKey = getKey(p.status);
            const priorityKey = getKey(p.priority);
            return (
              <Card
                key={p.id}
                className="border-0 shadow-sm hover:shadow-md transition-shadow"
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
                    <Badge
                      className={`text-xs py-0 ${STATUS_COLORS[statusKey] || ""}`}
                    >
                      {statusKey.replace("_", " ")}
                    </Badge>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editProject ? "Edit Project" : "New Project"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name *</Label>
              <Input
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
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving || !form.name.trim()}>
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
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
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
