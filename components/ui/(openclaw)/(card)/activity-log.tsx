"use client";

import { useEffect, useState, useRef } from "react";
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
  initialItems?: ActivityItem[];
  autoFetch?: boolean;
}

const badgeStyleMap: Record<ActivityStatus, "success" | "info" | "warning" | "danger"> = {
  success: "success",
  info: "info",
  warning: "warning",
  error: "danger",
};

const MAX_ITEMS = 30;

const defaultItems: ActivityItem[] = [
  { time: "--:--", message: "Loading activities...", status: "info" },
];

export function ActivityLogCard({
  className = "",
  title = "Activity Log",
  initialItems,
  autoFetch = true,
}: ActivityLogCardProps) {
  const [items, setItems] = useState<ActivityItem[]>(initialItems || defaultItems);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      shouldAutoScroll.current = scrollTop + clientHeight >= scrollHeight - 50;
    }
  };

  useEffect(() => {
    if (!autoFetch) return;

    const fetchActivities = async () => {
      try {
        const res = await fetch("/api/oracle-gateway/activity", {
          cache: "no-store",
          signal: AbortSignal.timeout(15000)
        });
        const data = await res.json();

        if (data.items && Array.isArray(data.items)) {
          setItems(data.items.slice(0, MAX_ITEMS));
          setError(null);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to fetch");
      }
    };

    fetchActivities();
    const interval = setInterval(fetchActivities, 10000);
    return () => clearInterval(interval);
  }, [autoFetch]);

  useEffect(() => {
    if (shouldAutoScroll.current && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [items]);

  return (
    <section className={`w-full h-full min-h-0 flex flex-col overflow-hidden rounded-[14px] border border-border bg-surface-card ${className}`}>
      <div className="p-4 flex items-center justify-between shrink-0">
        <h2 className="text-sm sm:text-base leading-none text-white">{title}</h2>
        {error && <span className="text-xs text-red">{error}</span>}
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto rounded-[10px] bg-surface px-4 py-2 hide-scrollbar m-1"
      >
        <ul className="space-y-1">
          {items.map((item, index) => (
            <li key={`${item.time}-${index}-${item.message}`} className="flex items-start gap-2">
              <p className="w-10 sm:w-12 shrink-0 font-ibm-plex-mono text-[11px] sm:text-xs leading-[1.1rem] text-white/50">{item.time}</p>
              <p className="min-w-0 flex-1 text-[11px] sm:text-xs leading-[1.1rem] text-white break-words">{item.message}</p>
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
