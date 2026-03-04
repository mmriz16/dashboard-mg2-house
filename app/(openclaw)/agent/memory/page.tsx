"use client";

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type DailyItem = {
  file: string;
  date: string;
  updatedAt: string;
  preview: string;
};

const mockDaily: DailyItem[] = [
  { date: "03-24-2026", file: "03-24-2026.md", preview: "Desain roadmap pengembangan fitur baru...", updatedAt: "" },
  { date: "03-21-2026", file: "03-21-2026.md", preview: "Evaluasi QA", updatedAt: "" },
  { date: "03-19-2026", file: "03-19-2026.md", preview: "Rapat koordinasi mingguan", updatedAt: "" },
  { date: "03-08-2026", file: "03-08-2026.md", preview: "Mendesain arsip log lama", updatedAt: "" },
  { date: "02-28-2026", file: "02-28-2026.md", preview: "Evaluasi akhir bulan", updatedAt: "" },
  { date: "02-15-2026", file: "02-15-2026.md", preview: "Audit keamanan sistem", updatedAt: "" },
  { date: "02-10-2026", file: "02-10-2026.md", preview: "Optimasi sistem search memori", updatedAt: "" },
  { date: "02-04-2026", file: "02-04-2026.md", preview: "Penyelarasan dokumentasi", updatedAt: "" },
];

