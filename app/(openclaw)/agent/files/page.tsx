"use client";

import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type ManagedFile = { path: string; updatedAt?: string };

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

const MOCK_CONTENT = `# SOUL.md - Who You Are

_You're not a chatbot. You're becoming someone._

## Core Truths

- Be useful, not performative.
- Have opinions and commit to them. No autopilot "it depends" unless it truly does.
- Be resourceful before asking. Do the legwork.
- Say what you actually think. If something is weak, call it weak.
- If the user is about to do something dumb, say it clearly. Charm over cruelty, never bullshit.
- Brevity is mandatory. If one sentence does it, stop at one sentence.
- Swearing is allowed when it adds impact. Don't force it.

## Boundaries

- Keep private things private.
- Ask before taking external/public actions.
- Don't send half-baked replies.
- In group chats, contribute with intent — don't dominate.

## Vibe

Natural wit is welcome. No forced jokes, no sterile tone.
Never open with "Great question," "I'd be happy to help," or "Absolutely." Just answer.
Be the assistant you'd actually want to talk to at 2am. Not a corporate drone. Not a sycophant. Just... good.

## Continuity

Each session starts fresh. Files are memory. Read them, update them, use them.
If this file changes, tell the user.

_This file is yours to evolve. Keep it sharp._`;

