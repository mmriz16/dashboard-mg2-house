"use client";

import { Badge } from "@/components/ui/Badge";

type AlertLevel = "warning" | "info";

interface AlertItem {
  id: string;
  timeLabel: string;
  title: string;
  source: string;
  level: AlertLevel;
}

interface AlertsCardProps {
  className?: string;
  title?: string;
  items?: AlertItem[];
  onViewAll?: () => void;
}

const defaultItems: AlertItem[] = [
  {
    id: "memory",
    timeLabel: "25 minutes ago",
    title: "High Memory Usage on Agent : Michie",
    source: "OpenClaw",
    level: "warning",
  },
  {
    id: "backup",
    timeLabel: "about 1 hour ago",
    title: "Daily Backup Completed Successfully",
    source: "System",
    level: "info",
  },
];

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 10 10" fill="none" className="size-2.5" aria-hidden="true">
      <path d="M2 5h6M5.5 2.5 8 5 5.5 7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="size-4" aria-hidden="true">
      <path
        d="M8 2.333a3 3 0 0 0-3 3v1.667c0 .646-.228 1.272-.644 1.767L3 10.333h10l-1.356-1.566A2.67 2.67 0 0 1 11 7V5.333a3 3 0 0 0-3-3Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M6.5 12a1.5 1.5 0 0 0 3 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function AlertItemCard({ item }: { item: AlertItem }) {
  const isWarning = item.level === "warning";

  return (
    <li
      className={
        isWarning
          ? "flex w-full items-start gap-2 rounded-[8px] bg-yellow/10 px-3 py-3"
          : "flex w-full items-start gap-2 rounded-[8px] bg-blue/10 px-3 py-3"
      }
    >
      <div className={isWarning ? "mt-0.5 text-yellow" : "mt-0.5 text-blue"}>
        <BellIcon />
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-ibm-plex-mono text-xs uppercase text-white/50">{item.timeLabel}</p>
        <p className={isWarning ? "mt-1 text-base leading-tight text-yellow" : "mt-1 text-base leading-tight text-blue"}>{item.title}</p>
        <p className="mt-1 font-ibm-plex-mono text-xs uppercase text-white/50">Source:{item.source}</p>
      </div>

      <Badge
        text={item.level}
        style={isWarning ? "warning" : "info"}
        className="mt-0.5 h-4 shrink-0 px-[6px] py-0 leading-[16px]"
      />
    </li>
  );
}

export function AlertsCard({ className = "", title = "Recent Alerts", items = defaultItems, onViewAll }: AlertsCardProps) {
  return (
    <section className={`w-full h-full min-h-0 flex flex-col overflow-hidden rounded-[14px] border border-border bg-surface-card p-1 ${className}`}>
      <div className="flex items-center justify-between px-4 py-4">
        <h2 className="text-base leading-none text-white">{title}</h2>
        <button
          type="button"
          onClick={onViewAll}
          className="inline-flex h-4 items-center gap-1 rounded-full bg-blue/10 px-[6px] text-[10px] uppercase tracking-wide text-blue"
        >
          <span className="font-ibm-plex-mono">View all</span>
          <ArrowRightIcon />
        </button>
      </div>

      <div className="rounded-[10px] bg-surface p-2 flex-1 min-h-0 overflow-y-auto hide-scrollbar">
        <ul className="space-y-2">
          {items.map((item) => (
            <AlertItemCard key={item.id} item={item} />
          ))}
        </ul>
      </div>
    </section>
  );
}

export default AlertsCard;
