"use client";

import { useEffect, useMemo, useState } from "react";

type WebsiteRecord = {
  id: string;
  primaryDomain: string;
  domains: string[];
  httpsEnabled: boolean;
  certificatePath: string;
  certificateExpiry: string | null;
};

export default function DomainsPage() {
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
        setError(payload.ok ? "" : payload.error || "Failed to load domains.");
      } catch {
        if (!cancelled) setError("Failed to load domains.");
      }
    };
    void load();
    const timer = setInterval(() => void load(), 30000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const domainRows = useMemo(
    () =>
      websites.flatMap((site) =>
        site.domains.map((domain) => ({
          domain,
          primaryDomain: site.primaryDomain,
          httpsEnabled: site.httpsEnabled,
          certificateExpiry: site.certificateExpiry,
          certificatePath: site.certificatePath,
        })),
      ),
    [websites],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-manrope font-medium text-white">
          Domains & SSL
        </h1>
        <p className="text-white/50 font-ibm-plex-mono text-sm uppercase tracking-widest">
          Domain aliases, HTTPS state, and certificate expiry
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-border bg-surface-card p-1">
        <div className="rounded-[10px] bg-surface p-2">
          <div className="grid grid-cols-[1.4fr_1fr_1fr] gap-2 px-3 py-2 text-[11px] uppercase tracking-widest text-white/40 font-ibm-plex-mono">
            <div>Domain</div>
            <div>HTTPS</div>
            <div>Certificate Expiry</div>
          </div>
          <div className="space-y-2">
            {domainRows.map((row) => (
              <div
                key={`${row.primaryDomain}:${row.domain}`}
                className="grid grid-cols-[1.4fr_1fr_1fr] gap-2 rounded-xl border border-border bg-surface-card px-3 py-3 text-sm text-white"
              >
                <div className="min-w-0">
                  <div className="font-manrope">{row.domain}</div>
                  {row.domain !== row.primaryDomain && (
                    <div className="mt-1 text-xs text-white/40 font-ibm-plex-mono">
                      primary: {row.primaryDomain}
                    </div>
                  )}
                </div>
                <div className="font-ibm-plex-mono">
                  {row.httpsEnabled ? "Enabled" : "HTTP only"}
                </div>
                <div className="font-ibm-plex-mono">
                  {row.certificateExpiry || "-"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
