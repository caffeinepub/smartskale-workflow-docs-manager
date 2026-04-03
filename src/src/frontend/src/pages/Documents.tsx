import { Clock, FileText, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Page } from "../App";
import type { Document as Doc, Project } from "../backend";
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
  navigate: (p: Page) => void;
}

export function Documents({ navigate }: Props) {
  const { actor } = useActor();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", projectId: "" });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const load = () => {
    if (!actor) return;
    Promise.all([actor.getDocuments(), actor.getProjects()])
      .then(([d, p]) => {
        setDocs(d);
        setProjects(p);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [actor]);

  const handleCreate = async () => {
    if (!actor || !form.title.trim()) return;
    setSaving(true);
    try {
      await actor.createDocument(form.projectId, form.title, form.content, []);
      toast.success("Document created");
      setOpen(false);
      setForm({ title: "", content: "", projectId: "" });
      load();
    } catch {
      toast.error("Failed to create document");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!actor) return;
    await actor.deleteDocument(id);
    toast.success("Deleted");
    load();
  };

  const getProjectName = (pid: string) =>
    projects.find((p) => p.id === pid)?.name || "No Project";
  const filtered = docs.filter((d) =>
    d.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Documents</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {docs.length} document{docs.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          onClick={() => {
            setForm({
              title: "",
              content: "",
              projectId: projects[0]?.id || "",
            });
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-1" /> New Document
        </Button>
      </div>

      <Input
        placeholder="Search documents..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-xs"
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(3)
            .fill(0)
            .map((_, i) => (
              <Skeleton key={i} className="h-36" />
            ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No documents yet</p>
          <Button className="mt-4" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Document
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((d) => (
            <Card
              key={d.id}
              className="border-0 shadow-sm hover:shadow-md cursor-pointer transition-shadow group"
              onClick={() => navigate({ name: "document-editor", id: d.id })}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <div className="bg-blue-100 rounded-lg p-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                      v{Number(d.version)}
                    </span>
                    <button
                      onClick={(e) => handleDelete(d.id, e)}
                      className="text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <h3 className="font-semibold text-slate-900 mt-2 mb-1 line-clamp-1">
                  {d.title}
                </h3>
                <p className="text-xs text-slate-400 mb-3 line-clamp-2">
                  {d.content || "Empty document"}
                </p>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="bg-slate-100 px-2 py-0.5 rounded-full truncate max-w-[120px]">
                    {getProjectName(d.projectId)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(
                      Number(d.updatedAt) / 1_000_000,
                    ).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Document</DialogTitle>
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
              <Label>Project</Label>
              <Select
                value={form.projectId}
                onValueChange={(v) => setForm((f) => ({ ...f, projectId: v }))}
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
            <div>
              <Label>Initial Content</Label>
              <Textarea
                value={form.content}
                onChange={(e) =>
                  setForm((f) => ({ ...f, content: e.target.value }))
                }
                rows={4}
                placeholder="Start writing..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
