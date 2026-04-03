import {
  ArrowLeft,
  CheckSquare,
  FileText,
  Kanban,
  Plus,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Page } from "../App";
import type {
  Document as Doc,
  Priority,
  Project,
  Task,
  TaskStatus,
} from "../backend";
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

const statusColors: Record<string, string> = {
  TODO: "bg-slate-100 text-slate-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  IN_REVIEW: "bg-amber-100 text-amber-700",
  DONE: "bg-green-100 text-green-700",
};

function getKey(obj: Record<string, null> | unknown): string {
  return Object.keys(obj as object)[0];
}

export function ProjectDetail({ id, navigate }: Props) {
  const { actor } = useActor();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskDialog, setTaskDialog] = useState(false);
  const [docDialog, setDocDialog] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
  });
  const [docForm, setDocForm] = useState({ title: "", content: "" });
  const [saving, setSaving] = useState(false);

  const load = () => {
    if (!actor) return;
    Promise.all([
      actor.getProject(id),
      actor.getTasksByProject(id),
      actor.getDocumentsByProject(id),
    ])
      .then(([p, t, d]) => {
        if (p.length > 0) setProject(p[0]!);
        setTasks(t);
        setDocs(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

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

  if (loading)
    return (
      <div className="space-y-4">
        {Array(3)
          .fill(0)
          .map((_, i) => (
            <Skeleton key={i} className="h-20" />
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
          onClick={() => navigate({ name: "projects" })}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
          <p className="text-slate-500 text-sm">{project.description}</p>
        </div>
        <Button onClick={() => navigate({ name: "kanban", id })}>
          <Kanban className="h-4 w-4 mr-1" /> Kanban Board
        </Button>
      </div>

      <Tabs defaultValue="tasks">
        <TabsList>
          <TabsTrigger value="tasks">
            <CheckSquare className="h-4 w-4 mr-1" /> Tasks ({tasks.length})
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="h-4 w-4 mr-1" /> Documents ({docs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setTaskDialog(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Task
            </Button>
          </div>
          {tasks.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <CheckSquare className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              No tasks yet
            </div>
          ) : (
            tasks.map((t) => (
              <Card key={t.id} className="border-0 shadow-sm">
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
                    className={`text-xs ${statusColors[getKey(t.status)] || ""}`}
                  >
                    {getKey(t.status).replace("_", " ")}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {getKey(t.priority)}
                  </Badge>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="documents" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setDocDialog(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Document
            </Button>
          </div>
          {docs.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FileText className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              No documents yet
            </div>
          ) : (
            docs.map((d) => (
              <Card
                key={d.id}
                className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
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

      <Dialog open={taskDialog} onOpenChange={setTaskDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Title *</Label>
              <Input
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
    </div>
  );
}
