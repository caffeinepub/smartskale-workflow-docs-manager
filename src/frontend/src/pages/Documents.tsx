import {
  Archive,
  Download,
  FileText,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Page } from "../App";
import type { Document as Doc, Project } from "../backend";
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
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Skeleton } from "../components/ui/skeleton";
import { useActor } from "../hooks/useActor";
import {
  exportToExcel,
  exportToPDF,
  exportToWord,
  exportToZip,
  importFromExcel,
} from "../utils/exportUtils";

interface Props {
  navigate: (p: Page) => void;
}

export function Documents({ navigate }: Props) {
  const { actor } = useActor();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterProject, setFilterProject] = useState("all");
  const [deleteDoc, setDeleteDoc] = useState<Doc | null>(null);
  const [exporting, setExporting] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

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

  // biome-ignore lint/correctness/useExhaustiveDependencies: load depends on actor
  useEffect(() => {
    load();
  }, [actor]);

  const doDelete = async () => {
    if (!actor || !deleteDoc) return;
    try {
      await actor.deleteDocument(deleteDoc.id);
      toast.success("Document deleted");
      setDeleteDoc(null);
      load();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const filtered = docs.filter((d) => {
    const matchSearch = d.title.toLowerCase().includes(search.toLowerCase());
    const matchProject =
      filterProject === "all" || d.projectId === filterProject;
    return matchSearch && matchProject;
  });

  const getProjectName = (id: string) =>
    projects.find((p) => p.id === id)?.name || "Unknown";

  const toExportDocs = (list: Doc[]) =>
    list.map((d) => ({
      title: d.title,
      content: d.content,
      projectName: getProjectName(d.projectId),
      version: d.version.toString(),
      updatedAt: new Date(Number(d.updatedAt) / 1_000_000).toLocaleDateString(),
    }));

  const handleExport = async (type: "excel" | "pdf" | "word" | "zip") => {
    if (filtered.length === 0) {
      toast.error("No documents to export");
      return;
    }
    setExporting(type);
    try {
      const data = toExportDocs(filtered);
      if (type === "excel") await exportToExcel(data, "smartskale-documents");
      else if (type === "pdf") await exportToPDF(data, "smartskale-documents");
      else if (type === "word")
        await exportToWord(data, "smartskale-documents");
      else if (type === "zip") await exportToZip(data, "smartskale-documents");
      toast.success("Export complete");
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting("");
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !actor) return;
    try {
      const rows = await importFromExcel(file);
      if (rows.length === 0) {
        toast.error(
          "No valid rows found. Expected columns: Title, Content, Project",
        );
        return;
      }
      let created = 0;
      for (const row of rows) {
        const proj = projects.find(
          (p) => p.name.toLowerCase() === row.projectName.toLowerCase(),
        );
        const projId = proj?.id ?? projects[0]?.id ?? "";
        if (!projId) continue;
        await actor.createDocument(projId, row.title, row.content, []);
        created++;
      }
      toast.success(`Imported ${created} document${created !== 1 ? "s" : ""}`);
      load();
    } catch {
      toast.error("Import failed");
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  };

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
          onClick={() => navigate({ name: "document-editor", id: "new" })}
        >
          <Plus className="h-4 w-4 mr-1" /> New Document
        </Button>
      </div>

      {/* Import / Export toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide mr-1">
          Import / Export
        </span>
        <input
          ref={importRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={handleImport}
        />
        <Button
          size="sm"
          variant="outline"
          onClick={() => importRef.current?.click()}
        >
          <Upload className="h-3.5 w-3.5 mr-1" /> Import Excel
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={exporting === "excel"}
          onClick={() => handleExport("excel")}
        >
          <Download className="h-3.5 w-3.5 mr-1" />
          {exporting === "excel" ? "Exporting..." : "Export Excel"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={exporting === "word"}
          onClick={() => handleExport("word")}
        >
          <FileText className="h-3.5 w-3.5 mr-1" />
          {exporting === "word" ? "Exporting..." : "Export Word"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={exporting === "pdf"}
          onClick={() => handleExport("pdf")}
        >
          <FileText className="h-3.5 w-3.5 mr-1" />
          {exporting === "pdf" ? "Exporting..." : "Export PDF"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={exporting === "zip"}
          onClick={() => handleExport("zip")}
        >
          <Archive className="h-3.5 w-3.5 mr-1" />
          {exporting === "zip" ? "Exporting..." : "Export ZIP"}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search documents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {["a", "b", "c"].map((k) => (
            <Skeleton key={k} className="h-32" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="h-14 w-14 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-600 mb-1">
            {docs.length === 0 ? "No documents yet" : "No results"}
          </h3>
          <p className="text-slate-400 mb-4">
            {docs.length === 0
              ? "Create your first document"
              : "Try a different search"}
          </p>
          {docs.length === 0 && (
            <Button
              onClick={() => navigate({ name: "document-editor", id: "new" })}
            >
              <Plus className="h-4 w-4 mr-1" /> Create Document
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((d) => (
            <Card
              key={d.id}
              className="border-0 shadow-sm hover:shadow-md transition-shadow"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <button
                    type="button"
                    className="flex-1 min-w-0 cursor-pointer text-left bg-transparent border-0 p-0"
                    onClick={() =>
                      navigate({ name: "document-editor", id: d.id })
                    }
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                      <h3 className="font-semibold text-slate-900 truncate">
                        {d.title}
                      </h3>
                    </div>
                    <Badge className="bg-slate-100 text-slate-600 text-xs py-0">
                      v{d.version.toString()}
                    </Badge>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-red-400 hover:text-red-600"
                    onClick={() => setDeleteDoc(d)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="text-xs text-slate-400 truncate mt-2">
                  {getProjectName(d.projectId)} · Updated{" "}
                  {new Date(
                    Number(d.updatedAt) / 1_000_000,
                  ).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog
        open={!!deleteDoc}
        onOpenChange={(o) => !o && setDeleteDoc(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDoc?.title}"? This cannot
              be undone.
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
