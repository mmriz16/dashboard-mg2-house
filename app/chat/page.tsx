"use client";

import type { CSSProperties } from "react";
import { useRef, useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { ChatUsersCard } from "@/components/ui/ChatUsers";
import { ChatCard } from "@/components/ui/ChatAgent";
import { Sidebar } from "@/components/Sidebar";
import { TextEditor } from "@/components/ui/TextEditor";
import { getModelMeta } from "@/lib/model-meta";
import { Topbar } from "@/components/Topbar";

type ChatMessage = {
  id: number;
  sender: "user" | "agent";
  content: string;
  timestamp: number;
  modelId?: string;
  usageLabel?: string;
};

const CHAT_CACHE_KEY = "mg2_chat_messages";

const INITIAL_MESSAGE_TIMESTAMP = Date.now() - 60000 * 5;
const AGENT_DISPLAY_NAME = "Marsha Lenathea\u{1F47E}";
const STAR_COLORS = ["#dbeafe", "#bfdbfe", "#93c5fd", "#c7d2fe", "#ddd6fe", "#c4b5fd", "#a5b4fc"];

const noise = (seed: number) => {
  const v = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return v - Math.floor(v);
};

const STAR_PARTICLES = Array.from({ length: 96 }, (_, i) => {
  const x = 3 + noise(i + 1) * 94;
  const y = 4 + noise(i * 2.17 + 13) * 92;
  const s = 1.0 + noise(i * 3.11 + 7) * 1.9;
  const o = 0.16 + noise(i * 1.73 + 19) * 0.42;
  const d = noise(i * 4.03 + 23) * 3.4;
  const c = STAR_COLORS[Math.floor(noise(i * 5.71 + 31) * STAR_COLORS.length) % STAR_COLORS.length];
  return { x, y, s, o, d, c };
});

function extractOfficialResetRemaining(text: string): { h: number; m: number } | undefined {
  const compact = text.replace(/\s+/g, " ");
  const m = compact.match(/Usage\s*5\s*jam:[^()]*\((?:[^0-9]*)(\d+)\s*[jh]\s*(\d+)\s*m\)/i);
  if (!m) return undefined;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return undefined;
  return { h, m: min };
}

function mergeUsageLabelWithOfficialReset(baseUsageLabel: string | undefined, text: string): string | undefined {
  if (!baseUsageLabel) return undefined;
  const pct = Number((baseUsageLabel.match(/^(\d{1,3})%/) || [])[1]);
  if (!Number.isFinite(pct)) return baseUsageLabel;

  const remaining = extractOfficialResetRemaining(text);
  if (!remaining) return baseUsageLabel;

  const resetAtMs = Date.now() + (remaining.h * 60 + remaining.m) * 60000;
  const resetAt = new Date(resetAtMs).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Jakarta",
  });

  return `${pct}% - ${remaining.h}h ${remaining.m}m (${resetAt})`;
}

function getUsageAwareBadgeClass(baseClass: string, usageLabel?: string): string {
  const pct = Number((usageLabel || "").match(/^(\d{1,3})%/)?.[1] || "");
  if (!Number.isFinite(pct)) return baseClass;

  if (pct >= 90) return "text-rose-300";
  if (pct >= 70) return "text-amber-300";
  return baseClass;
}

