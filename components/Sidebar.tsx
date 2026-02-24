"use client";

import { useEffect, useMemo, useState } from "react";
import { MenuItem } from "@/components/MenuItem";
import { SubMenuItem } from "@/components/SubMenuItem";
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
  const activeConversationKey = searchParams.get("c") || "default";

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [creatingChat, setCreatingChat] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    Today: true,
    Yesterday: false,
  });

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
    try {
      const res = await fetch("/api/chat/conversations", { cache: "no-store" });
      const data = (await res.json()) as { conversations?: Conversation[] };
      if (res.ok && Array.isArray(data.conversations)) {
        setConversations(data.conversations);
      }
    } finally {
      setLoadingConversations(false);
    }
  };

  useEffect(() => {
    refreshConversations();
  }, [pathname]);

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const handleNewChat = async () => {
    if (creatingChat) return;
    setCreatingChat(true);

    try {
      const res = await fetch("/api/chat/conversations", { method: "POST" });
      const data = (await res.json()) as { key?: string };
      if (!res.ok || !data?.key) return;

      await refreshConversations();
      router.push(`/chat?c=${encodeURIComponent(data.key)}`);
    } finally {
      setCreatingChat(false);
    }
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
              variant={pathname === "/chat" ? "primary" : "secondary"}
              label={creatingChat ? "Creating..." : "Chat"}
              onClick={handleNewChat}
              icon={<MG2Icon name="chats" size={16} className="opacity-80" />}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 min-h-0">
          <h1 className="text-white/50 font-ibm-plex-mono text-xs uppercase tracking-widest">chat history</h1>

          <div className="flex flex-col gap-1 overflow-y-auto pr-1 min-h-0">
            {loadingConversations ? (
              <p className="text-xs text-white/50 font-ibm-plex-mono px-2 py-1">Loading...</p>
            ) : grouped.length === 0 ? (
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
                        {items.map((item) => (
                          <SubMenuItem
                            key={item.key}
                            label={item.title}
                            variant={pathname === "/chat" && activeConversationKey === item.key ? "primary" : "secondary"}
                            onClick={() => router.push(`/chat?c=${encodeURIComponent(item.key)}`)}
                          />
                        ))}
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
