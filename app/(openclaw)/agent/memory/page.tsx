"use client";

import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type DailyItem = {
  file: string;
  date: string;
  updatedAt: string;
  preview: string;
};

type MemoryData = {
  longTerm: { file: string; content: string };
  daily: DailyItem[];
};

export default function AgentMemoryPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [longTerm, setLongTerm] = useState("");
  const [daily, setDaily] = useState<DailyItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [selectedContent, setSelectedContent] = useState<string>("");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [filterYear, setFilterYear] = useState<string>("all");
  const [filterKeyword, setFilterKeyword] = useState<string>("");

  useEffect(() => {
    async function fetchMemory() {
      try {
        setLoading(true);
        const res = await fetch("/api/control-center/memory");
        if (!res.ok) throw new Error("Failed to fetch memory");
        const data: MemoryData = await res.json();
        setLongTerm(data.longTerm.content);
        setDaily(data.daily);
        if (data.daily.length > 0) {
          setSelectedFile(data.daily[0].file);
        }
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchMemory();
  }, []);

  useEffect(() => {
    async function fetchFileContent() {
      if (!selectedFile) return;
      try {
        const res = await fetch(`/api/control-center/memory?file=${selectedFile}`);
        if (!res.ok) throw new Error("Failed to fetch file content");
        const data = await res.json();
        setSelectedContent(data.content);
      } catch {
        setSelectedContent("Failed to load content");
      }
    }
    fetchFileContent();
  }, [selectedFile]);



  const filteredDaily = useMemo(() => {
    return daily.filter((item) => {
      const [year, month] = item.date.split("-");
      const matchMonth =
        filterMonth === "all" || month === filterMonth.padStart(2, "0");
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
      daily
        .filter((item) => item.date.startsWith(filterYear))
        .map((item) => item.date.split("-")[1]),
    );
    return ["all", ...Array.from(months).sort()];
  }, [daily, filterYear]);

  const selectedMeta = useMemo(
    () => daily.find((item) => item.file === selectedFile),
    [daily, selectedFile],
  );

  const groupedDaily = useMemo(() => {
    const groups: Record<string, DailyItem[]> = {};
    filteredDaily.forEach((item) => {
      const [year, month] = item.date.split("-");
      // Create a date object to get the localized month name
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      const monthName = date.toLocaleString("en-US", { month: "long" });
      const label = `${monthName} ${year}`;
      if (!groups[label]) groups[label] = [];
      groups[label].push(item);
    });
    return groups;
  }, [filteredDaily]);

  return (
    <main className="flex h-full w-full flex-col gap-4 overflow-hidden p-6">
      <div className="flex flex-col gap-1 mb-2">
        <h1 className="text-2xl font-manrope font-medium text-white">Memory</h1>
        <p className="text-white/50 font-ibm-plex-mono text-sm uppercase tracking-widest">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        </p>
      </div>

      {loading && (
        <div className="rounded-xl border border-white/10 bg-surface-card p-4 text-white/70">
          Loading memory…
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 p-4 text-rose-200">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="flex h-full w-full min-h-0 items-start gap-2.5">
          <aside className="flex flex-1 flex-col gap-2.5 h-full overflow-y-auto pr-1">
            {/* Long Term Card */}
            <section className="flex flex-col rounded-[14px] border border-border bg-surface-card p-1">
              <div className="flex items-center p-4">
                <h2 className="font-manrope text-[16px] font-normal text-white capitalize leading-[normal]">
                  Long Term
                </h2>
              </div>
              <article className="flex w-full shrink-0 flex-col items-start justify-center gap-1 rounded-[10px] bg-[rgba(0,166,244,0.1)] p-[12px]">
                <div className="flex w-full shrink-0 items-center justify-between">
                  <div className="flex items-center gap-1 font-ibm-plex-mono text-[10px] uppercase text-muted">
                    <span>MAIN AGENT</span>
                    <span>·</span>
                    <span>LONG-TERM</span>
                  </div>
                  <span className="flex h-[16px] items-center justify-center rounded-[20px] bg-[rgba(0,166,244,0.1)] px-[6px] font-ibm-plex-mono text-[10px] uppercase text-[#00a6f4]">
                    PINNED
                  </span>
                </div>
                <h3 className="w-full shrink-0 overflow-hidden text-ellipsis font-manrope text-[14px] font-normal text-white">
                  MEMORY.md
                </h3>
                <p className="w-full shrink-0 overflow-hidden text-ellipsis font-manrope text-[10px] font-normal text-muted line-clamp-2">
                  {longTerm?.slice(0, 200).replace(/\n+/g, " ") ||
                    "MEMORY.md belum ada konten."}
                </p>
              </article>
            </section>

            {/* Daily Memory Section */}
            <section className="flex flex-col rounded-[14px] border border-border bg-surface-card p-1">
              <div className="flex w-full shrink-0 items-center p-4">
                <h2 className="font-manrope text-[16px] font-normal text-white capitalize leading-[normal]">
                  Daily Memory
                </h2>
              </div>

              <div className="flex w-full shrink-0 items-center gap-1 flex-wrap">
                <div className="flex flex-[1_0_0] min-w-[200px] items-center gap-2.5 rounded-[10px] bg-[#111214] px-[16px] py-[10px] h-[40px]">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-white/50 shrink-0"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                  <input
                    type="text"
                    value={filterKeyword}
                    onChange={(e) => setFilterKeyword(e.target.value)}
                    placeholder="Search..."
                    className="w-full bg-transparent font-manrope text-[14px] leading-[normal] text-white outline-none placeholder:text-muted shrink-0"
                  />
                </div>
                <select
                  value={filterYear}
                  onChange={(e) => {
                    setFilterYear(e.target.value);
                    setFilterMonth("all");
                  }}
                  className="flex h-[40px] shrink-0 items-center rounded-[10px] bg-[#111214] px-[12px] py-[10px] text-white font-manrope text-[14px] outline-none border border-transparent focus:border-white/20"
                >
                  {availableYears.map((year) => (
                    <option key={year} value={year} className="bg-[#111214]">
                      {year === "all" ? "All Years" : year}
                    </option>
                  ))}
                </select>
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="flex h-[40px] shrink-0 items-center rounded-[10px] bg-[#111214] px-[12px] py-[10px] text-white font-manrope text-[14px] outline-none border border-transparent focus:border-white/20"
                >
                  {availableMonths.map((month) => (
                    <option key={month} value={month} className="bg-[#111214]">
                      {month === "all"
                        ? "All Months"
                        : new Date(2026, parseInt(month) - 1, 1).toLocaleString("en-US", { month: "short" })}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            {/* Grouped Daily Memory List */}
            {Object.keys(groupedDaily).length === 0 && (
              <div className="rounded-[10px] bg-[#111214] p-4 text-center text-[14px] font-manrope text-muted">
                No daily memory files match the filters.
              </div>
            )}
            {Object.entries(groupedDaily).map(([monthLabel, items]) => (
              <div
                key={monthLabel}
                className="flex flex-col items-start overflow-clip rounded-[14px] border border-border bg-surface-card p-1 relative"
              >
                <div className="flex w-full shrink-0 items-center justify-between p-4 relative">
                  <h3 className="font-manrope text-[16px] font-normal leading-[normal] capitalize text-white whitespace-nowrap">
                    {monthLabel}
                  </h3>
                  <span className="flex h-[16px] shrink-0 items-center justify-center rounded-[20px] bg-[rgba(0,166,244,0.1)] px-[6px] font-ibm-plex-mono text-[10px] uppercase leading-[normal] text-[#00a6f4]">
                    {String(items.length).padStart(2, "0")}
                  </span>
                </div>
                <div className="flex w-full shrink-0 flex-col gap-1 items-start rounded-[10px] bg-[#111214] p-1 relative">
                  {items.map((item) => (
                    <article
                      key={item.file}
                      onClick={() => setSelectedFile(item.file)}
                      className={`flex w-full cursor-pointer flex-col gap-2.5 items-start justify-center rounded-[8px] p-[12px] transition duration-200 shrink-0 relative ${
                        selectedFile === item.file
                          ? "bg-surface-card border border-[rgba(255,255,255,0.05)]"
                          : "bg-surface-card border border-transparent hover:border-[rgba(255,255,255,0.05)]"
                      }`}
                    >
                      <div className="flex w-full shrink-0 items-center justify-between relative">
                        <p className="font-ibm-plex-mono text-[10px] uppercase leading-[normal] text-muted whitespace-nowrap shrink-0">
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
          <article className="flex h-full w-full flex-2 min-h-0 min-w-px flex-col rounded-[14px] border border-border bg-surface-card p-1 overflow-hidden">
            <div className="flex w-full shrink-0 items-center justify-between p-4">
              <h2 className="font-manrope text-[16px] font-normal leading-[normal] lowercase text-white">
                {selectedMeta ? `${selectedMeta.date}.md` : "Pilih dokumen"}
              </h2>
              <span className="flex h-[16px] shrink-0 items-center justify-center rounded-[20px] bg-[rgba(0,201,80,0.1)] px-[6px] font-ibm-plex-mono text-[10px] uppercase leading-[normal] text-[#00c950]">
                01
              </span>
            </div>

            <div className="flex flex-1 flex-col rounded-[10px] bg-[#111214] p-1 min-h-px min-w-px">
              {/* Detailed Content */}
              <div className="flex flex-1 flex-col overflow-y-auto w-full gap-2.5 rounded-[8px] bg-surface-card p-3">
                <div className="flex flex-col gap-1">
                  {selectedFile ? (
                    loading ? (
                      <p className="font-manrope text-[12px] font-normal text-muted">
                        Loading content...
                      </p>
                    ) : (
                      <>
                        <h3 className="font-manrope text-[14px] font-normal leading-[normal] text-white">
                          {selectedMeta?.preview?.replace("...", "") || selectedMeta?.date}
                        </h3>
                        <div className="font-manrope w-full shrink-0 flex flex-col gap-2.5 mt-2">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              h1: ({ ...props }) => (
                                <h1
                                  className="text-white text-[16px] font-semibold mt-4 mb-2"
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
                                  className="text-[rgba(255,255,255,0.7)] text-[12px] leading-[1.8]"
                                  {...props}
                                />
                              ),
                              ul: ({ ...props }) => (
                                <ul
                                  className="list-disc ml-[18px] text-[rgba(255,255,255,0.7)] text-[12px] leading-[1.8] flex flex-col gap-1"
                                  {...props}
                                />
                              ),
                              ol: ({ ...props }) => (
                                <ol
                                  className="list-decimal ml-[18px] text-[rgba(255,255,255,0.7)] text-[12px] leading-[1.8] flex flex-col gap-1"
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
                            }}
                          >
                            {selectedContent}
                          </ReactMarkdown>
                        </div>
                      </>
                    )
                  ) : (
                    <p className="font-manrope text-[12px] font-normal text-muted">
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
