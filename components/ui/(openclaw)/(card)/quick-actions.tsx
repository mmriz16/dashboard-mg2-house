"use client";

import { Badge } from "@/components/ui/Badge";

type QuickActionTone = "default" | "danger" | "info";

interface QuickActionItem {
  id: string;
  label: string;
  tone?: QuickActionTone;
  badgeText?: string;
  onClick?: () => void;
}

interface QuickActionsCardProps {
  className?: string;
  title?: string;
  actions?: QuickActionItem[];
}

const defaultActions: QuickActionItem[] = [
  { id: "restart", label: "Restart Gateway Service", tone: "danger", badgeText: "may interrupt" },
  { id: "logs", label: "Tail Gateway Logs", tone: "default" },
  { id: "ports", label: "View Listening Ports", tone: "info" },
];

function GridIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="size-4" aria-hidden="true">
      <rect x="2.5" y="2.5" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <rect x="9" y="2.5" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <rect x="2.5" y="9" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <rect x="9" y="9" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
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

function ActionIcon({ tone }: { tone: QuickActionTone }) {
  if (tone === "info") return <BellIcon />;
  return <GridIcon />;
}

export function QuickActionsCard({ className = "", title = "Quick Actions", actions = defaultActions }: QuickActionsCardProps) {
  return (
    <section className={`w-full rounded-[14px] border border-border bg-surface-card p-1 ${className}`}>
      <div className="px-4 py-2.5">
        <h2 className="text-base leading-none text-white">{title}</h2>
      </div>

      <div className="rounded-[10px] bg-surface p-2">
        <ul className="space-y-0.5">
          {actions.map((action) => (
            <li key={action.id}>
              <button
                type="button"
                onClick={action.onClick}
                className="flex h-10 w-full items-center gap-2 rounded-[8px] px-2 text-left text-white transition-colors hover:bg-surface-hover"
              >
                <span className="text-white/90">
                  <ActionIcon tone={action.tone ?? "default"} />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm leading-none">{action.label}</span>
                {action.badgeText ? (
                  <Badge
                    text={action.badgeText}
                    style={action.tone === "danger" ? "danger" : "default"}
                    className="h-4 shrink-0 px-[6px] py-0 leading-[16px]"
                  />
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default QuickActionsCard;