function renderInlineDiscordMarkdown(text: string) {
  const tokenRegex = /(\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|`[^`]+`|\*[^*]+\*|\[[^\]]+\]\((https?:\/\/[^\s)]+)\)|\|\|[^|]+\|\|)/g;
  const parts = text
    .split(tokenRegex)
    .filter((p): p is string => typeof p === "string" && p !== "");

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`b-${index}`}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("__") && part.endsWith("__")) {
      return <u key={`u-${index}`}>{part.slice(2, -2)}</u>;
    }
    if (part.startsWith("~~") && part.endsWith("~~")) {
      return <s key={`s-${index}`}>{part.slice(2, -2)}</s>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={`c-${index}`} className="rounded bg-white/10 px-1 py-0.5 text-[0.9em]">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("||") && part.endsWith("||")) {
      return (
        <span key={`sp-${index}`} className="rounded bg-white/10 px-1 text-white/20 hover:text-white transition-colors">
          {part.slice(2, -2)}
        </span>
      );
    }
    if (part.startsWith("[") && part.includes("](") && part.endsWith(")")) {
      const match = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
      if (match) {
        return (
          <a
            key={`l-${index}`}
            href={match[2]}
            target="_blank"
            rel="noreferrer"
            className="text-sky-300 underline underline-offset-2"
          >
            {match[1]}
          </a>
        );
      }
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={`i-${index}`}>{part.slice(1, -1)}</em>;
    }

    return <span key={`t-${index}`}>{part}</span>;
  });
}

function renderAssistantText(text: string) {
  const blocks = text.split(/```([\s\S]*?)```/g);

  return blocks.map((block, blockIndex) => {
    const isCodeBlock = blockIndex % 2 === 1;
    if (isCodeBlock) {
      return (
        <pre key={`pre-${blockIndex}`} className="my-2 overflow-x-auto rounded-md bg-black/40 p-3 text-xs">
          <code>{block}</code>
        </pre>
      );
    }

    const lines = block.split("\n");
    const rendered: React.ReactNode[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      const ulMatch = line.match(/^(\s*)[-*]\s+(\[[ xX]\]\s+)?(.+)$/);
      const olMatch = line.match(/^(\s*)(\d+)\.\s+(.+)$/);

      if (ulMatch || olMatch) {
        const isOrdered = Boolean(olMatch);
        const startIndent = (ulMatch ? ulMatch[1] : olMatch?.[1] || "").length;

        const items: Array<{ indent: number; content: string; checked?: boolean }> = [];
        let j = i;
        while (j < lines.length) {
          const mUl = lines[j].match(/^(\s*)[-*]\s+(\[[ xX]\]\s+)?(.+)$/);
          const mOl = lines[j].match(/^(\s*)(\d+)\.\s+(.+)$/);
          const m = isOrdered ? mOl : mUl;
          if (!m) break;

          const indent = (m[1] || "").length;
          if (indent < startIndent) break;

          if (isOrdered && mOl) {
            items.push({ indent, content: mOl[3] });
          } else if (mUl) {
            const checkbox = mUl[2]?.trim();
            items.push({
              indent,
              content: mUl[3],
              checked: checkbox ? checkbox.toLowerCase() === "[x]" : undefined,
            });
          }
          j++;
        }

        const ListTag = (isOrdered ? "ol" : "ul") as "ol" | "ul";
        rendered.push(
          <ListTag key={`list-${blockIndex}-${i}`} className={`my-1 ml-5 ${isOrdered ? "list-decimal" : "list-disc"}`}>
            {items.map((it, idx) => (
              <li key={`li-${blockIndex}-${i}-${idx}`} style={{ marginLeft: `${Math.max(0, it.indent - startIndent) * 0.5}rem` }}>
                {typeof it.checked === "boolean" ? (
                  <span className={it.checked ? "text-emerald-300" : "text-white/60"}>{it.checked ? "☑" : "☐"} </span>
                ) : null}
                {renderInlineDiscordMarkdown(it.content)}
              </li>
            ))}
          </ListTag>
        );

        i = j - 1;
        continue;
      }

      if (line.startsWith("> ")) {
        rendered.push(
          <blockquote key={`q-${blockIndex}-${i}`} className="my-1 border-l-2 border-white/30 pl-3 text-white/80">
            {renderInlineDiscordMarkdown(line.slice(2))}
          </blockquote>
        );
        continue;
      }

      rendered.push(
        <span key={`line-${blockIndex}-${i}`}>
          {renderInlineDiscordMarkdown(line)}
          {i < lines.length - 1 && <br />}
        </span>
      );
    }

    return <span key={`blk-${blockIndex}`}>{rendered}</span>;
  });
}

function getOrCreateSessionKey() {
  const key = "openclaw_webchat_session_key";
  const existing = typeof window !== "undefined" ? localStorage.getItem(key) : null;
  if (existing) return existing;

  const generated = `hook:webchat:${crypto.randomUUID()}`;
  localStorage.setItem(key, generated);
  return generated;
}

export default function DashboardPage() {
  const { isPending } = authClient.useSession();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const [latestAgentModelId, setLatestAgentModelId] = useState<string>("openclaw");
  const [latestUsageLabel, setLatestUsageLabel] = useState<string>("");
  const [pendingAgentTs, setPendingAgentTs] = useState<number | null>(null);
  const pendingAgentTsRef = useRef<number | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const streamTimerRef = useRef<NodeJS.Timeout | null>(null);
  const streamSeqRef = useRef(0);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [starDrift, setStarDrift] = useState({ x: 0, y: 0 });
  const [isGatewayOnline, setIsGatewayOnline] = useState(true);
  const [regionLabel, setRegionLabel] = useState("");
  const isEmptyState = chatMessages.length === 0 && !isAgentTyping;
  const REGION_CACHE_KEY = "mg2_region_label";

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    const el = messagesContainerRef.current;
    if (!el) {
      messagesEndRef.current?.scrollIntoView({ behavior });
      return;
    }
    el.scrollTo({ top: el.scrollHeight, behavior });
  };

  useEffect(() => {
    if (!shouldAutoScrollRef.current) return;
    scrollToBottom();
  }, [chatMessages]);

  const handleMessagesScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    shouldAutoScrollRef.current = distanceFromBottom < 120;
  };

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (streamTimerRef.current) {
        clearInterval(streamTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    try {
      const cachedRegion = localStorage.getItem(REGION_CACHE_KEY);
      if (cachedRegion?.trim()) {
        setRegionLabel(cachedRegion.trim());
      }

      const cachedMessages = localStorage.getItem(CHAT_CACHE_KEY);
      if (cachedMessages) {
        const parsed = JSON.parse(cachedMessages) as ChatMessage[];
        if (Array.isArray(parsed)) {
          setChatMessages(parsed);
        }
      }
    } catch {
      // ignore cache read error
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CHAT_CACHE_KEY, JSON.stringify(chatMessages));
    } catch {
      // ignore cache write error
    }
  }, [chatMessages]);

  useEffect(() => {
    let cancelled = false;

    const checkHealth = async () => {
      try {
        const r = await fetch("/api/openclaw/health", { cache: "no-store" });
        if (cancelled) return;
        setIsGatewayOnline(r.ok);
      } catch {
        if (!cancelled) setIsGatewayOnline(false);
      }
    };

    const checkLocation = async () => {
      try {
        if (typeof navigator !== "undefined" && navigator.geolocation) {
          const position = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 120000,
            })
          );

          const lat = position.coords.latitude;
          const lon = position.coords.longitude;

          const geo = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`,
            { cache: "no-store" }
          );

          if (geo.ok) {
            const data = (await geo.json()) as {
              address?: {
                city?: string;
                town?: string;
                village?: string;
                state?: string;
                country?: string;
              };
            };

            const city = data.address?.city || data.address?.town || data.address?.village;
            const state = data.address?.state;
            const country = data.address?.country;
            const label = [city, state, country].filter(Boolean).join(" • ").toUpperCase();

            if (!cancelled && label) {
              setRegionLabel(label);
              try {
                localStorage.setItem(REGION_CACHE_KEY, label);
              } catch {
                // ignore cache write error
              }
              return;
            }
          }
        }
      } catch {
        // fallback below
      }

      try {
        const r = await fetch("/api/openclaw/location", { cache: "no-store" });
        const data = (await r.json()) as { regionLabel?: string };
        if (cancelled) return;
        if (typeof data?.regionLabel === "string" && data.regionLabel.trim()) {
          const normalized = data.regionLabel.trim();
          setRegionLabel(normalized);
          try {
            localStorage.setItem(REGION_CACHE_KEY, normalized);
          } catch {
            // ignore cache write error
          }
        }
      } catch {
        // keep fallback label
      }
    };

    checkHealth();
    checkLocation();
    const healthId = setInterval(checkHealth, 15000);
    const locationId = setInterval(checkLocation, 300000);

    return () => {
      cancelled = true;
      clearInterval(healthId);
      clearInterval(locationId);
    };
  }, []);

  const streamAssistantText = (params: {
    text: string;
    timestamp: number;
    modelId?: string;
    usageLabel?: string;
  }) => {
    if (streamTimerRef.current) {
      clearInterval(streamTimerRef.current);
    }

    const { text, timestamp, modelId, usageLabel } = params;
    const messageId = Date.now();

    setChatMessages((prev) => [
      ...prev,
      {
        id: messageId,
        sender: "agent",
        content: "",
        timestamp,
        modelId,
        usageLabel,
      },
    ]);

    const chunks = text.match(/\S+\s*|\s+/g) || [text];
    let i = 0;

    // word-by-word streaming
    const minDurationMs = 450;
    const targetWps = 9.5; // words/chunks per second
    const naturalDuration = Math.ceil((chunks.length / targetWps) * 1000);
    const totalDuration = Math.max(minDurationMs, naturalDuration);
    const tickMs = Math.max(24, Math.floor(totalDuration / Math.max(1, chunks.length)));

    streamTimerRef.current = setInterval(() => {
      i = Math.min(chunks.length, i + 1);
      const next = chunks.slice(0, i).join("");

      setChatMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
              ...m,
              content: next,
            }
            : m
        )
      );

      if (i >= chunks.length && streamTimerRef.current) {
        clearInterval(streamTimerRef.current);
        streamTimerRef.current = null;
      }
    }, tickMs);
  };

  const waitForAgentReply = (sessionKey: string, afterTs: number) => {
    const streamSeq = streamSeqRef.current + 1;
    streamSeqRef.current = streamSeq;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource(
      `/api/openclaw/stream?sessionKey=${encodeURIComponent(sessionKey)}&after=${afterTs}`
    );
    eventSourceRef.current = es;

    let resolved = false;
    const timeout = setTimeout(() => {
      if (resolved || streamSeq !== streamSeqRef.current) return;
      resolved = true;
      es.close();
      setIsAgentTyping(false);
      setPendingAgentTs(null);
      pendingAgentTsRef.current = null;
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          sender: "agent",
          content: "Prosesnya lebih lama dari biasanya. Kalau masih belum muncul, cek log OpenClaw ya.",
          timestamp: Date.now(),
        },
      ]);
    }, 180000);

    es.addEventListener("message", (event) => {
      if (resolved || streamSeq !== streamSeqRef.current) return;
      resolved = true;
      clearTimeout(timeout);

      try {
        const payload = JSON.parse((event as MessageEvent).data) as { text?: string; timestamp?: number; model?: string; usageLabel?: string };
        const text = payload?.text || "(No reply text)";
        const modelId = payload?.model;
        const usageLabel = mergeUsageLabelWithOfficialReset(payload?.usageLabel, text);
        if (modelId) {
          setLatestAgentModelId(modelId);
        }
        if (usageLabel) {
          setLatestUsageLabel(usageLabel);
        }

        const messageTs = pendingAgentTsRef.current || payload?.timestamp || Date.now();

        streamAssistantText({
          text,
          timestamp: messageTs,
          modelId,
          usageLabel,
        });
      } catch {
        setChatMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            sender: "agent",
            content: "Balasan diterima, tapi format tidak terbaca.",
            timestamp: Date.now(),
          },
        ]);
      }

      setIsAgentTyping(false);
      setPendingAgentTs(null);
      pendingAgentTsRef.current = null;
      es.close();
    });

    es.addEventListener("error", () => {
      if (resolved || streamSeq !== streamSeqRef.current) return;
      resolved = true;
      clearTimeout(timeout);
      setIsAgentTyping(false);
      setPendingAgentTs(null);
      pendingAgentTsRef.current = null;
      es.close();
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          sender: "agent",
          content: "Gagal subscribe stream balasan agent.",
          timestamp: Date.now(),
        },
      ]);
    });
  };

  const handleSendMessage = async (content: string) => {
    const clean = content?.trim();
    if (!clean) return;

    if (streamTimerRef.current) {
      clearInterval(streamTimerRef.current);
      streamTimerRef.current = null;
    }

    shouldAutoScrollRef.current = true;
    const sentAt = Date.now();

    setChatMessages((prev) => [
      ...prev,
      { id: sentAt, sender: "user", content: clean, timestamp: sentAt },
    ]);

    const typingStartedAt = Date.now();
    pendingAgentTsRef.current = typingStartedAt;
    setPendingAgentTs(typingStartedAt);
    setIsAgentTyping(true);

    try {
      const sessionKey = getOrCreateSessionKey();

      const response = await fetch("/api/openclaw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: clean, sessionKey }),
      });

      const res = await response.json().catch(() => ({}));

      if (!response.ok || !res?.ok) {
        setIsAgentTyping(false);
        setPendingAgentTs(null);
        pendingAgentTsRef.current = null;
        setChatMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            sender: "agent",
            content: `Webhook error (${response.status})`,
            timestamp: Date.now(),
          },
        ]);
        return;
      }

      const serverAcceptedAt = typeof res?.acceptedAt === "number" ? res.acceptedAt : Date.now();
      // pakai timestamp server (bukan jam browser) supaya filter stream tidak miss reply
      waitForAgentReply(res.sessionKey || sessionKey, serverAcceptedAt - 5000);
    } catch (error) {
      console.error("Failed to fetch agent reply", error);
      setIsAgentTyping(false);
      setPendingAgentTs(null);
      pendingAgentTsRef.current = null;
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          sender: "agent",
          content: "Failed to connect ke OpenClaw.",
          timestamp: Date.now(),
        },
      ]);
    }
  };

  const handleEmptyMouseMove = (e: { currentTarget: HTMLDivElement; clientX: number; clientY: number }) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    setStarDrift({ x: nx * 10, y: ny * 10 });
  };

  const handleEmptyMouseLeave = () => {
    setStarDrift({ x: 0, y: 0 });
  };

  if (isPending) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white"></div>
          <p className="text-white/50 font-ibm-plex-mono text-xs uppercase tracking-widest">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-surface overflow-hidden">
      <Sidebar />

      <div className="flex flex-1 flex-col h-screen min-h-0">
        <Topbar
          title="Chat"
          subtitle="Real-time assistant conversation"
          regionLabel={regionLabel}
          systemOnline={isGatewayOnline}
          systemStatusLabel={isGatewayOnline ? "System Online" : "System Offline"}
        />
        <div className="flex flex-col p-6 w-full h-full min-h-0 overflow-hidden relative">
          {isEmptyState ? (
            <div
              className="flex-1 relative flex items-center justify-center overflow-hidden"
              onMouseMove={handleEmptyMouseMove}
              onMouseLeave={handleEmptyMouseLeave}
            >
              <style jsx>{`
                @keyframes starFloat {
                  0%, 100% { transform: translate3d(0,0,0) scale(1); opacity: var(--o); }
                  50% { transform: translate3d(var(--dx), -8px, 0) scale(1.25); opacity: calc(var(--o) + 0.35); }
                }
                @keyframes starPulse {
                  0%,100% { filter: blur(0px) drop-shadow(0 0 0 rgba(147,197,253,0)); }
                  50% { filter: blur(0.2px) drop-shadow(0 0 8px rgba(167,139,250,0.7)); }
                }
                @keyframes shootingStar {
                  0% { transform: translate3d(-18vw, -10vh, 0) rotate(-18deg); opacity: 0; }
                  8% { opacity: 0.9; }
                  22% { opacity: 0; }
                  100% { transform: translate3d(50vw, 24vh, 0) rotate(-18deg); opacity: 0; }
                }
                @keyframes skyRotate {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}</style>

              <div
                className="pointer-events-none absolute inset-0 transition-transform duration-500"
                style={{ transform: `translate(${starDrift.x}px, ${starDrift.y}px)` }}
              >
                <div className="absolute -inset-[12%]" style={{ animation: "skyRotate 240s linear infinite", transformOrigin: "center center" }}>
                  {STAR_PARTICLES.map((p, i) => (
                    <span
                      key={`star-${i}`}
                      className="absolute rounded-full"
                      style={{
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        width: `${p.s}px`,
                        height: `${p.s}px`,
                        backgroundColor: p.c,
                        opacity: p.o,
                        boxShadow: `0 0 ${4 + p.s * 1.8}px ${p.c}`,
                        animation: `starFloat ${4 + (i % 5) * 0.75}s ease-in-out infinite, starPulse ${3.2 + (i % 4) * 0.6}s ease-in-out infinite`,
                        animationDelay: `-${p.d}s`,
                        "--o": p.o,
                        "--dx": `${(i % 2 === 0 ? 1 : -1) * (1 + (i % 3))}px`,
                      } as CSSProperties & Record<"--o" | "--dx", string | number>}
                    />
                  ))}
                </div>

                <div
                  className="absolute left-[8%] top-[18%] h-[1.5px] w-28 bg-gradient-to-r from-white/0 via-sky-200/90 to-white/0"
                  style={{ animation: "shootingStar 14s linear infinite", animationDelay: "1.8s" }}
                />
                <div
                  className="absolute left-[48%] top-[8%] h-[1.5px] w-24 bg-gradient-to-r from-white/0 via-indigo-200/90 to-white/0"
                  style={{ animation: "shootingStar 17s linear infinite", animationDelay: "7.3s" }}
                />
              </div>

              <div className="w-full max-w-5xl z-10">
                <TextEditor onSubmit={handleSendMessage} />
              </div>
            </div>
          ) : (
            <>
              <div
                ref={messagesContainerRef}
                onScroll={handleMessagesScroll}
                className="flex-1 min-h-0 overflow-y-auto w-full pr-2 pb-4"
              >
                <div className="min-h-full flex flex-col justify-end gap-1">
                  {chatMessages.map((msg, index) => {
                    let showTime = true;
                    if (index > 0) {
                      const prevMsg = chatMessages[index - 1];
                      const currentMinute = Math.floor(msg.timestamp / 60000);
                      const prevMinute = Math.floor(prevMsg.timestamp / 60000);
                      if (currentMinute === prevMinute && msg.sender === prevMsg.sender) {
                        showTime = false;
                      }
                    }

                    return (
                      <div key={msg.id} className="w-full flex justify-center">
                        <div className="flex flex-col gap-2.5 w-full max-w-5xl">
                          {msg.sender === "user" ? (
                            <ChatUsersCard timestamp={msg.timestamp} showTime={showTime}>
                              {msg.content}
                            </ChatUsersCard>
                          ) : (
                            (() => {
                              const meta = getModelMeta(msg.modelId || latestAgentModelId);
                              const usageLabel = msg.usageLabel || latestUsageLabel;
                              return (
                                <ChatCard
                                  name={AGENT_DISPLAY_NAME}
                                  timestamp={msg.timestamp}
                                  showTime={showTime}
                                  modelName={meta.displayName}
                                  modelLogo={meta.logoPath}
                                  usageClassName={getUsageAwareBadgeClass(meta.badgeClass, usageLabel)}
                                  modelUsageLabel={usageLabel}
                                >
                                  <div className="max-w-none break-words">{renderAssistantText(msg.content)}</div>
                                </ChatCard>
                              );
                            })()
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {isAgentTyping && (
                    <div className="w-full flex justify-center">
                      <div className="flex flex-col gap-2.5 w-full max-w-5xl">
                        {(() => {
                          const meta = getModelMeta(latestAgentModelId);
                          return (
                            <ChatCard
                              name={AGENT_DISPLAY_NAME}
                              timestamp={pendingAgentTs ?? INITIAL_MESSAGE_TIMESTAMP}
                              showTime
                              modelName={meta.displayName}
                              modelLogo={meta.logoPath}
                              usageClassName={getUsageAwareBadgeClass(meta.badgeClass, latestUsageLabel)}
                              modelUsageLabel={latestUsageLabel}
                            >
                              <div className="flex gap-1 items-center h-5">
                                <div className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                <div className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                <div className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce"></div>
                              </div>
                            </ChatCard>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              <div className="pointer-events-none absolute top-6 left-6 right-6 h-24 bg-gradient-to-b from-surface/95 via-surface/55 to-transparent" />
              <div className="pointer-events-none absolute bottom-[112px] left-6 right-6 h-24 bg-gradient-to-t from-surface/95 via-surface/55 to-transparent" />

              <div className="w-full flex justify-center">
                <div className="flex flex-col gap-2.5 w-full max-w-5xl">
                  <TextEditor onSubmit={handleSendMessage} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

