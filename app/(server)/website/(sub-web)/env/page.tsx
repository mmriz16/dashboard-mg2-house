"use client";

import { useEffect, useState } from "react";

type EnvironmentPayload = {
  ok: boolean;
  error?: string;
  environment: {
    local: Array<{
      file: string;
      keys: string[];
    }>;
    docker: Array<{
      name: string;
      keys: string[];
    }>;
  };
};

export default function EnvironmentsPage() {
  const [environment, setEnvironment] = useState<EnvironmentPayload["environment"]>({
    local: [],
    docker: [],
  });
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch("/api/server/environment", {
          cache: "no-store",
        });
        const payload = (await response.json()) as EnvironmentPayload;
        if (cancelled) return;
        setEnvironment(payload.environment);
        setError(payload.ok ? "" : payload.error || "Failed to load environment.");
      } catch {
        if (!cancelled) setError("Failed to load environment.");
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
        <h1 className="text-2xl font-manrope font-medium text-white">
          Environments
        </h1>
        <p className="text-white/50 font-ibm-plex-mono text-sm uppercase tracking-widest">
          Safe env snapshot showing keys only, never secret values
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-border bg-surface-card p-1">
          <div className="px-4 py-2.5 text-sm font-manrope text-white">
            Dashboard Env Files
          </div>
          <div className="rounded-[10px] bg-surface p-4 space-y-3">
            {environment.local.map((entry) => (
              <div key={entry.file} className="rounded-xl border border-border bg-surface-card p-4">
                <div className="text-sm text-white font-manrope">{entry.file}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {entry.keys.map((key) => (
                    <span
                      key={`${entry.file}:${key}`}
                      className="rounded-full border border-border px-3 py-1 text-xs text-white/70 font-ibm-plex-mono"
                    >
                      {key}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface-card p-1">
          <div className="px-4 py-2.5 text-sm font-manrope text-white">
            Docker Env Keys
          </div>
          <div className="rounded-[10px] bg-surface p-4 space-y-3">
            {environment.docker.map((entry) => (
              <div key={entry.name} className="rounded-xl border border-border bg-surface-card p-4">
                <div className="text-sm text-white font-manrope">{entry.name}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {entry.keys.length ? (
                    entry.keys.map((key) => (
                      <span
                        key={`${entry.name}:${key}`}
                        className="rounded-full border border-border px-3 py-1 text-xs text-white/70 font-ibm-plex-mono"
                      >
                        {key}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-white/40 font-ibm-plex-mono">
                      No env keys reported
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
