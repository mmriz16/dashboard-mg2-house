"use client";

import { useRef, useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { ChatUsersCard } from "@/components/ui/ChatUsers";
import { ChatCard } from "@/components/ui/ChatAgent";
import { Sidebar } from "@/components/Sidebar";
import { TextEditor } from "@/components/ui/TextEditor";

type ChatMessage = {
  id: number;
  sender: "user" | "agent";
  content: string;
  timestamp: number;
};

const INITIAL_MESSAGE_TIMESTAMP = Date.now() - 60000 * 5;

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
  const [agentModelName, setAgentModelName] = useState("OpenClaw");
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
        const payload = JSON.parse((event as MessageEvent).data) as { text?: string; timestamp?: number; model?: string };
        const text = payload?.text || "(No reply text)";
        if (payload?.model) {
          setAgentModelName(payload.model);
        }

        setChatMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            sender: "agent",
            content: text,
            timestamp: payload?.timestamp || Date.now(),
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
      es.close();
    });

    es.addEventListener("error", () => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      setIsAgentTyping(false);
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
                      <ChatCard timestamp={msg.timestamp} showTime={showTime} modelName={agentModelName}>
                        <div className="max-w-none break-words whitespace-pre-wrap">{msg.content}</div>
                      </ChatCard>
                    )}
                  </div>
                </div>
              );
            })}

            {isAgentTyping && (
              <div className="w-full flex justify-center">
                <div className="flex flex-col gap-2.5 w-full max-w-5xl">
                  <ChatCard name="OpenClaw Agent" showTime={false} modelName={agentModelName}>
                    <div className="flex gap-1 items-center h-5">
                      <div className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce"></div>
                    </div>
                  </ChatCard>
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
