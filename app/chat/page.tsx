"use client";

import { useRef, useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { ChatUsersCard } from "@/components/ui/ChatUsers";
import { ChatCard } from "@/components/ui/ChatAgent";
import { Sidebar } from "@/components/Sidebar";
import { TextEditor } from "@/components/ui/TextEditor";
import { getModelMeta } from "@/lib/model-meta";

type ChatMessage = {
  id: number;
  sender: "user" | "agent";
  content: string;
  timestamp: number;
  modelId?: string;
  usageLabel?: string;
};

const INITIAL_MESSAGE_TIMESTAMP = Date.now() - 60000 * 5;
const AGENT_DISPLAY_NAME = "Marsha Lenathea👾";

function getUsageAwareBadgeClass(baseClass: string, usageLabel?: string): string {
  const pct = Number((usageLabel || "").match(/^(\d{1,3})%/)?.[1] || "");
  if (!Number.isFinite(pct)) return baseClass;

  if (pct >= 90) return "text-rose-300";
  if (pct >= 70) return "text-amber-300";
  return baseClass;
}

function renderInlineDiscordMarkdown(text: string) {
  const tokenRegex = /(\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|`[^`]+`|\*[^*]+\*|\[[^\]]+\]\((https?:\/\/[^\s)]+)\)|\|\|[^|]+\|\|)/g;
  const parts = text.split(tokenRegex).filter((p) => p !== "");

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
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const [latestAgentModelId, setLatestAgentModelId] = useState<string>("openclaw");
  const [latestUsageLabel, setLatestUsageLabel] = useState<string>("");
  const [pendingAgentTs, setPendingAgentTs] = useState<number | null>(null);
  const pendingAgentTsRef = useRef<number | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: 1, sender: "user", content: "Test Message", timestamp: INITIAL_MESSAGE_TIMESTAMP },
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const waitForAgentReply = (sessionKey: string, afterTs: number) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource(
      `/api/openclaw/stream?sessionKey=${encodeURIComponent(sessionKey)}&after=${afterTs}`
    );
    eventSourceRef.current = es;

    let resolved = false;
    const timeout = setTimeout(() => {
      if (resolved) return;
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
          content: "Masih diproses. Coba kirim lagi sebentar, atau cek log OpenClaw untuk progress.",
          timestamp: Date.now(),
        },
      ]);
    }, 90000);

    es.addEventListener("message", (event) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);

      try {
        const payload = JSON.parse((event as MessageEvent).data) as { text?: string; timestamp?: number; model?: string; usageLabel?: string };
        const text = payload?.text || "(No reply text)";
        const modelId = payload?.model;
        const usageLabel = payload?.usageLabel;
        if (modelId) {
          setLatestAgentModelId(modelId);
        }
        if (usageLabel) {
          setLatestUsageLabel(usageLabel);
        }

        const messageTs = pendingAgentTsRef.current || payload?.timestamp || Date.now();

        setChatMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            sender: "agent",
            content: text,
            timestamp: messageTs,
            modelId,
            usageLabel,
          },
        ]);
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
      if (resolved) return;
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

      <div className="flex flex-1 flex-col h-screen">
        <div className="flex p-6 bg-surface-card border-b border-border shrink-0">
          <h1>Topbar</h1>
        </div>
        <div className="flex flex-col p-6 w-full h-full overflow-hidden">
          <div className="flex-1 overflow-y-auto flex flex-col gap-1 w-full pr-2 pb-4">
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
          <div className="w-full flex justify-center">
            <div className="flex flex-col gap-2.5 w-full max-w-5xl">
              <TextEditor onSubmit={handleSendMessage} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
