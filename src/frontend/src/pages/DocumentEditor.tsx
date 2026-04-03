import { ArrowLeft, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Page } from "../App";
import type { Project } from "../backend";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
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
import { useActor } from "../hooks/useActor";

interface Props {
  docId: string;
  navigate: (p: Page) => void;
}

export function DocumentEditor({ docId, navigate }: Props) {
  const { actor } = useActor();
  const isNew = docId === "new";
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [projectId, setProjectId] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [version, setVersion] = useState<bigint>(1n);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!actor) return;
    actor.getProjects().then(setProjects);
    if (!isNew) {
      actor
        .getDocument(docId)
        .then((res) => {
          if (res.length > 0) {
            const d = res[0]!;
            setTitle(d.title);
            setContent(d.content);
            setProjectId(d.projectId);
            setVersion(d.version);
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [actor, docId, isNew]);

  const save = async () => {
    if (!actor || !title.trim()) return;
    setSaving(true);
    try {
      if (isNew) {
        await actor.createDocument(projectId, title, content, []);
        toast.success("Document created");
      } else {
        await actor.updateDocument(docId, title, content, []);
        setVersion((v) => v + 1n);
        toast.success("Document saved");
      }
      navigate({ name: "documents" });
    } catch {
      toast.error("Failed to save document");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-10" />
        <Skeleton className="h-96" />
      </div>
    );

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ name: "documents" })}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-bold text-slate-900 flex-1">
          {isNew ? "New Document" : "Edit Document"}
        </h1>
        {!isNew && (
          <Badge className="bg-slate-100 text-slate-600">
            v{version.toString()}
          </Badge>
        )}
        <Button onClick={save} disabled={saving || !title.trim()}>
          <Save className="h-4 w-4 mr-1" />
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      <div className="space-y-3 bg-white rounded-xl border border-slate-200 p-5">
        <div>
          <Label>Title *</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Document title..."
            className="text-lg font-semibold mt-1"
          />
        </div>

        {isNew && (
          <div>
            <Label>Project</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="mt-1">
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
          </div>
        )}

        <div>
          <Label>Content</Label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your document content here..."
            className="mt-1 w-full min-h-[400px] p-3 rounded-md border border-slate-200 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );
}
