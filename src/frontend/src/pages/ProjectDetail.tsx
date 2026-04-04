import {
  ArrowLeft,
  Calendar,
  CheckSquare,
  FileText,
  FolderGit2,
  Kanban,
  Loader2,
  MoreVertical,
  Plus,
  Tag,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Page } from "../App";
import type {
  Document as Doc,
  Priority,
  Project,
  ProjectStatus,
  SubProject,
  Task,
  TaskStatus,
} from "../backend";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Skeleton } from "../components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { Textarea } from "../components/ui/textarea";
import { useActor } from "../hooks/useActor";

interface Props {
  id: string;
  navigate: (p: Page) => void;
}

function getKey(obj: Record<string, null> | unknown): string {
  return Object.keys(obj as object)[0];
}

const TASK_STATUS_COLORS: Record<string, string> = {
  TODO: "bg-slate-100 text-slate-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  IN_REVIEW: "bg-amber-100 text-amber-700",
  DONE: "bg-green-100 text-green-700",
};

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

const SUB_PROJECT_CATEGORIES = [
  "Website Creation",
  "Online Classes",
  "Workshops",
  "Software Creation",
  "Mobile Apps",
  "Marketing",
  "Training",
  "Client Projects",
  "Internal Tools",
  "Research & Development",
] as const;

type SubProjectFormState = {
  name: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  dueDate: string;
};

const DEFAULT_SP_FORM: SubProjectFormState = {
  name: "",
  description: "",
  category: "Website Creation",
  status: "PLANNING",
  priority: "MEDIUM",
  dueDate: "",
};

