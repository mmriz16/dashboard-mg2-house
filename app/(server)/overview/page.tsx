"use client";

import { useEffect, useState } from "react";
import { StatCard } from "@/components/ui/StatCard";

type OverviewResponse = {
  ok: boolean;
  error?: string;
  overview: null | {
    hostname: string;
    uptimeHuman: string;
    loadAverage: string[];
    memory: {
      totalMb: number;
      usedMb: number;
      availableMb: number;
      swapTotalMb: number;
      swapUsedMb: number;
    };
    disks: Array<{
      mount: string;
      totalGb: number;
      usedGb: number;
      freeGb: number;
      usedPercent: number;
    }>;
    docker: {
      total: number;
      healthy: number;
      unhealthy: number;
      containers: Array<{
        name: string;
        status: string;
        ports: string;
      }>;
    };
    nginxSiteCount: number;
    failedUnits: string[];
  };
};

function percent(value: number, total: number) {
  if (!total) return "-";
  return `${((value / total) * 100).toFixed(1)}%`;
}

export default function OverviewPage() {
  const [data, setData] = useState<OverviewResponse["overview"]>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch("/api/server/overview", {
          cache: "no-store",
        });
        const payload = (await response.json()) as OverviewResponse;
        if (cancelled) return;
        setData(payload.overview);
        setError(payload.ok ? "" : payload.error || "Failed to load overview.");
      } catch {
        if (!cancelled) {
          setError("Failed to load overview.");
        }
      }
    };

    void load();
    const timer = setInterval(() => void load(), 15000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const rootDisk = data?.disks.find((disk) => disk.mount === "/") ?? data?.disks[0];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-manrope font-medium text-white">
          Server Overview
        </h1>
        <p className="text-white/50 font-ibm-plex-mono text-sm uppercase tracking-widest">
          Live snapshot for host, resources, containers, and failed services
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Hostname" value={data?.hostname || "-"} />
        <StatCard title="Uptime" value={data?.uptimeHuman || "-"} />
        <StatCard
          title="RAM Used"
          value={
            data
              ? `${percent(data.memory.usedMb, data.memory.totalMb)} (${Math.round(
                  data.memory.usedMb / 1024,
                )}GB/${Math.round(data.memory.totalMb / 1024)}GB)`
              : "-"
          }
        />
        <StatCard
          title="Root Disk"
          value={
            rootDisk
              ? `${rootDisk.usedPercent.toFixed(1)}% (${rootDisk.usedGb}GB/${rootDisk.totalGb}GB)`
              : "-"
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border border-border bg-surface-card p-1">
          <div className="px-4 py-2.5 text-sm font-manrope text-white">
            Runtime Health
          </div>
          <div className="rounded-[10px] bg-surface p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <div className="text-xs uppercase tracking-widest text-white/50 font-ibm-plex-mono">
                  Load Average
                </div>
                <div className="mt-2 text-lg font-ibm-plex-mono text-white">
                  {data?.loadAverage.join(" / ") || "-"}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-white/50 font-ibm-plex-mono">
                  Swap Usage
                </div>
                <div className="mt-2 text-lg font-ibm-plex-mono text-white">
                  {data
                    ? `${percent(
                        data.memory.swapUsedMb,
                        data.memory.swapTotalMb,
                      )} (${Math.round(data.memory.swapUsedMb / 1024)}GB/${Math.round(
                        data.memory.swapTotalMb / 1024,
                      )}GB)`
                    : "-"}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-white/50 font-ibm-plex-mono">
                  Docker Containers
                </div>
                <div className="mt-2 text-lg font-ibm-plex-mono text-white">
                  {data
                    ? `${data.docker.total} total / ${data.docker.healthy} healthy`
                    : "-"}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-white/50 font-ibm-plex-mono">
                  Nginx Sites
                </div>
                <div className="mt-2 text-lg font-ibm-plex-mono text-white">
                  {data?.nginxSiteCount ?? "-"}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface-card p-1">
          <div className="px-4 py-2.5 text-sm font-manrope text-white">
            Failed Units
          </div>
          <div className="rounded-[10px] bg-surface p-4">
            {data?.failedUnits.length ? (
              <div className="space-y-2">
                {data.failedUnits.map((unit) => (
                  <div
                    key={unit}
                    className="rounded-lg border border-amber-400/20 bg-amber-500/10 px-3 py-2 font-ibm-plex-mono text-xs text-amber-200"
                  >
                    {unit}
                  </div>
                ))}
              </div>
            ) : (
              <div className="font-ibm-plex-mono text-xs uppercase tracking-widest text-emerald-300">
                No failed units
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-surface-card p-1">
        <div className="px-4 py-2.5 text-sm font-manrope text-white">
          Disk Usage
        </div>
        <div className="rounded-[10px] bg-surface p-2">
          <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr] gap-2 px-3 py-2 text-[11px] uppercase tracking-widest text-white/40 font-ibm-plex-mono">
            <div>Mount</div>
            <div>Used</div>
            <div>Free</div>
            <div>Utilization</div>
          </div>
          <div className="space-y-2">
            {data?.disks.map((disk) => (
              <div
                key={disk.mount}
                className="grid grid-cols-[1.2fr_1fr_1fr_1fr] gap-2 rounded-xl border border-border bg-surface-card px-3 py-3 text-sm text-white"
              >
                <div className="font-manrope">{disk.mount}</div>
                <div className="font-ibm-plex-mono">{disk.usedGb}GB</div>
                <div className="font-ibm-plex-mono">{disk.freeGb}GB</div>
                <div className="font-ibm-plex-mono">{disk.usedPercent}%</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
