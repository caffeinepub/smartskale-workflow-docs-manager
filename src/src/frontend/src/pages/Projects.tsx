import {
  Calendar,
  FolderKanban,
  Kanban,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Page } from "../App";
import type { Priority, Project, ProjectStatus } from "../backend";
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
  navigate: (p: Page) => void;
}

const statusColors: Record<string, string> = {
  PLANNING: "bg-slate-100 text-slate-700",
  ACTIVE: "bg-blue-100 text-blue-700",
  ON_HOLD: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const priorityColors: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-600",
  MEDIUM: "bg-blue-100 text-blue-600",
  HIGH: "bg-orange-100 text-orange-600",
  URGENT: "bg-red-100 text-red-700",
};

function getStatusKey(s: ProjectStatus): string {
  return Object.keys(s)[0];
}
function getPriorityKey(p: Priority): string {
  return Object.keys(p)[0];
}

export function Projects({ navigate }: Props) {
  const { actor } = useActor();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    status: "ACTIVE",
    priority: "MEDIUM",
  });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const load = () => {
    if (!actor) return;
    actor
      .getProjects()
      .then((ps) => {
        setProjects(ps);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [actor]);

  const handleCreate = async () => {
    if (!actor || !form.name.trim()) return;
    setSaving(true);
    try {
      await actor.createProject(
        form.name,
        form.description,
        { [form.status]: null } as ProjectStatus,
        { [form.priority]: null } as Priority,
        [],
      );
      toast.success("Project created");
      setOpen(false);
      setForm({
        name: "",
        description: "",
        status: "ACTIVE",
        priority: "MEDIUM",
      });
      load();
    } catch {
      toast.error("Failed to create project");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!actor) return;
    try {
      await actor.deleteProject(id);
      toast.success("Project deleted");
      load();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {projects.length} project{projects.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> New Project
        </Button>
      </div>

      <Input
        placeholder="Search projects..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-xs"
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(3)
            .fill(0)
            .map((_, i) => (
              <Skeleton key={i} className="h-44" />
            ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <FolderKanban className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-slate-500 font-medium">No projects yet</h3>
          <p className="text-slate-400 text-sm mt-1">
            Create your first project to get started
          </p>
          <Button className="mt-4" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Create Project
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => {
            const statusKey = getStatusKey(p.status);
            const priorityKey = getPriorityKey(p.priority);
            return (
              <Card
                key={p.id}
                className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className="flex-1 min-w-0"
                      onClick={() =>
                        navigate({ name: "project-detail", id: p.id })
                      }
                    >
                      <h3 className="font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                        {p.name}
                      </h3>
                      <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                        {p.description || "No description"}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 ml-2 shrink-0"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => navigate({ name: "kanban", id: p.id })}
                        >
                          <Kanban className="h-4 w-4 mr-2" /> Kanban Board
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(p.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge
                      className={`text-xs font-medium ${statusColors[statusKey] || ""}`}
                    >
                      {statusKey}
                    </Badge>
                    <Badge
                      className={`text-xs font-medium ${priorityColors[priorityKey] || ""}`}
                    >
                      {priorityKey}
                    </Badge>
                  </div>
                  {p.dueDate.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Calendar className="h-3 w-3" />
                      {new Date(
                        Number(p.dueDate[0]) / 1_000_000,
                      ).toLocaleDateString()}
                    </div>
                  )}
                  <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7"
                      onClick={() =>
                        navigate({ name: "project-detail", id: p.id })
                      }
                    >
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7"
                      onClick={() => navigate({ name: "kanban", id: p.id })}
                    >
                      <Kanban className="h-3 w-3 mr-1" /> Kanban
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Project name"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="What is this project about?"
                rows={3}
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
                        {s}
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={saving || !form.name.trim()}
            >
              {saving ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
