"use client";

import { useEffect, useMemo, useState } from "react";

type ManagedFile = { path: string; updatedAt?: string };
type SaveMode = "create" | "update";

type FileColorDef = {
  bg: string;
  badgeBg: string;
  badgeText: string;
};

const FILE_COLORS: Record<string, FileColorDef> = {
  "AGENTS.md": {
    bg: "rgba(231,0,11,0.1)",
    badgeBg: "rgba(231,0,11,0.1)",
    badgeText: "#e7000b",
  },
  "SOUL.md": {
    bg: "rgba(254,154,0,0.1)",
    badgeBg: "rgba(254,154,0,0.1)",
    badgeText: "#fe9a00",
  },
  "TOOLS.md": {
    bg: "rgba(124,207,0,0.1)",
    badgeBg: "rgba(124,207,0,0.1)",
    badgeText: "#7ccf00",
  },
  "IDENTITY.md": {
    bg: "rgba(0,188,125,0.1)",
    badgeBg: "rgba(0,188,125,0.1)",
    badgeText: "#00bc7d",
  },
  "USER.md": {
    bg: "rgba(43,127,255,0.1)",
    badgeBg: "rgba(43,127,255,0.1)",
    badgeText: "#2b7fff",
  },
  "HEARTBEAT.md": {
    bg: "rgba(142,81,255,0.1)",
    badgeBg: "rgba(142,81,255,0.1)",
    badgeText: "#8e51ff",
  },
  "BOOTSTRAP.md": {
    bg: "rgba(173,70,255,0.1)",
    badgeBg: "rgba(173,70,255,0.1)",
    badgeText: "#ad46ff",
  },
};

const DEFAULT_COLOR: FileColorDef = {
  bg: "rgba(0,166,244,0.1)",
  badgeBg: "rgba(0,166,244,0.1)",
  badgeText: "#00a6f4",
};

const MOCK_FILES: ManagedFile[] = [
  { path: "AGENTS.md", updatedAt: "12h ago" },
  { path: "SOUL.md", updatedAt: "12h ago" },
  { path: "TOOLS.md", updatedAt: "12h ago" },
  { path: "IDENTITY.md", updatedAt: "12h ago" },
  { path: "USER.md", updatedAt: "12h ago" },
  { path: "HEARTBEAT.md", updatedAt: "12h ago" },
  { path: "BOOTSTRAP.md", updatedAt: "12h ago" },
];

function splitLines(value: string) {
  return value.replace(/\r\n/g, "\n").split("\n");
}

function getDiffLines(original: string, edited: string) {
  const before = splitLines(original);
  const after = splitLines(edited);
  const max = Math.max(before.length, after.length);
  const lines: Array<{ type: "same" | "add" | "remove"; left?: string; right?: string; key: string }> = [];

  for (let index = 0; index < max; index += 1) {
    const left = before[index];
    const right = after[index];
    if (left === right) {
      lines.push({ type: "same", left, right, key: `same-${index}` });
      continue;
    }
    if (left !== undefined) {
      lines.push({ type: "remove", left, key: `remove-${index}` });
    }
    if (right !== undefined) {
      lines.push({ type: "add", right, key: `add-${index}` });
    }
  }

  return lines;
}

