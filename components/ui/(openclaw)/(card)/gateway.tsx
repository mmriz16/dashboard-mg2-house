"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

type GatewayStatus = "healthy" | "warning" | "offline";

interface GatewayData {
  status: GatewayStatus;
  port: string;
  pid: string;
  channel: string;
  uptime: string;
  lastHeartbeat: string;
  lastProbe: string;
  error?: string;
}

interface GatewayCardProps {
  className?: string;
  initialData?: GatewayData;
  autoFetch?: boolean;
}

const statusBadgeStyle: Record<GatewayStatus, "success" | "warning" | "danger"> = {
  healthy: "success",
  warning: "warning",
  offline: "danger",
};

function RefreshIcon() {
  return (
    <Image src="/icons/refresh.svg" alt="Refresh" width={16} height={16} className="size-4" aria-hidden="true" />
  );
}

function RestartIcon() {
  return (
    <Image src="/icons/restart.svg" alt="Restart" width={16} height={16} className="size-4" aria-hidden="true" />
  );
}

function StopIcon() {
  return (
    <Image src="/icons/stop.svg" alt="Stop" width={16} height={16} className="size-4" aria-hidden="true" />
  );
}

function GatewayMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 flex-1 px-4 first:pl-0 last:pr-0 sm:border-l sm:border-border sm:first:border-l-0">
      <p className="text-[10px] text-white/50 leading-none">{label}</p>
      <p className="mt-2 font-ibm-plex-mono text-lg sm:text-[26px] leading-none text-white whitespace-nowrap">{value}</p>
    </div>
  );
}

export function GatewayCard({
  className = "",
  initialData,
  autoFetch = true,
}: GatewayCardProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<GatewayData | null>(initialData || null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/oracle-gateway/status", {
        cache: "no-store",
        signal: AbortSignal.timeout(15000)
      });
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch");
      setData(prev => prev || {
        status: "offline",
        port: "-",
        pid: "-",
        channel: "Production",
        uptime: "-",
        lastHeartbeat: "-",
        lastProbe: "-",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => fetchStatus();

  const handleRestart = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/oracle-gateway/restart", { method: "POST" });
      if (res.ok) {
        setTimeout(fetchStatus, 3000);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to restart");
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/oracle-gateway/stop", { method: "POST" });
      if (res.ok) {
        setTimeout(fetchStatus, 2000);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to stop");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoFetch && !initialData) {
      fetchStatus();
      const interval = setInterval(fetchStatus, 30000);
      return () => clearInterval(interval);
    }
  }, [autoFetch, initialData]);

  const status = data?.status || "offline";
  const lastHeartbeat = data?.lastHeartbeat || "-";
  const lastProbe = data?.lastProbe || "-";
  const channel = data?.channel || "Production";
  const port = data?.port || "0.0.0.0:8080";
  const pid = data?.pid || "0";
  const uptime = data?.uptime || "-";

  return (
    <section className={`w-full max-w-full rounded-[14px] border border-border bg-surface-card p-1 ${className}`}>
      <div className="flex flex-col gap-3 px-3 sm:px-4 py-2.5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-2">
          <h2 className="text-sm sm:text-base text-white leading-none">Openclaw Gateway</h2>
          <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs leading-none">
            <span className="text-white/50">Last heartbeat</span>
            <span className="font-ibm-plex-mono text-white">{lastHeartbeat}</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs leading-none">
            <span className="text-white/50">Last probe</span>
            <span className="font-ibm-plex-mono text-white">{lastProbe}</span>
          </div>
          <Badge text={status} style={statusBadgeStyle[status]} className="h-4 px-[6px] py-0 leading-[16px]" />
          {loading && <span className="text-xs text-white/50 animate-pulse">Loading...</span>}
          {error && <span className="text-xs text-red">{error}</span>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="primary"
            leftIcon={<RefreshIcon />}
            className="h-9 sm:h-10 sm:min-w-[98px] text-xs sm:text-sm border-border"
            onClick={handleRefresh}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            type="button"
            variant="primary"
            leftIcon={<RestartIcon />}
            className="h-9 sm:h-10 sm:min-w-[98px] text-xs sm:text-sm border-border"
            onClick={handleRestart}
            disabled={loading}
          >
            Restart
          </Button>
          <Button
            type="button"
            variant="secondary"
            leftIcon={<StopIcon />}
            className="h-9 sm:h-10 sm:min-w-[86px] text-xs sm:text-sm text-[#FB2C36] border-transparent bg-red/10 text-red hover:bg-red/20"
            onClick={handleStop}
            disabled={loading}
          >
            Stop
          </Button>
        </div>
      </div>

      <div className="rounded-[10px] bg-surface px-4 py-4">
        <div className="grid grid-cols-2 gap-4 sm:flex sm:items-center">
          <GatewayMetric label="Channel" value={channel} />
          <GatewayMetric label="Ports" value={port} />
          <GatewayMetric label="PID" value={pid} />
          <GatewayMetric label="Uptime" value={uptime} />
        </div>
      </div>
    </section>
  );
}

export default GatewayCard;
