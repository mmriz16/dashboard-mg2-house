"use client";

import { useEffect, useState } from "react";

type Container = {
  name: string;
  status: string;
  ports: string;
};

type OverviewPayload = {
  ok: boolean;
  error?: string;
  overview: null | {
    docker: {
      total: number;
      healthy: number;
      unhealthy: number;
      containers: Container[];
    };
  };
};

export default function DeploymentsPage() {
  const [containers, setContainers] = useState<Container[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    healthy: 0,
    unhealthy: 0,
  });
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch("/api/server/overview", { cache: "no-store" });
        const payload = (await response.json()) as OverviewPayload;
        if (cancelled) return;
        const docker = payload.overview?.docker;
        setContainers(docker?.containers || []);
        setSummary({
          total: docker?.total || 0,
          healthy: docker?.healthy || 0,
          unhealthy: docker?.unhealthy || 0,
        });
        setError(payload.ok ? "" : payload.error || "Failed to load deployments.");
      } catch {
        if (!cancelled) setError("Failed to load deployments.");
      }
    };

    void load();
    const timer = setInterval(() => void load(), 30000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-manrope font-medium text-white">
          Deployments
        </h1>
        <p className="text-white/50 font-ibm-plex-mono text-sm uppercase tracking-widest">
          Docker runtime snapshot for services deployed on the server
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface-card p-1">
          <div className="rounded-[10px] bg-surface p-4">
            <div className="text-xs uppercase tracking-widest text-white/40 font-ibm-plex-mono">
              Total Containers
            </div>
            <div className="mt-3 text-3xl text-white font-ibm-plex-mono">
              {summary.total}
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface-card p-1">
          <div className="rounded-[10px] bg-surface p-4">
            <div className="text-xs uppercase tracking-widest text-white/40 font-ibm-plex-mono">
              Healthy
            </div>
            <div className="mt-3 text-3xl text-emerald-300 font-ibm-plex-mono">
              {summary.healthy}
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface-card p-1">
          <div className="rounded-[10px] bg-surface p-4">
            <div className="text-xs uppercase tracking-widest text-white/40 font-ibm-plex-mono">
              Unhealthy
            </div>
            <div className="mt-3 text-3xl text-amber-300 font-ibm-plex-mono">
              {summary.unhealthy}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {containers.map((container) => (
          <div
            key={container.name}
            className="rounded-2xl border border-border bg-surface-card p-1"
          >
            <div className="rounded-[10px] bg-surface p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg text-white font-manrope">
                    {container.name}
                  </div>
                  <div className="mt-1 text-sm text-white/70 font-ibm-plex-mono">
                    {container.status}
                  </div>
                </div>
                <div className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-widest text-white/70 font-ibm-plex-mono">
                  {container.status.toLowerCase().includes("healthy")
                    ? "healthy"
                    : "running"}
                </div>
              </div>
              {container.ports && (
                <div className="mt-4 text-sm text-white font-ibm-plex-mono break-all">
                  {container.ports}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
