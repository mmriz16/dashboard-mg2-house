"use client";

import { useState } from "react";
import { MenuItem } from "@/components/MenuItem";
import { SubMenuItem } from "@/components/SubMenuItem";
import { ProfileCard } from "@/components/ProfileCard";
import { MG2Icon } from "@/components/ui/MG2Icon";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
  onLogout?: () => void;
}

const HISTORY_GROUPS = [
  {
    key: "today",
    label: "Today",
    items: [
      "Advanced AI Model Training",
      "Thorough AI Safety Testing",
      "Comprehensive AI Ethics Review",
    ],
  },
  {
    key: "yesterday",
    label: "Yesterday",
    items: [
      "Quarterly Growth Summary",
      "Model Prompt Benchmark",
      "Risk Review Notes",
    ],
  },
  {
    key: "2026-02-23",
    label: "February 23, 2026",
    items: [
      "Roadmap Discussion",
      "API Cost Analysis",
      "Chat UX Improvements",
    ],
  },
] as const;

export function Sidebar({ onLogout }: SidebarProps) {
  const pathname = usePathname();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    today: true,
    yesterday: false,
    "2026-02-23": false,
  });

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
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
            <Link href="/chat" className="w-full">
              <MenuItem
                variant={pathname === "/chat" ? "primary" : "secondary"}
                label="Chat"
                icon={<MG2Icon name="chats" size={16} className="opacity-80" />}
              />
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-2 min-h-0">
          <h1 className="text-white/50 font-ibm-plex-mono text-xs uppercase tracking-widest">chat history</h1>

          <div className="flex flex-col gap-1 overflow-y-auto pr-1 min-h-0">
            {HISTORY_GROUPS.map((group) => {
              const expanded = !!expandedGroups[group.key];

              return (
                <div key={group.key} className="flex flex-col gap-0.5">
                  <MenuItem
                    variant="secondary"
                    label={group.label}
                    onClick={() => toggleGroup(group.key)}
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
                      {group.items.map((item) => (
                        <SubMenuItem key={item} variant="secondary" label={item} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-auto w-full">
          <ProfileCard className="w-full" name="Miftakhul Rizky" role="Owner" onLogout={onLogout} />
        </div>
      </div>
    </div>
  );
}
