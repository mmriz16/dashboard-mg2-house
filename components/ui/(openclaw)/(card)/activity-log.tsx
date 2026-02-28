"use client";

import { Badge } from "@/components/ui/Badge";

type ActivityStatus = "success" | "info" | "warning" | "error";

interface ActivityItem {
  time: string;
  message: string;
  status: ActivityStatus;
}

interface ActivityLogCardProps {
  className?: string;
  title?: string;
  items?: ActivityItem[];
}

const badgeStyleMap: Record<ActivityStatus, "success" | "info" | "warning" | "danger"> = {
  success: "success",
  info: "info",
  warning: "warning",
  error: "danger",
};

const defaultItems: ActivityItem[] = [
  { time: "07:15", message: "OpenClaw core service started (PID 1842)", status: "success" },
  { time: "07:15", message: "Telegram bot connected (session active)", status: "success" },
  { time: "18:42", message: "WhatsApp multi-device session initialized", status: "success" },
  { time: "18:42", message: "LLM backend connected (Claude 3.5 Sonnet)", status: "success" },
  { time: "07:15", message: "18 skills loaded (browser, email, calendar, files, etc)", status: "info" },
  { time: "07:15", message: "User command received: ringkas email hari ini", status: "success" },
  { time: "07:15", message: "Browser tool opened new tab (google.com)", status: "info" },
  { time: "07:15", message: "High token usage detected (87% of limit)", status: "warning" },
  { time: "07:15", message: "Failed to delete file (permission denied on /tmp)", status: "error" },
  { time: "07:15", message: "Cron job: Daily backup to Oracle Cloud Object Storage", status: "success" },
  { time: "18:42", message: "New user login from Jakarta (Terminal)", status: "success" },
  { time: "18:42", message: "DNS query successful (openclaw.ai resolved)", status: "info" },
  { time: "18:42", message: "Agent idle mode activated (no task for 30 minutes)", status: "info" },
  { time: "18:42", message: "Scheduled task executed: VirusTotal scan file", status: "success" },
];

export function ActivityLogCard({
  className = "",
  title = "Activity Log",
  items = defaultItems,
}: ActivityLogCardProps) {
  return (
    <section className={`w-full h-full min-h-0 flex flex-col overflow-hidden rounded-[14px] border border-border bg-surface-card p-1 ${className}`}>
      <div className="px-4 py-2.5">
        <h2 className="text-base leading-none text-white">{title}</h2>
      </div>

      <div className="rounded-[10px] bg-surface p-2 flex-1 min-h-0 overflow-y-auto hide-scrollbar">
        <ul className="space-y-2.5">
          {items.map((item, index) => (
            <li key={`${item.time}-${index}-${item.message}`} className="flex items-start gap-2">
              <p className="w-10 shrink-0 font-ibm-plex-mono text-xs leading-[1.1rem] text-white/50">{item.time}</p>
              <p className="min-w-0 flex-1 text-xs leading-[1.1rem] text-white">{item.message}</p>
              <Badge
                text={item.status}
                style={badgeStyleMap[item.status]}
                className="h-4 shrink-0 px-[6px] py-0 leading-[16px]"
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default ActivityLogCard;
