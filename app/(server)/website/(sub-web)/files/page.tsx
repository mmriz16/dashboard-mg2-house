"use client";

import { useEffect, useState } from "react";

type WebsiteRecord = {
  id: string;
  file: string;
  primaryDomain: string;
  type: "proxy" | "static" | "unknown";
  target: string;
  certificatePath: string;
};

export default function FilesPage() {
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
        setError(payload.ok ? "" : payload.error || "Failed to load files.");
      } catch {
        if (!cancelled) setError("Failed to load files.");
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-manrope font-medium text-white">Files</h1>
        <p className="text-white/50 font-ibm-plex-mono text-sm uppercase tracking-widest">
          Relevant nginx config, static roots, and certificate file paths
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
              <div className="text-lg text-white font-manrope">
                {site.primaryDomain}
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <div className="text-[11px] uppercase tracking-widest text-white/40 font-ibm-plex-mono">
                    Nginx Config
                  </div>
                  <div className="mt-2 text-sm break-all text-white font-ibm-plex-mono">
                    {site.file}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-widest text-white/40 font-ibm-plex-mono">
                    Target / Root
                  </div>
                  <div className="mt-2 text-sm break-all text-white font-ibm-plex-mono">
                    {site.target}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-widest text-white/40 font-ibm-plex-mono">
                    Certificate File
                  </div>
                  <div className="mt-2 text-sm break-all text-white font-ibm-plex-mono">
                    {site.certificatePath || "-"}
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