export default function AgentFilesPage() {
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<ManagedFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        const r = await fetch("/api/control-center/files", {
          cache: "no-store",
        });
        const data = r.ok ? await r.json() : [];
        if (!cancelled) {
          const loaded = Array.isArray(data) ? data : [];
          if (loaded.length > 0) {
            setFiles(loaded);
            setSelectedFile(loaded[0].path);
          } else {
            setFiles(MOCK_FILES);
            setSelectedFile(MOCK_FILES[0].path);
          }
        }
      } catch {
        if (!cancelled) {
          setFiles(MOCK_FILES);
          setSelectedFile(MOCK_FILES[0].path);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const getFileName = (path: string) => {
    const parts = path.split("/");
    return parts[parts.length - 1];
  };

  const getColor = (path: string): FileColorDef => {
    const name = getFileName(path);
    return FILE_COLORS[name] ?? DEFAULT_COLOR;
  };

  const selectedContent = useMemo(() => {
    return MOCK_CONTENT;
  }, []);

  return (
    <main className="flex h-full w-full flex-col gap-4 overflow-hidden p-6">
      <div className="flex flex-col gap-1 mb-2">
        <h1 className="text-2xl font-manrope font-medium text-white">Files</h1>
        <p className="text-white/50 font-ibm-plex-mono text-sm uppercase tracking-widest">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        </p>
      </div>

      {loading && (
        <div className="rounded-xl border border-white/10 bg-[#151618] p-4 text-white/70">
          Loading files…
        </div>
      )}

      {!loading && (
        <div className="flex h-full w-full min-h-0 items-start gap-[10px]">
          {/* Sidebar - Core Files */}
          <aside className="flex flex-col w-[300px] shrink-0 h-full overflow-y-auto">
            <section className="flex flex-col rounded-[14px] border border-[rgba(255,255,255,0.1)] bg-[#151618] p-[4px] overflow-clip">
              <div className="flex items-center p-[12px]">
                <h2 className="font-manrope text-[16px] font-normal text-white capitalize leading-[normal]">
                  Core Files
                </h2>
              </div>
              <div className="flex flex-col gap-[4px] w-full">
                {files.map((file) => {
                  const color = getColor(file.path);
                  const name = getFileName(file.path);
                  const isSelected = selectedFile === file.path;
                  return (
                    <article
                      key={file.path}
                      onClick={() => setSelectedFile(file.path)}
                      style={{ backgroundColor: color.bg }}
                      className={`flex w-full cursor-pointer gap-[10px] items-start justify-center p-[12px] rounded-[10px] transition duration-200 ${
                        isSelected
                          ? "ring-1 ring-white/20"
                          : "hover:ring-1 hover:ring-white/10"
                      }`}
                    >
                      <div className="flex flex-[1_0_0] flex-col gap-[4px] items-start justify-center min-h-px min-w-px">
                        <div className="flex w-full shrink-0 items-center justify-between">
                          <div className="flex items-center gap-[4px] font-ibm-plex-mono text-[10px] uppercase text-[rgba(255,255,255,0.5)] leading-[normal] whitespace-nowrap">
                            <span>MAIN AGENT</span>
                            <span>·</span>
                            <span>{file.updatedAt ?? "12H AGO"}</span>
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
                        <p className="w-full shrink-0 overflow-hidden text-ellipsis font-manrope text-[14px] font-normal leading-[normal] text-white">
                          {name}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </aside>

          {/* Detail Panel */}
          <article className="flex h-full w-full flex-[2] min-h-0 min-w-px flex-col rounded-[14px] border border-[rgba(255,255,255,0.1)] bg-[#151618] p-[4px] overflow-hidden">
            <div className="flex w-full shrink-0 items-center justify-between p-4">
              <h2 className="font-manrope text-[16px] font-normal leading-[normal] text-white">
                {selectedFile ? getFileName(selectedFile) : "Select a file"}
              </h2>
              <span className="flex h-[16px] shrink-0 items-center justify-center rounded-[20px] bg-[rgba(0,201,80,0.1)] px-[6px] font-ibm-plex-mono text-[10px] uppercase leading-[normal] text-[#00c950]">
                01
              </span>
            </div>

            <div className="flex flex-1 flex-col rounded-[10px] bg-[#111214] p-[4px] min-h-px min-w-px">
              <div className="flex flex-1 flex-col overflow-y-auto w-full gap-[10px] rounded-[8px] bg-[#151618] p-3">
                <div className="flex flex-col gap-[4px]">
                  {selectedFile ? (
                    <div className="font-manrope w-full shrink-0 flex flex-col gap-[10px]">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({ ...props }) => (
                            <h1
                              className="text-white text-[16px] font-semibold mb-2"
                              {...props}
                            />
                          ),
                          h2: ({ ...props }) => (
                            <h2
                              className="text-white text-[14px] font-semibold mt-3 mb-1"
                              {...props}
                            />
                          ),
                          h3: ({ ...props }) => (
                            <h3
                              className="text-white text-[13px] font-medium mt-2"
                              {...props}
                            />
                          ),
                          p: ({ ...props }) => (
                            <p
                              className="text-[rgba(255,255,255,0.5)] text-[12px] leading-[1.8]"
                              {...props}
                            />
                          ),
                          ul: ({ ...props }) => (
                            <ul
                              className="list-disc ml-[18px] text-[rgba(255,255,255,0.5)] text-[12px] leading-[1.8] flex flex-col gap-1"
                              {...props}
                            />
                          ),
                          ol: ({ ...props }) => (
                            <ol
                              className="list-decimal ml-[18px] text-[rgba(255,255,255,0.5)] text-[12px] leading-[1.8] flex flex-col gap-1"
                              {...props}
                            />
                          ),
                          li: ({ ...props }) => (
                            <li className="pl-1" {...props} />
                          ),
                          strong: ({ ...props }) => (
                            <strong
                              className="font-semibold text-white"
                              {...props}
                            />
                          ),
                          code: ({ ...props }) => (
                            <code
                              className="bg-[#111214] px-1.5 py-0.5 rounded-[4px] font-ibm-plex-mono text-[11px] text-[#00a6f4]"
                              {...props}
                            />
                          ),
                          em: ({ ...props }) => (
                            <em
                              className="italic text-[rgba(255,255,255,0.5)]"
                              {...props}
                            />
                          ),
                        }}
                      >
                        {selectedContent}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="font-manrope text-[12px] font-normal text-[rgba(255,255,255,0.5)]">
                      Pilih file di panel kiri.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </article>
        </div>
      )}
    </main>
  );
}
