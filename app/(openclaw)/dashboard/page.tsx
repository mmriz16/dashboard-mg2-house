"use client";

import { useEffect, useState } from "react";
import { authClient, clearCachedSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { GatewayCard } from "@/components/ui/(openclaw)/(card)/gateway";
import UpdateCard from "@/components/ui/(openclaw)/(card)/update";
import { ActivityLogCard } from "@/components/ui/(openclaw)/(card)/activity-log";
import { AlertsCard } from "@/components/ui/(openclaw)/(card)/alerts";
import { QuickActionsCard } from "@/components/ui/(openclaw)/(card)/quick-actions";

export default function DashboardPage() {
  const router = useRouter();
  const { data: sessionData } = authClient.useSession();
  const [isGatewayOnline, setIsGatewayOnline] = useState(true);
  const REGION_CACHE_KEY = "mg2_region_label";
  const [regionLabel, setRegionLabel] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      return localStorage.getItem(REGION_CACHE_KEY)?.trim() || "";
    } catch {
      return "";
    }
  });

  useEffect(() => {
    let cancelled = false;

    const checkHealth = async () => {
      try {
        const r = await fetch("/api/openclaw/health", { cache: "no-store" });
        if (!cancelled) setIsGatewayOnline(r.ok);
      } catch {
        if (!cancelled) setIsGatewayOnline(false);
      }
    };

    const checkLocation = async () => {
      try {
        const r = await fetch("/api/openclaw/location", { cache: "no-store" });
        const data = (await r.json()) as { regionLabel?: string };
        if (cancelled) return;
        if (typeof data?.regionLabel === "string" && data.regionLabel.trim()) {
          const normalized = data.regionLabel.trim();
          setRegionLabel(normalized);
          try {
            localStorage.setItem(REGION_CACHE_KEY, normalized);
          } catch {
            // ignore cache write error
          }
        }
      } catch {
        // keep fallback label
      }
    };

    void checkHealth();
    void checkLocation();

    const healthId = setInterval(() => void checkHealth(), 15000);
    const locationId = setInterval(() => void checkLocation(), 300000);

    return () => {
      cancelled = true;
      clearInterval(healthId);
      clearInterval(locationId);
    };
  }, []);

  const handleLogout = async () => {
    clearCachedSession();
    await authClient.signOut();
    router.push("/login");
  };

  const alertItems = [
    {
      id: "memory-agent",
      timeLabel: "25 minutes ago",
      title: "High Memory Usage on Agent : Michie",
      source: "OpenClaw",
      level: "warning" as const,
    },
    {
      id: "backup-done",
      timeLabel: "about 1 hour ago",
      title: "Daily Backup Completed Successfully",
      source: "System",
      level: "info" as const,
    },
  ];
  const displayName = sessionData?.user?.name?.trim() || "there";

  return (
    <div className="flex h-screen w-full bg-surface">
      <Sidebar onLogout={handleLogout} />

      <div className="flex flex-1 flex-col">
        <Topbar
          title="Dashboard"
          subtitle="Control"
          regionLabel={regionLabel}
          systemOnline={isGatewayOnline}
          systemStatusLabel={isGatewayOnline ? "Server Online" : "Server Offline"}
        />

        <div className="flex flex-col gap-4 p-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-manrope font-medium text-white">Welcome back, {displayName}!</h1>
            <p className="text-white/50 font-ibm-plex-mono text-sm uppercase tracking-widest">
              Here is what you need to know today
            </p>
          </div>

          <div className="flex flex-col gap-2.5 w-full">
            <GatewayCard autoFetch={true} />
            <div className="flex gap-2.5 w-full">
              <UpdateCard className="max-w-[400px]"/>
              <ActivityLogCard />
                <AlertsCard
                  items={alertItems}
                  onViewAll={() => {
                    router.push("/openclaw/agent/automations");
                  }}
                />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
