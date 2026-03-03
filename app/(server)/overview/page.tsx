"use client";

import { useEffect, useState } from "react";
import { StatCard } from "@/components/ui/StatCard";

type ServerMetrics = {
  cpu: string;
  ram: string;
  disk: string;
  cronHealthyJobs: string;
};

export default function OverviewPage() {
  const [metrics, setMetrics] = useState<ServerMetrics>({
    cpu: "-",
    ram: "-",
    disk: "-",
    cronHealthyJobs: "-",
  });

  useEffect(() => {
    let cancelled = false;

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

    void fetchMetrics();
    const metricsId = setInterval(() => void fetchMetrics(), 15000);

    return () => {
      cancelled = true;
      clearInterval(metricsId);
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
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
  );
}
