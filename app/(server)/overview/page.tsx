"use client";

import { useEffect, useState } from "react";
import { StatCard } from "@/components/ui/StatCard";
import { authClient, clearCachedSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";

type ServerMetrics = {
  cpu: string;
  ram: string;
  disk: string;
  cronHealthyJobs: string;
};

export default function DashboardPage() {
  const router = useRouter();
  authClient.useSession();
  const [isGatewayOnline, setIsGatewayOnline] = useState(true);
  const [metrics, setMetrics] = useState<ServerMetrics>({
    cpu: "-",
    ram: "-",
    disk: "-",
    cronHealthyJobs: "-",
  });

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

    const fetchMetrics = async () => {
      try {
        const r = await fetch("/api/server/metrics", { cache: "no-store" });
        const data = (await r.json()) as Partial<ServerMetrics>;
        if (cancelled) return;
        setMetrics({
          cpu: data.cpu ?? "-",
          ram: data.ram ?? "-",
          disk: data.disk ?? "-",
          cronHealthyJobs: data.cronHealthyJobs ?? "-",
        });
      } catch {
        // keep previous metrics
      }
    };

    void checkHealth();
    void checkLocation();
    void fetchMetrics();

    const healthId = setInterval(() => void checkHealth(), 15000);
    const locationId = setInterval(() => void checkLocation(), 300000);
    const metricsId = setInterval(() => void fetchMetrics(), 5000);

    return () => {
      cancelled = true;
      clearInterval(healthId);
      clearInterval(locationId);
      clearInterval(metricsId);
    };
  }, []);

  const handleLogout = async () => {
    clearCachedSession();
    await authClient.signOut();
    router.push("/login");
  };

  return (
    <div className="flex h-screen w-full bg-surface">
      <Sidebar onLogout={handleLogout} />

      <div className="flex flex-1 flex-col">
        <Topbar
          title="Overview"
          subtitle="Server"
          regionLabel={regionLabel}
          systemOnline={isGatewayOnline}
          systemStatusLabel={isGatewayOnline ? "Server Online" : "Server Offline"}
        />

        <div className="flex flex-col gap-4 p-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-manrope font-medium text-white">Server Overview</h1>
            <p className="text-white/50 font-ibm-plex-mono text-sm uppercase tracking-widest">
              Infrastructure and runtime metrics
            </p>
          </div>

          <div className="flex flex-col gap-2.5 w-full">
            <div className="flex gap-2.5 w-full">
              <StatCard className="w-full" title="CPU" value={metrics.cpu} />
              <StatCard className="w-full" title="RAM" value={metrics.ram} />
              <StatCard className="w-full" title="DISK" value={metrics.disk} />
              <StatCard className="w-full" title="Cron Healthy Jobs" value={metrics.cronHealthyJobs} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

