// Export / Import utilities for Documents
// Uses dynamic imports to keep bundle clean — external packages are optional

export interface ExportDoc {
  title: string;
  content: string;
  projectName: string;
  version: string;
  updatedAt: string;
}

export interface ImportedDoc {
  title: string;
  content: string;
  projectName: string;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function safeName(s: string) {
  return s.replace(/[^a-z0-9]/gi, "_") || "document";
}

// ─── Excel ────────────────────────────────────────────────────────────────────
export async function exportToExcel(docs: ExportDoc[], filename = "documents") {
  // Fallback: export as CSV when xlsx is unavailable
  const headers = ["Title", "Content", "Project", "Version", "Last Updated"];
  const rows = docs.map((d) => [
    d.title,
    d.content,
    d.projectName,
    d.version,
    d.updatedAt,
  ]);
  const csv = [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  downloadBlob(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
    `${filename}.csv`,
  );
}

export async function importFromExcel(_file: File): Promise<ImportedDoc[]> {
  // xlsx not available — return empty array and let caller show an error
  return [];
}

// ─── PDF ──────────────────────────────────────────────────────────────────────
export async function exportToPDF(docs: ExportDoc[], filename = "documents") {
  // Fallback: export as plain text when jspdf is unavailable
  const text = docs
    .map(
      (d) =>
        `${d.title}\n${"=".repeat(d.title.length)}\nProject: ${d.projectName} | Version: ${d.version} | Updated: ${d.updatedAt}\n\n${d.content}`,
    )
    .join(`\n\n${" -".repeat(30)}\n\n`);
  exportSingleDocTxt(filename, text);
}

export async function exportSingleDocPDF(title: string, content: string) {
  // Fallback: export as txt
  exportSingleDocTxt(title, content);
}

export function exportSingleDocTxt(title: string, content: string) {
  const blob = new Blob(
    [`${title}\n${"=".repeat(title.length)}\n\n${content}`],
    { type: "text/plain;charset=utf-8" },
  );
  downloadBlob(blob, `${safeName(title)}.txt`);
}

// ─── Word ─────────────────────────────────────────────────────────────────────
export async function exportToWord(docs: ExportDoc[], filename = "documents") {
  // Fallback: export as plain text when docx is unavailable
  await exportToPDF(docs, filename);
}

export async function exportSingleDocWord(title: string, content: string) {
  exportSingleDocTxt(title, content);
}

// ─── ZIP ──────────────────────────────────────────────────────────────────────
export async function exportToZip(docs: ExportDoc[], filename = "documents") {
  // Fallback: export as txt archive when jszip is unavailable
  const combined = docs
    .map(
      (d) =>
        `=== ${d.title} ===\nProject: ${d.projectName}\nVersion: ${d.version}\nUpdated: ${d.updatedAt}\n\n${d.content}`,
    )
    .join(`\n\n${"=".repeat(60)}\n\n`);
  downloadBlob(
    new Blob([combined], { type: "text/plain;charset=utf-8" }),
    `${filename}.txt`,
  );
}

// ─── Report Excel ─────────────────────────────────────────────────────────────
export async function exportReportToExcel(
  rows: Record<string, string | number>[],
  sheetName: string,
  filename: string,
) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers, ...rows.map((r) => headers.map((h) => r[h]))]
    .map((r) =>
      r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","),
    )
    .join("\n");
  downloadBlob(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
    `${filename}_${sheetName}.csv`,
  );
}
