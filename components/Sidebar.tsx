"use client";

import type { MouseEvent as ReactMouseEvent } from "react";
import React, { useEffect, useMemo, useState } from "react";
import { MenuItem } from "@/components/MenuItem";
import { SubMenuItem } from "@/components/SubMenuItem";
import { ProfileCard } from "@/components/ProfileCard";
import { MG2Icon } from "@/components/ui/MG2Icon";
import Link from "next/link";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
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
  const startToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
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
  return (
    <React.Suspense fallback={<div className="hidden md:flex md:flex-row w-75 h-screen border-r bg-surface-card border-border" />}>
      <SidebarContent onLogout={onLogout} />
    </React.Suspense>
  );
}

function SidebarContent({ onLogout }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();
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

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {
      Today: true,
      Yesterday: false,
    },
  );
  const [activeSegment, _setActiveSegment] = useState(() => {
    if (typeof window === "undefined") return "server";
    return localStorage.getItem("mg2_active_segment") || "server";
  });
  const setActiveSegment = (val: string) => {
    _setActiveSegment(val);
    localStorage.setItem("mg2_active_segment", val);
  };
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);
  const [openMenuPosition, setOpenMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

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
        localStorage.setItem(
          CHAT_HISTORY_CACHE_KEY,
          JSON.stringify(data.conversations),
        );
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
    return () =>
      window.removeEventListener("chat-history-updated", onHistoryUpdated);
  }, [pathname, searchParamsKey]);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-chat-menu-root='true']")) return;
      setOpenMenuKey(null);
      setOpenMenuPosition(null);
    };

    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  useEffect(() => {
    const closeMenu = () => {
      setOpenMenuKey(null);
      setOpenMenuPosition(null);
    };

    window.addEventListener("resize", closeMenu);
    return () => window.removeEventListener("resize", closeMenu);
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
    setOpenMenuPosition(null);
    void refreshConversations();
  };

  const handleTogglePin = async (item: Conversation) => {
    await fetch("/api/chat/conversations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: item.key, pinned: !item.pinned }),
    });

    setOpenMenuKey(null);
    setOpenMenuPosition(null);
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
    setOpenMenuPosition(null);
    void refreshConversations();
  };

  const toggleChatOptionsMenu = (
    e: ReactMouseEvent<HTMLButtonElement>,
    itemKey: string,
  ) => {
    e.stopPropagation();

    if (openMenuKey === itemKey) {
      setOpenMenuKey(null);
      setOpenMenuPosition(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const menuWidth = 140;
    const menuHeight = 112;
    const gap = 8;
    const viewportPadding = 8;
    const preferredRightLeft = rect.right + gap;
    const fallbackLeftLeft = rect.left - menuWidth - gap;
    const maxLeft = window.innerWidth - menuWidth - viewportPadding;
    const left =
      preferredRightLeft <= maxLeft
        ? preferredRightLeft
        : Math.max(viewportPadding, fallbackLeftLeft);
    const top = Math.min(
      Math.max(viewportPadding, rect.top + rect.height / 2 - menuHeight / 2),
      window.innerHeight - menuHeight - viewportPadding,
    );

    setOpenMenuPosition({ top, left });
    setOpenMenuKey(itemKey);
  };

  return (
    <div className="hidden md:flex md:flex-row">
      <div className="flex p-6 w-75 gap-4 flex-col h-screen border-r bg-surface-card border-border overflow-x-hidden">
        <h1 className="text-2xl font-manrope font-medium text-white">
          Dashboard
        </h1>

        <SegmentedControl
          items={[
            { label: "Server", value: "server" },
            { label: "Openclaw", value: "openclaw" },
          ]}
          value={activeSegment}
          onChange={setActiveSegment}
        />

        {activeSegment === "openclaw" && (
          <div className="flex flex-col gap-2">
            <h1 className="text-white/50 font-ibm-plex-mono text-xs uppercase tracking-widest">
              control
            </h1>
            <div className="flex flex-col gap-0.5">
              <MenuItem
                variant="secondary"
                label="Virtual Office"
                icon={<MG2Icon name="company" size={16} className="opacity-80" />}
              />
              <Link href="/dashboard" className="w-full">
                <MenuItem
                  variant={pathname === "/dashboard" ? "primary" : "secondary"}
                  label="Dashboard"
                  icon={
                    <MG2Icon name="dashboard" size={16} className="opacity-80" />
                  }
                />
              </Link>
              <MenuItem
                variant={
                  pathname === "/chat" && !activeConversationKey
                    ? "primary"
                    : "secondary"
                }
                label={activeDraftKey ? "New Chat" : "Chat"}
                onClick={handleNewChat}
                icon={<MG2Icon name="chats" size={16} className="opacity-80" />}
              />
            </div>

            <h1 className="text-white/50 font-ibm-plex-mono text-xs uppercase tracking-widest mt-3">
              OpenClaw Agent
            </h1>
            <div className="flex flex-col gap-0.5">
              <Link href="/agent/hierarchy" className="w-full">
                <MenuItem
                  variant={pathname === "/agent/hierarchy" ? "primary" : "secondary"}
                  label="Hierarchy"
                  icon={<MG2Icon name="team" size={16} className="opacity-80" />}
                />
              </Link>
              <Link href="/agent/files" className="w-full">
                <MenuItem
                  variant={pathname === "/agent/files" ? "primary" : "secondary"}
                  label="Files"
                  icon={<MG2Icon name="document" size={16} className="opacity-80" />}
                />
              </Link>
              <Link href="/agent/tasks" className="w-full">
                <MenuItem
                  variant={pathname === "/agent/tasks" ? "primary" : "secondary"}
                  label="Kanban Board"
                  icon={<MG2Icon name="tasks" size={16} className="opacity-80" />}
                />
              </Link>
              <Link href="/agent/memory" className="w-full">
                <MenuItem
                  variant={pathname === "/agent/memory" ? "primary" : "secondary"}
                  label="Memory"
                  icon={<MG2Icon name="profile" size={16} className="opacity-80" />}
                />
              </Link>
            </div>
          </div>
        )}

        {activeSegment === "server" && (
          <div className="flex flex-col gap-2">
            <h1 className="text-white/50 font-ibm-plex-mono text-xs uppercase tracking-widest">
              server
            </h1>
            <div className="flex flex-col gap-0.5">
              <Link href="/overview" className="w-full">
                <MenuItem
                  variant={pathname === "/overview" ? "primary" : "secondary"}
                  label="Overview"
                  icon={<MG2Icon name="chats" size={16} className="opacity-80" />}
                />
              </Link>
              <Link href="/database" className="w-full">
                <MenuItem
                  variant={pathname === "/database" ? "primary" : "secondary"}
                  label="Database"
                  icon={<MG2Icon name="company" size={16} className="opacity-80" />}
                />
              </Link>
              <Link href="/website" className="w-full">
                <MenuItem
                  variant={pathname === "/website" ? "primary" : "secondary"}
                  label="Website"
                  icon={<MG2Icon name="notifications" size={16} className="opacity-80" />}
                  rightIcon={
                    <MG2Icon
                      name="dropdown"
                      size={14}
                      className={`opacity-70 transition-transform duration-200 ${pathname.startsWith("/website") ? "rotate-180" : ""}`}
                    />
                  }
                />
              </Link>

              {pathname.startsWith("/website") && (
                <div className="flex flex-col gap-0.5">
                  <Link href="/website/projects" className="w-full">
                    <SubMenuItem
                      variant={pathname === "/website/projects" ? "primary" : "secondary"}
                      label="Projects"
                    />
                  </Link>
                  <Link href="/website/deployments" className="w-full">
                    <SubMenuItem
                      variant={pathname === "/website/deployments" ? "primary" : "secondary"}
                      label="Deployments"
                    />
                  </Link>
                  <Link href="/website/domains" className="w-full">
                    <SubMenuItem
                      variant={pathname === "/website/domains" ? "primary" : "secondary"}
                      label="Domains & SSL"
                    />
                  </Link>
                  <Link href="/website/files" className="w-full">
                    <SubMenuItem
                      variant={pathname === "/website/files" ? "primary" : "secondary"}
                      label="Files / Upload"
                    />
                  </Link>
                  <Link href="/website/env" className="w-full">
                    <SubMenuItem
                      variant={pathname === "/website/env" ? "primary" : "secondary"}
                      label="Env Vars"
                    />
                  </Link>
                  <Link href="/website/logs" className="w-full">
                    <SubMenuItem
                      variant={pathname === "/website/logs" ? "primary" : "secondary"}
                      label="Logs"
                    />
                  </Link>
                  <Link href="/website/settings" className="w-full">
                    <SubMenuItem
                      variant={pathname === "/website/settings" ? "primary" : "secondary"}
                      label="Settings"
                    />
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {activeSegment === "openclaw" && (
          <div className="flex flex-col gap-2 min-h-0">
            <h1 className="text-white/50 font-ibm-plex-mono text-xs uppercase tracking-widest">
              chat history
            </h1>

            <div
              className="hide-scrollbar flex flex-col gap-1 overflow-y-auto overflow-x-hidden pr-1 min-h-0"
              onScroll={() => {
                if (openMenuKey) {
                  setOpenMenuKey(null);
                  setOpenMenuPosition(null);
                }
              }}
            >
              {grouped.length === 0 ? (
                <p className="text-xs text-white/50 font-ibm-plex-mono px-2 py-1">
                  No chats yet
                </p>
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
                            const isActive =
                              pathname === "/chat" &&
                              activeConversationKey === item.key;
                            return (
                              <div key={item.key} className="w-full pl-4">
                                <div className="w-full min-w-0 flex-1 self-stretch border-l border-border flex justify-start items-center">
                                  <div className="w-2 h-0 shrink-0 outline outline-offset-[-0.50px] outline-border" />

                                  <div
                                    data-chat-menu-root="true"
                                    className={`group relative flex-1 min-w-0 h-10 pl-2.5 pr-1 py-2 rounded-lg flex justify-start items-center gap-1 transition-all ${isActive
                                      ? "bg-surface outline outline-border"
                                      : "outline outline-transparent hover:bg-surface-hover"
                                      }`}
                                  >
                                    <div
                                      onClick={() =>
                                        router.push(
                                          `/chat?c=${encodeURIComponent(item.key)}`,
                                        )
                                      }
                                      className="min-w-0 flex-1 h-full flex items-center cursor-pointer"
                                    >
                                      <span className="min-w-0 flex-1 text-white text-sm font-normal font-manrope line-clamp-1">
                                        {item.pinned ? "📌 " : ""}
                                        {item.title}
                                      </span>
                                    </div>

                                    <div
                                      data-chat-menu-root="true"
                                      className="shrink-0"
                                    >
                                      <button
                                        type="button"
                                        data-chat-menu-root="true"
                                        data-chat-options-button="true"
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onClick={(e) =>
                                          toggleChatOptionsMenu(e, item.key)
                                        }
                                        className={`h-7 w-7 inline-flex items-center justify-center rounded-md text-white/70 hover:text-white hover:bg-surface-card transition-opacity leading-none ${openMenuKey === item.key
                                          ? "opacity-100 bg-surface-card text-white"
                                          : "opacity-0 group-hover:opacity-100"
                                          }`}
                                        aria-label="Chat options"
                                      >
                                        <span className="-mt-0.5 text-sm leading-none">
                                          ···
                                        </span>
                                      </button>

                                      {openMenuKey === item.key &&
                                        openMenuPosition && (
                                          <div
                                            className="fixed z-[80] min-w-28 rounded-md border border-border bg-surface-card p-1 shadow-lg"
                                            style={{
                                              top: openMenuPosition.top,
                                              left: openMenuPosition.left,
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <button
                                              type="button"
                                              className="w-full text-left text-xs text-white/80 hover:bg-surface-hover rounded px-2 py-1"
                                              onClick={() =>
                                                void handleRename(item)
                                              }
                                            >
                                              Rename
                                            </button>
                                            <button
                                              type="button"
                                              className="w-full text-left text-xs text-white/80 hover:bg-surface-hover rounded px-2 py-1"
                                              onClick={() =>
                                                void handleTogglePin(item)
                                              }
                                            >
                                              {item.pinned ? "Unpin" : "Pin"}
                                            </button>
                                            <button
                                              type="button"
                                              className="w-full text-left text-xs text-rose-300 hover:bg-surface-hover rounded px-2 py-1"
                                              onClick={() =>
                                                void handleDelete(item)
                                              }
                                            >
                                              Delete
                                            </button>
                                          </div>
                                        )}
                                    </div>
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
        )}

        <div className="mt-auto w-full">
          <ProfileCard
            className="w-full"
            name="Miftakhul Rizky"
            role="Owner"
            onLogout={onLogout}
          />
        </div>
      </div>
    </div>
  );
}

