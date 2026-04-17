"use client";

import { useEffect, useState } from "react";

type WebsiteRecord = {
  id: string;
  primaryDomain: string;
  domains: string[];
  type: "proxy" | "static" | "unknown";
  target: string;
  httpsEnabled: boolean;
  certificateExpiry: string | null;
};

export default function ProjectsPage() {
  const [websites, setWebsites] = useState<WebsiteRecord[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch("/api/server/websites", { cache: "no-store" });
        const payload = await response.json();
        if (cancelled) return;
        setWebsites(Array.isArray(payload.websites) ? payload.websites : []);
        setError(payload.ok ? "" : payload.error || "Failed to load websites.");
      } catch {
        if (!cancelled) setError("Failed to load websites.");
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
          Projects
        </h1>
        <p className="text-white/50 font-ibm-plex-mono text-sm uppercase tracking-widest">
          Inventory of active nginx websites and where they point
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {websites.map((site) => (
          <div
            key={site.id}
            className="rounded-2xl border border-border bg-surface-card p-1"
          >
            <div className="rounded-[10px] bg-surface p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-manrope text-white">
                    {site.primaryDomain}
                  </div>
                  <div className="mt-1 text-xs uppercase tracking-widest text-white/40 font-ibm-plex-mono">
                    {site.domains.join(" • ")}
                  </div>
                </div>
                <div className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-widest text-white/70 font-ibm-plex-mono">
                  {site.type}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <div className="text-[11px] uppercase tracking-widest text-white/40 font-ibm-plex-mono">
                    Target
                  </div>
                  <div className="mt-2 break-all text-sm text-white font-ibm-plex-mono">
                    {site.target}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-widest text-white/40 font-ibm-plex-mono">
                    HTTPS
                  </div>
                  <div className="mt-2 text-sm text-white font-ibm-plex-mono">
                    {site.httpsEnabled ? "Enabled" : "HTTP only"}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-widest text-white/40 font-ibm-plex-mono">
                    Certificate
                  </div>
                  <div className="mt-2 text-sm text-white font-ibm-plex-mono">
                    {site.certificateExpiry || "-"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