export default function AgentFilesPage() {
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<ManagedFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [originalContent, setOriginalContent] = useState<string>("");
  const [draftContent, setDraftContent] = useState<string>("");
  const [contentLoading, setContentLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isEditorMode, setIsEditorMode] = useState(false);
  const [showDiffModal, setShowDiffModal] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadFiles() {
      try {
        setLoading(true);
        const response = await fetch("/api/control-center/files", { cache: "no-store" });
        const data = response.ok ? await response.json() : [];
        const loaded = Array.isArray(data) && data.length > 0 ? data : MOCK_FILES;
        if (cancelled) return;
        setFiles(loaded);
        setSelectedFile((current) => current || loaded[0]?.path || "");
        setError(null);
      } catch {
        if (cancelled) return;
        setFiles(MOCK_FILES);
        setSelectedFile((current) => current || MOCK_FILES[0]?.path || "");
        setError("Falling back to default file list because the API list call failed.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadFiles();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedFile) return;
    let cancelled = false;

    async function loadContent() {
      try {
        setContentLoading(true);
        setNotice(null);
        const response = await fetch(`/api/control-center/files/content?path=${encodeURIComponent(selectedFile)}`, {
          cache: "no-store",
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(data?.message || "Unable to load file content.");
        }
        if (cancelled) return;
        const nextContent = typeof data?.content === "string" ? data.content : "";
        setOriginalContent(nextContent);
        setDraftContent(nextContent);
        setError(null);
        setIsEditorMode(false);
      } catch (loadError) {
        if (cancelled) return;
        setOriginalContent("");
        setDraftContent("");
        setError(loadError instanceof Error ? loadError.message : "Unable to load file content.");
      } finally {
        if (!cancelled) setContentLoading(false);
      }
    }

    void loadContent();
    return () => {
      cancelled = true;
    };
  }, [selectedFile]);

  const getFileName = (path: string) => {
    const parts = path.split("/");
    return parts[parts.length - 1];
  };

  const getColor = (path: string): FileColorDef => {
    const name = getFileName(path);
    return FILE_COLORS[name] ?? DEFAULT_COLOR;
  };

  const hasChanges = draftContent !== originalContent;
  const diffLines = useMemo(() => getDiffLines(originalContent, draftContent), [originalContent, draftContent]);
  const changedLineCount = useMemo(
    () => diffLines.filter((line) => line.type === "add" || line.type === "remove").length,
    [diffLines],
  );

  async function refreshList(selectedPath: string) {
    try {
      const response = await fetch("/api/control-center/files", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) return;
      setFiles(data);
      setSelectedFile(selectedPath);
    } catch {
      // best-effort only
    }
  }

  async function saveFile(mode: SaveMode) {
    if (!selectedFile) return;

    try {
      setSaving(true);
      setError(null);
      setNotice(null);
      const response = await fetch("/api/control-center/files", {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: selectedFile, content: draftContent }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message || "Save failed.");
      }
      setOriginalContent(draftContent);
      setIsEditorMode(false);
      setShowDiffModal(false);
      setNotice(mode === "create" ? "File created successfully." : "File saved successfully.");
      await refreshList(selectedFile);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="flex h-full w-full flex-col gap-4 overflow-hidden p-6">
      <div className="mb-2 flex flex-col gap-1">
        <h1 className="font-manrope text-2xl font-medium text-white">Files</h1>
        <p className="font-ibm-plex-mono text-sm uppercase tracking-widest text-white/50">
          Real API-backed file browsing with edit and diff preview.
        </p>
      </div>

      {loading && (
        <div className="rounded-xl border border-white/10 bg-[#151618] p-4 text-white/70">
          Loading files…
        </div>
      )}

      {!loading && (
        <>
          {error && (
            <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 p-4 text-rose-200">
              {error}
            </div>
          )}
          {notice && (
            <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-4 text-emerald-200">
              {notice}
            </div>
          )}

          <div className="flex h-full w-full min-h-0 items-start gap-[10px]">
            <aside className="flex h-full w-[300px] shrink-0 flex-col overflow-y-auto">
              <section className="flex flex-col overflow-clip rounded-[14px] border border-[rgba(255,255,255,0.1)] bg-[#151618] p-[4px]">
                <div className="flex items-center p-[12px]">
                  <h2 className="font-manrope text-[16px] font-normal capitalize leading-[normal] text-white">
                    Core Files
                  </h2>
                </div>
                <div className="flex w-full flex-col gap-[4px]">
                  {files.map((file) => {
                    const color = getColor(file.path);
                    const name = getFileName(file.path);
                    const isSelected = selectedFile === file.path;
                    return (
                      <article
                        key={file.path}
                        onClick={() => {
                          setSelectedFile(file.path);
                          setShowDiffModal(false);
                        }}
                        style={{ backgroundColor: color.bg }}
                        className={`flex w-full cursor-pointer items-start justify-center gap-[10px] rounded-[10px] p-[12px] transition duration-200 ${
                          isSelected ? "ring-1 ring-white/20" : "hover:ring-1 hover:ring-white/10"
                        }`}
                      >
                        <div className="flex min-h-px min-w-px flex-[1_0_0] flex-col items-start justify-center gap-[4px]">
                          <div className="flex w-full shrink-0 items-center justify-between">
                            <div className="flex items-center gap-[4px] whitespace-nowrap font-ibm-plex-mono text-[10px] uppercase leading-[normal] text-[rgba(255,255,255,0.5)]">
                              <span>MAIN AGENT</span>
                              <span>·</span>
                              <span>{file.updatedAt ?? "RECENT"}</span>
                            </div>
                            <span
                              style={{
                                backgroundColor: color.badgeBg,
                                color: color.badgeText,
                              }}
                              className="flex h-[16px] shrink-0 items-center justify-center rounded-[20px] px-[6px] font-ibm-plex-mono text-[10px] uppercase leading-[normal]"
                            >
                              DEFAULT
                            </span>
                          </div>
                          <p className="w-full overflow-hidden text-ellipsis font-manrope text-[14px] font-normal leading-[normal] text-white">
                            {name}
                          </p>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            </aside>

            <article className="flex h-full min-h-0 min-w-px flex-[2] flex-col overflow-hidden rounded-[14px] border border-[rgba(255,255,255,0.1)] bg-[#151618] p-[4px]">
              <div className="flex w-full shrink-0 items-center justify-between gap-3 p-4">
                <div>
                  <h2 className="font-manrope text-[16px] font-normal leading-[normal] text-white">
                    {selectedFile ? getFileName(selectedFile) : "Select a file"}
                  </h2>
                  <p className="mt-1 font-ibm-plex-mono text-[10px] uppercase tracking-wide text-white/40">
                    {selectedFile || "No file selected"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex h-[16px] shrink-0 items-center justify-center rounded-[20px] bg-[rgba(0,201,80,0.1)] px-[6px] font-ibm-plex-mono text-[10px] uppercase leading-[normal] text-[#00c950]">
                    {hasChanges ? "DIRTY" : "SYNCED"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditorMode((current) => !current)}
                    disabled={!selectedFile || contentLoading}
                    className="rounded-[10px] border border-white/10 px-3 py-2 font-ibm-plex-mono text-[11px] uppercase text-white transition hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isEditorMode ? "Preview" : "Edit"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDiffModal(true)}
                    disabled={!selectedFile || contentLoading || !hasChanges}
                    className="rounded-[10px] border border-white/10 px-3 py-2 font-ibm-plex-mono text-[11px] uppercase text-white transition hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Diff Preview
                  </button>
                </div>
              </div>

              <div className="flex flex-1 flex-col rounded-[10px] bg-[#111214] p-[4px] min-h-px min-w-px">
                <div className="flex flex-1 flex-col gap-[10px] overflow-y-auto rounded-[8px] bg-[#151618] p-3">
                  {contentLoading ? (
                    <div className="flex items-center gap-2 text-[12px] text-[rgba(255,255,255,0.5)]">
                      <span className="animate-pulse">⏳</span>
                      Loading content...
                    </div>
                  ) : !selectedFile ? (
                    <p className="font-manrope text-[12px] text-[rgba(255,255,255,0.5)]">Pilih file di panel kiri.</p>
                  ) : isEditorMode ? (
                    <div className="flex h-full flex-col gap-3">
                      <textarea
                        value={draftContent}
                        onChange={(event) => setDraftContent(event.target.value)}
                        spellCheck={false}
                        className="min-h-[420px] w-full flex-1 rounded-[10px] border border-white/10 bg-[#111214] p-4 font-ibm-plex-mono text-[12px] leading-6 text-white outline-none focus:border-white/20"
                      />
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-ibm-plex-mono text-[10px] uppercase text-white/40">
                          {changedLineCount} changed diff lines
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setDraftContent(originalContent);
                              setIsEditorMode(false);
                            }}
                            disabled={saving}
                            className="rounded-[10px] border border-white/10 px-3 py-2 font-ibm-plex-mono text-[11px] uppercase text-white transition hover:border-white/20 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowDiffModal(true)}
                            disabled={!hasChanges || saving}
                            className="rounded-[10px] border border-[#00a6f4]/30 bg-[rgba(0,166,244,0.1)] px-3 py-2 font-ibm-plex-mono text-[11px] uppercase text-[#86d9ff] transition hover:border-[#00a6f4]/50 disabled:opacity-50"
                          >
                            Review Diff
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <pre className="whitespace-pre-wrap break-words rounded-[10px] bg-[#111214] p-4 font-ibm-plex-mono text-[12px] leading-6 text-[rgba(255,255,255,0.82)]">
                      {draftContent || "// Empty file"}
                    </pre>
                  )}
                </div>
              </div>
            </article>
          </div>

          {showDiffModal && selectedFile && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
              <div className="flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-[18px] border border-white/10 bg-[#111214] shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                  <div>
                    <h3 className="font-manrope text-[18px] text-white">Diff Preview</h3>
                    <p className="mt-1 font-ibm-plex-mono text-[10px] uppercase tracking-wide text-white/40">
                      {selectedFile} · {changedLineCount} changed lines
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDiffModal(false)}
                    className="rounded-[10px] border border-white/10 px-3 py-2 font-ibm-plex-mono text-[11px] uppercase text-white transition hover:border-white/20"
                  >
                    Close
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  <div className="overflow-hidden rounded-[12px] border border-white/10 bg-[#151618]">
                    {diffLines.length === 0 ? (
                      <div className="p-4 font-manrope text-[14px] text-white/60">No changes yet.</div>
                    ) : (
                      diffLines.map((line, index) => {
                        const baseClass = "grid grid-cols-[56px_1fr] gap-4 px-4 py-2 font-ibm-plex-mono text-[12px] leading-6";
                        if (line.type === "add") {
                          return (
                            <div key={line.key} className={`${baseClass} border-b border-emerald-400/10 bg-emerald-500/10 text-emerald-100`}>
                              <span className="text-emerald-300">+ {index + 1}</span>
                              <span>{line.right || " "}</span>
                            </div>
                          );
                        }
                        if (line.type === "remove") {
                          return (
                            <div key={line.key} className={`${baseClass} border-b border-rose-400/10 bg-rose-500/10 text-rose-100`}>
                              <span className="text-rose-300">- {index + 1}</span>
                              <span>{line.left || " "}</span>
                            </div>
                          );
                        }
                        return (
                          <div key={line.key} className={`${baseClass} border-b border-white/5 text-white/35`}>
                            <span>{index + 1}</span>
                            <span>{line.right || " "}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-white/10 px-5 py-4">
                  <p className="font-manrope text-[13px] text-white/50">
                    Save writes through the real control-center file API.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowDiffModal(false)}
                      className="rounded-[10px] border border-white/10 px-3 py-2 font-ibm-plex-mono text-[11px] uppercase text-white transition hover:border-white/20"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => saveFile(originalContent.length === 0 ? "create" : "update")}
                      disabled={!hasChanges || saving}
                      className="rounded-[10px] border border-[#00c950]/30 bg-[rgba(0,201,80,0.12)] px-3 py-2 font-ibm-plex-mono text-[11px] uppercase text-[#8bf5b4] transition hover:border-[#00c950]/50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}
