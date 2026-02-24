"use client";

import { useEffect, useMemo, useState } from "react";
import { MenuItem } from "@/components/MenuItem";
import { ProfileCard } from "@/components/ProfileCard";
import { MG2Icon } from "@/components/ui/MG2Icon";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface SidebarProps {
  onLogout?: () => void;
}

type Conversation = {
  key: string;
  title: string;
  pinned?: boolean;
  lastTimestamp: number;
};

function toGroupLabel(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startYesterday = startToday - 24 * 60 * 60 * 1000;

  if (ts >= startToday) return "Today";
  if (ts >= startYesterday) return "Yesterday";

  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function Sidebar({ onLogout }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeConversationKey = searchParams.get("c") || "";
  const activeDraftKey = searchParams.get("d") || "";
  const CHAT_HISTORY_CACHE_KEY = "mg2_sidebar_chat_history";

  const [conversations, setConversations] = useState<Conversation[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(CHAT_HISTORY_CACHE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as Conversation[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    Today: true,
    Yesterday: false,
  });
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const groups: Record<string, Conversation[]> = {};

    for (const conv of conversations) {
      const label = toGroupLabel(conv.lastTimestamp);
      groups[label] ||= [];
      groups[label].push(conv);
    }

    return Object.entries(groups).sort((a, b) => {
      const aLatest = Math.max(...a[1].map((i) => i.lastTimestamp));
      const bLatest = Math.max(...b[1].map((i) => i.lastTimestamp));
      return bLatest - aLatest;
    });
  }, [conversations]);

  const refreshConversations = async () => {
    const res = await fetch("/api/chat/conversations", { cache: "no-store" });
    const data = (await res.json()) as { conversations?: Conversation[] };
    if (res.ok && Array.isArray(data.conversations)) {
      setConversations(data.conversations);
      try {
        localStorage.setItem(CHAT_HISTORY_CACHE_KEY, JSON.stringify(data.conversations));
      } catch {
        // ignore cache write error
      }
    }
  };

  useEffect(() => {
    void refreshConversations();

    const onHistoryUpdated = () => {
      void refreshConversations();
    };

    window.addEventListener("chat-history-updated", onHistoryUpdated);
    return () => window.removeEventListener("chat-history-updated", onHistoryUpdated);
  }, [pathname, searchParams]);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-chat-menu-root='true']")) return;
      setOpenMenuKey(null);
    };

    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const handleNewChat = () => {
    const draftKey = crypto.randomUUID();
    router.push(`/chat?d=${encodeURIComponent(draftKey)}`);
  };

  const handleRename = async (item: Conversation) => {
    const next = window.prompt("Rename chat", item.title)?.trim();
    if (!next) return;

    await fetch("/api/chat/conversations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: item.key, title: next }),
    });

    setOpenMenuKey(null);
    void refreshConversations();
  };

  const handleTogglePin = async (item: Conversation) => {
    await fetch("/api/chat/conversations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: item.key, pinned: !item.pinned }),
    });

    setOpenMenuKey(null);
    void refreshConversations();
  };

  const handleDelete = async (item: Conversation) => {
    const ok = window.confirm("Delete this chat history?");
    if (!ok) return;

    await fetch(`/api/chat/conversations?key=${encodeURIComponent(item.key)}`, {
      method: "DELETE",
    });

    if (activeConversationKey === item.key) {
      handleNewChat();
    }

    setOpenMenuKey(null);
    void refreshConversations();
  };

  return (
    <div className="hidden md:flex md:flex-row">
      <div className="flex p-6 w-75 gap-4 flex-col h-screen border-r bg-surface-card border-border">
        <h1 className="text-2xl font-manrope font-medium text-white">Openclaw</h1>

        <div className="flex flex-col gap-2">
          <h1 className="text-white/50 font-ibm-plex-mono text-xs uppercase tracking-widest">control</h1>
          <div className="flex flex-col gap-0.5">
            <MenuItem
              variant="secondary"
              label="Virtual Office"
              icon={<MG2Icon name="company" size={16} className="opacity-80" />}
            />
            <MenuItem
              variant="secondary"
              label="Notification"
              badgeText="99+"
              badgeStyle="warning"
              icon={<MG2Icon name="notifications" size={16} className="opacity-80" />}
            />
            <Link href="/dashboard" className="w-full">
              <MenuItem
                variant={pathname === "/dashboard" ? "primary" : "secondary"}
                label="Dashboard"
                icon={<MG2Icon name="dashboard" size={16} className="opacity-80" />}
              />
            </Link>
            <MenuItem
              variant={pathname === "/chat" && !activeConversationKey ? "primary" : "secondary"}
              label={activeDraftKey ? "New Chat" : "Chat"}
              onClick={handleNewChat}
              icon={<MG2Icon name="chats" size={16} className="opacity-80" />}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 min-h-0">
          <h1 className="text-white/50 font-ibm-plex-mono text-xs uppercase tracking-widest">chat history</h1>

          <div className="flex flex-col gap-1 overflow-y-auto pr-1 min-h-0">
            {grouped.length === 0 ? (
              <p className="text-xs text-white/50 font-ibm-plex-mono px-2 py-1">No chats yet</p>
            ) : (
              grouped.map(([label, items]) => {
                const expanded = expandedGroups[label] ?? label === "Today";
                return (
                  <div key={label} className="flex flex-col gap-0.5">
                    <MenuItem
                      variant="secondary"
                      label={label}
                      onClick={() => toggleGroup(label)}
                      rightIcon={
                        <MG2Icon
                          name="dropdown"
                          size={14}
                          className={`opacity-70 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
                        />
                      }
                    />

                    {expanded && (
                      <div className="flex flex-col gap-0">
                        {items.map((item) => {
                          const isActive = pathname === "/chat" && activeConversationKey === item.key;
                          return (
                            <div key={item.key} className="w-60 pl-4 inline-flex flex-col justify-start items-start gap-2.5">
                              <div className="self-stretch border-l border-border inline-flex justify-start items-center">
                                <div className="w-2 h-0 outline outline-offset-[-0.50px] outline-border" />

                                <div
                                  data-chat-menu-root="true"
                                  onClick={() => router.push(`/chat?c=${encodeURIComponent(item.key)}`)}
                                  className={`group relative flex-1 h-10 pl-2.5 pr-2 py-2 rounded-lg flex justify-start items-center gap-2.5 transition-all cursor-pointer ${
                                    isActive ? "bg-surface outline outline-border" : "outline outline-transparent hover:bg-surface-hover"
                                  }`}
                                >
                                  <span className="flex-1 text-white text-sm font-normal font-manrope line-clamp-1">
                                    {item.pinned ? "📌 " : ""}
                                    {item.title}
                                  </span>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuKey((prev) => (prev === item.key ? null : item.key));
                                    }}
                                    className={`z-10 h-7 w-7 inline-flex items-center justify-center rounded-md text-white/70 hover:text-white hover:bg-surface-card ${openMenuKey === item.key ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                                    aria-label="Chat options"
                                  >
                                    ⋯
                                  </button>

                                  {openMenuKey === item.key && (
                                    <div
                                      className="absolute right-9 top-1/2 -translate-y-1/2 z-20 min-w-28 rounded-md border border-border bg-surface-card p-1 shadow-lg"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <button
                                        type="button"
                                        className="w-full text-left text-xs text-white/80 hover:bg-surface-hover rounded px-2 py-1"
                                        onClick={() => void handleRename(item)}
                                      >
                                        Rename
                                      </button>
                                      <button
                                        type="button"
                                        className="w-full text-left text-xs text-white/80 hover:bg-surface-hover rounded px-2 py-1"
                                        onClick={() => void handleTogglePin(item)}
                                      >
                                        {item.pinned ? "Unpin" : "Pin"}
                                      </button>
                                      <button
                                        type="button"
                                        className="w-full text-left text-xs text-rose-300 hover:bg-surface-hover rounded px-2 py-1"
                                        onClick={() => void handleDelete(item)}
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="mt-auto w-full">
          <ProfileCard className="w-full" name="Miftakhul Rizky" role="Owner" onLogout={onLogout} />
        </div>
      </div>
    </div>
  );
}