export function ProjectDetail({ id, navigate }: Props) {
  const { actor } = useActor();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [subProjects, setSubProjects] = useState<SubProject[]>([]);
  const [loading, setLoading] = useState(true);

  // Task dialog state
  const [taskDialog, setTaskDialog] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
  });

  // Document dialog state
  const [docDialog, setDocDialog] = useState(false);
  const [docForm, setDocForm] = useState({ title: "", content: "" });

  // Sub-project dialog state
  const [spDialog, setSpDialog] = useState(false);
  const [editSp, setEditSp] = useState<SubProject | null>(null);
  const [deleteSp, setDeleteSp] = useState<SubProject | null>(null);
  const [spForm, setSpForm] = useState<SubProjectFormState>(DEFAULT_SP_FORM);
  const [spStatusPopover, setSpStatusPopover] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  const load = () => {
    if (!actor) return;
    Promise.all([
      actor.getProject(id),
      actor.getTasksByProject(id),
      actor.getDocumentsByProject(id),
      actor.getSubProjectsByParent(id),
    ])
      .then(([p, t, d, sp]) => {
        if (p.length > 0) setProject(p[0]!);
        setTasks(t);
        setDocs(d);
        setSubProjects(sp);
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

  const createDoc = async () => {
    if (!actor || !docForm.title.trim()) return;
    setSaving(true);
    try {
      await actor.createDocument(id, docForm.title, docForm.content, []);
      toast.success("Document created");
      setDocDialog(false);
      setDocForm({ title: "", content: "" });
      load();
    } catch {
      toast.error("Failed to create document");
    } finally {
      setSaving(false);
    }
  };

  const openCreateSp = () => {
    setEditSp(null);
    setSpForm(DEFAULT_SP_FORM);
    setSpDialog(true);
  };

  const openEditSp = (sp: SubProject) => {
    setEditSp(sp);
    setSpForm({
      name: sp.name,
      description: sp.description,
      category: sp.category,
      status: getKey(sp.status),
      priority: getKey(sp.priority),
      dueDate:
        sp.dueDate.length > 0
          ? new Date(Number(sp.dueDate[0]) / 1_000_000)
              .toISOString()
              .slice(0, 10)
          : "",
    });
    setSpDialog(true);
  };

  const saveSp = async () => {
    if (!actor || !spForm.name.trim()) return;
    setSaving(true);
    try {
      const status = { [spForm.status]: null } as ProjectStatus;
      const priority = { [spForm.priority]: null } as Priority;
      const dueDate: [] | [bigint] = spForm.dueDate
        ? [BigInt(new Date(spForm.dueDate).getTime()) * 1_000_000n]
        : [];
      if (editSp) {
        await actor.updateSubProject(
          editSp.id,
          spForm.name,
          spForm.description,
          spForm.category,
          status,
          priority,
          dueDate,
          editSp.memberIds,
        );
        toast.success("Sub-project updated");
      } else {
        await actor.createSubProject(
          id,
          spForm.name,
          spForm.description,
          spForm.category,
          status,
          priority,
          dueDate,
        );
        toast.success("Sub-project created");
      }
      setSpDialog(false);
      load();
    } catch {
      toast.error("Failed to save sub-project");
    } finally {
      setSaving(false);
    }
  };

  const quickChangeSpStatus = async (sp: SubProject, newStatus: string) => {
    if (!actor) return;
    try {
      await actor.updateSubProject(
        sp.id,
        sp.name,
        sp.description,
        sp.category,
        { [newStatus]: null } as ProjectStatus,
        sp.priority,
        sp.dueDate,
        sp.memberIds,
      );
      toast.success(`Status changed to ${newStatus.replace(/_/g, " ")}`);
      setSpStatusPopover(null);
      load();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const doDeleteSp = async () => {
    if (!actor || !deleteSp) return;
    try {
      await actor.deleteSubProject(deleteSp.id);
      toast.success("Sub-project deleted");
      setDeleteSp(null);
      load();
    } catch {
      toast.error("Failed to delete sub-project");
    }
  };

  if (loading)
    return (
      <div className="space-y-4">
        {["a", "b", "c"].map((k) => (
          <Skeleton key={k} className="h-20" />
        ))}
      </div>
    );

  if (!project)
    return (
      <div className="text-center py-20 text-slate-400">
        Project not found.{" "}
        <Button variant="link" onClick={() => navigate({ name: "projects" })}>
          Go back
        </Button>
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          data-ocid="project_detail.back.button"
          onClick={() => navigate({ name: "projects" })}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
          <p className="text-slate-500 text-sm">{project.description}</p>
        </div>
        <Button
          data-ocid="project_detail.kanban.button"
          onClick={() => navigate({ name: "kanban", id })}
        >
          <Kanban className="h-4 w-4 mr-1" /> Kanban Board
        </Button>
      </div>

      <Tabs defaultValue="subprojects">
        <TabsList>
          <TabsTrigger
            value="subprojects"
            data-ocid="project_detail.subprojects.tab"
          >
            <FolderGit2 className="h-4 w-4 mr-1" /> Sub Projects (
            {subProjects.length})
          </TabsTrigger>
          <TabsTrigger value="tasks" data-ocid="project_detail.tasks.tab">
            <CheckSquare className="h-4 w-4 mr-1" /> Tasks ({tasks.length})
          </TabsTrigger>
          <TabsTrigger
            value="documents"
            data-ocid="project_detail.documents.tab"
          >
            <FileText className="h-4 w-4 mr-1" /> Documents ({docs.length})
          </TabsTrigger>
        </TabsList>

        {/* ── SUB PROJECTS TAB ── */}
        <TabsContent value="subprojects" className="mt-4">
          <div className="flex justify-end mb-3">
            <Button
              size="sm"
              data-ocid="project_detail.add_subproject.button"
              onClick={openCreateSp}
            >
              <Plus className="h-4 w-4 mr-1" /> Add Sub Project
            </Button>
          </div>

          {subProjects.length === 0 ? (
            <div
              className="text-center py-16 border-2 border-dashed border-slate-200 rounded-xl"
              data-ocid="project_detail.subprojects.empty_state"
            >
              <FolderGit2 className="h-12 w-12 text-slate-200 mx-auto mb-4" />
              <h3 className="text-base font-semibold text-slate-500 mb-1">
                No sub-projects yet
              </h3>
              <p className="text-slate-400 text-sm mb-4">
                Break this project into focused sub-projects by category
              </p>
              <Button size="sm" onClick={openCreateSp}>
                <Plus className="h-4 w-4 mr-1" /> Add Sub Project
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subProjects.map((sp, i) => {
                const spStatusKey = getKey(sp.status);
                const spPriorityKey = getKey(sp.priority);
                return (
                  <Card
                    key={sp.id}
                    className="border-0 shadow-sm hover:shadow-md transition-shadow"
                    data-ocid={`project_detail.subprojects.item.${i + 1}`}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <button
                          type="button"
                          className="flex-1 min-w-0 cursor-pointer text-left bg-transparent border-0 p-0"
                          onClick={() =>
                            navigate({
                              name: "sub-project-detail",
                              id: sp.id,
                              parentId: id,
                            })
                          }
                        >
                          <h3 className="font-semibold text-slate-900 truncate">
                            {sp.name}
                          </h3>
                          {sp.description && (
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                              {sp.description}
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
                            <DropdownMenuItem onClick={() => openEditSp(sp)}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                navigate({
                                  name: "sub-project-detail",
                                  id: sp.id,
                                  parentId: id,
                                })
                              }
                            >
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => setDeleteSp(sp)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {/* Category badge */}
                        <Badge className="text-xs bg-teal-100 text-teal-700 py-0">
                          <Tag className="h-3 w-3 mr-1" />
                          {sp.category}
                        </Badge>

                        {/* Clickable status popover */}
                        <Popover
                          open={spStatusPopover === sp.id}
                          onOpenChange={(open) =>
                            setSpStatusPopover(open ? sp.id : null)
                          }
                        >
                          <PopoverTrigger asChild>
                            <button type="button">
                              <Badge
                                className={`text-xs py-0 cursor-pointer hover:opacity-80 transition-opacity ${
                                  STATUS_COLORS[spStatusKey] || ""
                                }`}
                              >
                                {spStatusKey.replace(/_/g, " ")}
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
                                  s === spStatusKey ? "font-semibold" : ""
                                }`}
                                onClick={() => quickChangeSpStatus(sp, s)}
                              >
                                {s.replace(/_/g, " ")}
                              </button>
                            ))}
                          </PopoverContent>
                        </Popover>

                        <Badge
                          className={`text-xs py-0 ${
                            PRIORITY_COLORS[spPriorityKey] || ""
                          }`}
                        >
                          {spPriorityKey}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-400">
                        {sp.dueDate.length > 0 ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(
                              Number(sp.dueDate[0]) / 1_000_000,
                            ).toLocaleDateString()}
                          </div>
                        ) : (
                          <span />
                        )}
                        <span>
                          {sp.memberIds.length} member
                          {sp.memberIds.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── TASKS TAB ── */}
        <TabsContent value="tasks" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button
              size="sm"
              data-ocid="project_detail.add_task.button"
              onClick={() => setTaskDialog(true)}
            >
              <Plus className="h-4 w-4 mr-1" /> Add Task
            </Button>
          </div>
          {tasks.length === 0 ? (
            <div
              className="text-center py-12 text-slate-400"
              data-ocid="project_detail.tasks.empty_state"
            >
              <CheckSquare className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              No tasks yet
            </div>
          ) : (
            tasks.map((t, i) => (
              <Card
                key={t.id}
                className="border-0 shadow-sm"
                data-ocid={`project_detail.tasks.item.${i + 1}`}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex-1">
                    <div className="font-medium text-slate-800">{t.title}</div>
                    {t.description && (
                      <div className="text-sm text-slate-500 mt-0.5">
                        {t.description}
                      </div>
                    )}
                  </div>
                  <Badge
                    className={`text-xs ${
                      TASK_STATUS_COLORS[getKey(t.status)] || ""
                    }`}
                  >
                    {getKey(t.status).replace(/_/g, " ")}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {getKey(t.priority)}
                  </Badge>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* ── DOCUMENTS TAB ── */}
        <TabsContent value="documents" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button
              size="sm"
              data-ocid="project_detail.add_document.button"
              onClick={() => setDocDialog(true)}
            >
              <Plus className="h-4 w-4 mr-1" /> Add Document
            </Button>
          </div>
          {docs.length === 0 ? (
            <div
              className="text-center py-12 text-slate-400"
              data-ocid="project_detail.documents.empty_state"
            >
              <FileText className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              No documents yet
            </div>
          ) : (
            docs.map((d, i) => (
              <Card
                key={d.id}
                className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                data-ocid={`project_detail.documents.item.${i + 1}`}
                onClick={() => navigate({ name: "document-editor", id: d.id })}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <FileText className="h-5 w-5 text-blue-500 shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-slate-800">{d.title}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      v{Number(d.version)} ·{" "}
                      {new Date(
                        Number(d.updatedAt) / 1_000_000,
                      ).toLocaleDateString()}
                    </div>
                  </div>
                  <Trash2
                    className="h-4 w-4 text-slate-300 hover:text-red-500 transition-colors"
                    onClick={async (e) => {
                      e.stopPropagation();
                      await actor?.deleteDocument(d.id);
                      toast.success("Deleted");
                      load();
                    }}
                  />
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* ── ADD TASK DIALOG ── */}
      <Dialog open={taskDialog} onOpenChange={setTaskDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Title *</Label>
              <Input
                data-ocid="project_detail.task_title.input"
                value={taskForm.title}
                onChange={(e) =>
                  setTaskForm((f) => ({ ...f, title: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={taskForm.description}
                onChange={(e) =>
                  setTaskForm((f) => ({ ...f, description: e.target.value }))
                }
                rows={2}
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
            <Button variant="outline" onClick={() => setTaskDialog(false)}>
              Cancel
            </Button>
            <Button onClick={createTask} disabled={saving}>
              {saving ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── ADD DOCUMENT DIALOG ── */}
      <Dialog open={docDialog} onOpenChange={setDocDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Title *</Label>
              <Input
                value={docForm.title}
                onChange={(e) =>
                  setDocForm((f) => ({ ...f, title: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Content</Label>
              <Textarea
                value={docForm.content}
                onChange={(e) =>
                  setDocForm((f) => ({ ...f, content: e.target.value }))
                }
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDocDialog(false)}>
              Cancel
            </Button>
            <Button onClick={createDoc} disabled={saving}>
              {saving ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── ADD/EDIT SUB-PROJECT DIALOG ── */}
      <Dialog open={spDialog} onOpenChange={setSpDialog}>
        <DialogContent
          className="max-w-lg"
          data-ocid="project_detail.subproject.dialog"
        >
          <DialogHeader>
            <DialogTitle>
              {editSp ? "Edit Sub-Project" : "New Sub-Project"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name *</Label>
              <Input
                data-ocid="project_detail.subproject_name.input"
                value={spForm.name}
                onChange={(e) =>
                  setSpForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Sub-project name"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                data-ocid="project_detail.subproject_description.textarea"
                value={spForm.description}
                onChange={(e) =>
                  setSpForm((f) => ({ ...f, description: e.target.value }))
                }
                rows={2}
                placeholder="What is this sub-project about?"
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select
                value={spForm.category}
                onValueChange={(v) => setSpForm((f) => ({ ...f, category: v }))}
              >
                <SelectTrigger data-ocid="project_detail.subproject_category.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUB_PROJECT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Status</Label>
                <Select
                  value={spForm.status}
                  onValueChange={(v) => setSpForm((f) => ({ ...f, status: v }))}
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
                  value={spForm.priority}
                  onValueChange={(v) =>
                    setSpForm((f) => ({ ...f, priority: v }))
                  }
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
                value={spForm.dueDate}
                onChange={(e) =>
                  setSpForm((f) => ({ ...f, dueDate: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              data-ocid="project_detail.subproject_cancel.button"
              onClick={() => setSpDialog(false)}
            >
              Cancel
            </Button>
            <Button
              data-ocid="project_detail.subproject_save.button"
              onClick={saveSp}
              disabled={saving || !spForm.name.trim()}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : editSp ? (
                "Update"
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DELETE SUB-PROJECT CONFIRM ── */}
      <AlertDialog
        open={!!deleteSp}
        onOpenChange={(o) => !o && setDeleteSp(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sub-Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteSp?.name}"? This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="project_detail.delete_subproject_cancel.button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              data-ocid="project_detail.delete_subproject_confirm.button"
              onClick={doDeleteSp}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
