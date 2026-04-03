import { ArrowLeft, Clock, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Page } from "../App";
import type { Document as Doc } from "../backend";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Skeleton } from "../components/ui/skeleton";
import { Textarea } from "../components/ui/textarea";
import { useActor } from "../hooks/useActor";

interface Props {
  id: string;
  navigate: (p: Page) => void;
}

export function DocumentEditor({ id, navigate }: Props) {
  const { actor } = useActor();
  const [doc, setDoc] = useState<Doc | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!actor) return;
    actor
      .getDocument(id)
      .then((d) => {
        if (d.length > 0) {
          setDoc(d[0]!);
          setTitle(d[0]!.title);
          setContent(d[0]!.content);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [actor, id]);

  const handleSave = async () => {
    if (!actor || !doc) return;
    setSaving(true);
    try {
      const updated = await actor.updateDocument(
        id,
        title,
        content,
        doc.fileUrl,
      );
      if (updated.length > 0) {
        setDoc(updated[0]!);
        setDirty(false);
        toast.success(`Saved — now version ${Number(updated[0]!.version)}`);
      }
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-96" />
      </div>
    );
  if (!doc)
    return (
      <div className="text-center py-20 text-slate-400">
        Document not found.{" "}
        <Button variant="link" onClick={() => navigate({ name: "documents" })}>
          Go back
        </Button>
      </div>
    );

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ name: "documents" })}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            <Clock className="h-3 w-3 mr-1" />v{Number(doc.version)}
          </Badge>
          <span className="text-xs text-slate-400">
            Updated{" "}
            {new Date(Number(doc.updatedAt) / 1_000_000).toLocaleString()}
          </span>
        </div>
        <Button onClick={handleSave} disabled={saving || !dirty} size="sm">
          <Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      <Input
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          setDirty(true);
        }}
        className="text-2xl font-bold border-0 border-b border-slate-200 rounded-none px-0 h-12 text-slate-900 focus-visible:ring-0 focus-visible:border-blue-400"
        placeholder="Document title..."
      />

      <Textarea
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          setDirty(true);
        }}
        className="min-h-[60vh] resize-none border border-slate-200 rounded-xl p-4 text-slate-700 text-sm leading-relaxed focus-visible:ring-1 focus-visible:ring-blue-400"
        placeholder="Start writing your document..."
      />

      {dirty && (
        <div className="fixed bottom-6 right-6">
          <Button onClick={handleSave} disabled={saving} className="shadow-lg">
            <Save className="h-4 w-4 mr-2" />{" "}
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      )}
    </div>
  );
}