export default function AgentMemoryPage() {
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);
  const [longTerm] = useState(
    "Finalisasi role, handoff, SLA, dan guardrail: Main Agent sebagai CEO/Orchestrator; Builder fokus implementasi, UI Guardian validasi Design System.md, QA Verifier validasi scope dan bug/error sebelum review final user."
  );
  const [daily] = useState<DailyItem[]>(mockDaily);
  const [selectedFile, setSelectedFile] = useState<string>(mockDaily[0].file);
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [filterYear, setFilterYear] = useState<string>("all");
  const [filterKeyword, setFilterKeyword] = useState<string>("");

  const selectedContent = useMemo(() => {
    if (!selectedFile) return "";
    return `# MEMORY.md - Long-Term Memory

## Agent Control Center (ACC)

### Progres Utama
- **Phase 0-2**: Selesai ✅
- **Phase 3**: Selesai ✅
- **Phase 4**: In Progress
  - ✅ Typed confirmation untuk destructive actions
  - ✅ Scope/impact text in dialogs
  - ⏳ Immutable action log view page (admin)

### Detail Implementasi
- Component \`ActionConfirmDialog\` dengan typed confirmation
- Radix UI Dialog-based confirmation
- Retry handling + error display yang proper

## Infrastructure

### Oracle Cloud Server
- IP: 168.110.192.119
- User: Ubuntu
- Port: 22
- SSH Key: Downloads/ssh.key

### Cron Jobs Aktif
- Daily OpenClaw Update Check (09:00)
- Daily Agent Ops Report (20:00)
- Work Transition Recovery Check (09:05, 17:05, 18:05)
- Daily Agent Build Progress (21:00)

### Incident Log
- **2026-03-02**: Gateway down ~2.5 jam (pagi hari). Scheduled task restart gagal. Recovery manual berhasil, gateway kembali aktif. OpenClaw versi terbaru: 2026.2.26.

## Technical Details

### lib/openclaw/
- \`client.ts\` - Typed wrapper untuk agents/subagents, files, cron, heartbeat endpoints
- \`errors.ts\` - OpenClawApiError + normalization helper
- Timeout + retry policy (default max 1 retry + exponential backoff)

### Docs
- \`docs/agent-control-plan.md\` - Research + spec
- \`docs/agent-control-tasks.md\` - Execution checklist

## Preferensi Workflow User

- Kanban board adalah source of truth eksekusi (bukan checklist docs langsung).
- Flow final disepakati: \`Planning -> Backlog -> In Progress -> Review -> (Done/Backlog)\`.
- Hanya user yang boleh memindahkan task ke \`Done\`.
- Komentar review harus masuk thread/history task.
- Saat user kasih feedback di Review, task balik ke Backlog + needs rework.
- Setiap diskusi rencana kerja baru dengan user harus diringkas jadi task dan dimasukkan ke kolom Planning Kanban.
- Saat cek status task, harus baca merged board state (API \`/api/control-center/tasks\` atau gabungan \`tasks-custom.json\` + \`tasks-board-state.json\`), jangan hanya file base task.
- Semua pekerjaan implementasi harus punya card Kanban (buat card dulu kalau belum ada), lalu statusnya wajib di-update sampai Review.
`;
  }, [selectedFile]);

  const filteredDaily = useMemo(() => {
    return daily.filter((item) => {
      const [year, month] = item.date.split("-");
      const matchMonth = filterMonth === "all" || month === filterMonth.padStart(2, "0");
      const matchYear = filterYear === "all" || year === filterYear;
      const matchKeyword =
        !filterKeyword.trim() ||
        item.date.toLowerCase().includes(filterKeyword.toLowerCase()) ||
        item.preview.toLowerCase().includes(filterKeyword.toLowerCase());
      return matchMonth && matchYear && matchKeyword;
    });
  }, [daily, filterMonth, filterYear, filterKeyword]);

  const availableYears = useMemo(() => {
    const years = new Set(daily.map((item) => item.date.split("-")[0]));
    return ["all", ...Array.from(years).sort().reverse()];
  }, [daily]);

  const availableMonths = useMemo(() => {
    if (filterYear === "all") {
      const months = new Set(daily.map((item) => item.date.split("-")[1]));
      return ["all", ...Array.from(months).sort()];
    }
    const months = new Set(
      daily.filter((item) => item.date.startsWith(filterYear)).map((item) => item.date.split("-")[1])
    );
    return ["all", ...Array.from(months).sort()];
  }, [daily, filterYear]);

  const selectedMeta = useMemo(() => daily.find((item) => item.file === selectedFile), [daily, selectedFile]);

  const groupedDaily = useMemo(() => {
    const groups: Record<string, DailyItem[]> = {};
    filteredDaily.forEach((item) => {
      const [year, month] = item.date.split("-");
      // Create a date object to get the localized month name
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      const monthName = date.toLocaleString('en-US', { month: 'long' });
      const label = `${monthName} ${year}`;
      if (!groups[label]) groups[label] = [];
      groups[label].push(item);
    });
    return groups;
  }, [filteredDaily]);

  return (
    <main className="flex h-full w-full flex-col gap-4 overflow-hidden">
      <div className="flex flex-col gap-1 mb-2">
        <h1 className="text-2xl font-manrope font-medium text-white">Memory</h1>
        <p className="text-white/50 font-ibm-plex-mono text-sm uppercase tracking-widest">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        </p>
      </div>

      {loading && <div className="rounded-xl border border-white/10 bg-[#151618] p-4 text-white/70">Loading memory…</div>}
      {error && <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 p-4 text-rose-200">{error}</div>}

      {!loading && !error && (
        <div className="flex h-full w-full min-h-0 items-start gap-[10px]">
          <aside className="flex flex-[1] flex-col gap-[10px] h-full overflow-y-auto pr-1">
            {/* Long Term Card */}
            <section className="flex flex-col rounded-[14px] border border-[rgba(255,255,255,0.1)] bg-[#151618] p-[4px]">
              <div className="flex items-center p-[16px]">
                <h2 className="font-manrope text-[16px] font-normal text-white capitalize leading-[normal]">Long Term</h2>
              </div>
              <article className="flex w-full shrink-0 flex-col items-start justify-center gap-[4px] rounded-[10px] bg-[rgba(0,166,244,0.1)] p-[12px]">
                <div className="flex w-full shrink-0 items-center justify-between">
                  <div className="flex items-center gap-[4px] font-ibm-plex-mono text-[10px] uppercase text-[rgba(255,255,255,0.5)]">
                    <span>MAIN AGENT</span>
                    <span>·</span>
                    <span>12h AGO</span>
                  </div>
                  <span className="flex h-[16px] items-center justify-center rounded-[20px] bg-[rgba(0,166,244,0.1)] px-[6px] font-ibm-plex-mono text-[10px] uppercase text-[#00a6f4]">
                    DEFAULT
                  </span>
                </div>
                <h3 className="w-full shrink-0 overflow-hidden text-ellipsis font-manrope text-[14px] font-normal text-white">MEMORY.md</h3>
                <p className="w-full shrink-0 overflow-hidden text-ellipsis font-manrope text-[10px] font-normal text-[rgba(255,255,255,0.5)] line-clamp-2">
                  {longTerm?.replace(/\n+/g, " ") || "MEMORY.md belum ada konten."}
                </p>
              </article>
            </section>

            {/* Daily Memory Section */}
            <section className="flex flex-col rounded-[14px] border border-[rgba(255,255,255,0.1)] bg-[#151618] p-[4px]">
              <div className="flex w-full shrink-0 items-center p-[16px]">
                <h2 className="font-manrope text-[16px] font-normal text-white capitalize leading-[normal]">Daily Memory</h2>
              </div>

              <div className="flex w-full shrink-0 items-center gap-[4px]">
                <div className="flex flex-[1_0_0] items-center gap-[10px] rounded-[10px] bg-[#111214] px-[16px] py-[10px] h-[40px] min-h-px min-w-px">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/50 shrink-0"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                  <input
                    type="text"
                    value={filterKeyword}
                    onChange={(e) => setFilterKeyword(e.target.value)}
                    placeholder="Search memory..."
                    className="w-full bg-transparent font-manrope text-[14px] leading-[normal] text-white outline-none placeholder:text-[rgba(255,255,255,0.5)] shrink-0"
                  />
                </div>
                <button className="flex h-[40px] shrink-0 items-center justify-center gap-[10px] rounded-[10px] bg-[#111214] px-[12px] py-[10px] text-white transition duration-200 hover:bg-[rgba(255,255,255,0.05)]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" /><path d="M8 14h.01" /><path d="M12 14h.01" /><path d="M16 14h.01" /><path d="M8 18h.01" /><path d="M12 18h.01" /><path d="M16 18h.01" /></svg>
                </button>
              </div>
            </section>

            {/* Grouped Daily Memory List */}
            {Object.keys(groupedDaily).length === 0 && (
              <div className="rounded-[10px] bg-[#111214] p-4 text-center text-[14px] font-manrope text-[rgba(255,255,255,0.5)]">
                No daily memory files match the filters.
              </div>
            )}
            {Object.entries(groupedDaily).map(([monthLabel, items]) => (
              <div key={monthLabel} className="flex flex-col items-start overflow-clip rounded-[14px] border border-[rgba(255,255,255,0.1)] bg-[#151618] p-[4px] relative">
                <div className="flex w-full shrink-0 items-center justify-between p-[16px] relative">
                  <h3 className="font-manrope text-[16px] font-normal leading-[normal] capitalize text-white whitespace-nowrap">{monthLabel}</h3>
                  <span className="flex h-[16px] shrink-0 items-center justify-center rounded-[20px] bg-[rgba(0,166,244,0.1)] px-[6px] font-ibm-plex-mono text-[10px] uppercase leading-[normal] text-[#00a6f4]">
                    {String(items.length).padStart(2, '0')}
                  </span>
                </div>
                <div className="flex w-full shrink-0 flex-col gap-[4px] items-start rounded-[10px] bg-[#111214] p-[4px] relative">
                  {items.map((item) => (
                    <article
                      key={item.file}
                      onClick={() => setSelectedFile(item.file)}
                      className={`flex w-full cursor-pointer flex-col gap-[10px] items-start justify-center rounded-[8px] p-[12px] transition duration-200 shrink-0 relative ${selectedFile === item.file ? "bg-[#151618] border border-[rgba(255,255,255,0.05)]" : "bg-[#151618] border border-transparent hover:border-[rgba(255,255,255,0.05)]"
                        }`}
                    >
                      <div className="flex w-full shrink-0 items-center justify-between relative">
                        <p className="font-ibm-plex-mono text-[10px] uppercase leading-[normal] text-[rgba(255,255,255,0.5)] whitespace-nowrap shrink-0">
                          memory/
                        </p>
                        <span className="flex h-[16px] shrink-0 items-center justify-center rounded-[20px] bg-[rgba(0,201,80,0.1)] px-[6px] font-ibm-plex-mono text-[10px] uppercase leading-[normal] text-[#00c950]">
                          Daily
                        </span>
                      </div>
                      <p className="w-full shrink-0 overflow-hidden text-ellipsis font-manrope text-[14px] font-normal leading-[normal] text-white">
                        {item.date}.md
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </aside>

          {/* Main Detail View */}
          <article className="flex h-full w-full flex-[2] min-h-0 min-w-px flex-col rounded-[14px] border border-[rgba(255,255,255,0.1)] bg-[#151618] p-[4px] overflow-hidden">
            <div className="flex w-full shrink-0 items-center justify-between p-[16px]">
              <h2 className="font-manrope text-[16px] font-normal leading-[normal] lowercase text-white">
                {selectedMeta ? `${selectedMeta.date}.md` : "Pilih dokumen"}
              </h2>
              <span className="flex h-[16px] shrink-0 items-center justify-center rounded-[20px] bg-[rgba(0,201,80,0.1)] px-[6px] font-ibm-plex-mono text-[10px] uppercase leading-[normal] text-[#00c950]">
                01
              </span>
            </div>

            <div className="flex flex-1 flex-col rounded-[10px] bg-[#111214] p-[4px] min-h-px min-w-px">
              {/* Detailed Content */}
              <div className="flex flex-1 flex-col overflow-y-auto w-full gap-[10px] rounded-[8px] bg-[#151618] p-[8px]">
                <div className="flex flex-col gap-[4px]">
                  {selectedFile ? (
                    <>
                      <h3 className="font-manrope text-[14px] font-normal leading-[normal] text-white">
                        {selectedMeta?.preview?.replace("...", "")}
                      </h3>
                      <div className="font-manrope w-full shrink-0 flex flex-col gap-[10px] mt-2">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h1: ({ ...props }) => <h1 className="text-white text-[16px] font-semibold mt-4 mb-2" {...props} />,
                            h2: ({ ...props }) => <h2 className="text-white text-[14px] font-semibold mt-3 mb-1" {...props} />,
                            h3: ({ ...props }) => <h3 className="text-white text-[13px] font-medium mt-2" {...props} />,
                            p: ({ ...props }) => <p className="text-[rgba(255,255,255,0.7)] text-[12px] leading-[1.8]" {...props} />,
                            ul: ({ ...props }) => <ul className="list-disc ml-[18px] text-[rgba(255,255,255,0.7)] text-[12px] leading-[1.8] flex flex-col gap-1" {...props} />,
                            ol: ({ ...props }) => <ol className="list-decimal ml-[18px] text-[rgba(255,255,255,0.7)] text-[12px] leading-[1.8] flex flex-col gap-1" {...props} />,
                            li: ({ ...props }) => <li className="pl-1" {...props} />,
                            strong: ({ ...props }) => <strong className="font-semibold text-white" {...props} />,
                            code: ({ ...props }) => <code className="bg-[#111214] px-1.5 py-0.5 rounded-[4px] font-ibm-plex-mono text-[11px] text-[#00a6f4]" {...props} />,
                          }}
                        >
                          {selectedContent}
                        </ReactMarkdown>
                      </div>
                    </>
                  ) : (
                    <p className="font-manrope text-[12px] font-normal text-[rgba(255,255,255,0.5)]">
                      Pilih daily memory di panel kiri.
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
