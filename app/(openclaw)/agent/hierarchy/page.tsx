"use client";

import { useEffect, useMemo, useState } from "react";

type AgentRecord = {
  id: string;
  name?: string;
  status?: string;
  model?: string;
  capabilities?: unknown;
  tools?: unknown;
  roles?: unknown;
  description?: string;
  task?: string;
  [key: string]: unknown;
};

type StatusTone = {
  dot: string;
  badgeBg: string;
  badgeText: string;
  panelBg: string;
  panelBorder: string;
};

const STATUS_TONES: Record<string, StatusTone> = {
  online: {
    dot: "#00c950",
    badgeBg: "rgba(0,201,80,0.12)",
    badgeText: "#6ee7a0",
    panelBg: "rgba(0,201,80,0.08)",
    panelBorder: "rgba(0,201,80,0.18)",
  },
  active: {
    dot: "#00c950",
    badgeBg: "rgba(0,201,80,0.12)",
    badgeText: "#6ee7a0",
    panelBg: "rgba(0,201,80,0.08)",
    panelBorder: "rgba(0,201,80,0.18)",
  },
  idle: {
    dot: "#00a6f4",
    badgeBg: "rgba(0,166,244,0.12)",
    badgeText: "#86d9ff",
    panelBg: "rgba(0,166,244,0.08)",
    panelBorder: "rgba(0,166,244,0.18)",
  },
  busy: {
    dot: "#f0b100",
    badgeBg: "rgba(240,177,0,0.12)",
    badgeText: "#ffd666",
    panelBg: "rgba(240,177,0,0.08)",
    panelBorder: "rgba(240,177,0,0.18)",
  },
  degraded: {
    dot: "#fe9a00",
    badgeBg: "rgba(254,154,0,0.12)",
    badgeText: "#ffbe73",
    panelBg: "rgba(254,154,0,0.08)",
    panelBorder: "rgba(254,154,0,0.18)",
  },
  offline: {
    dot: "#fb2c36",
    badgeBg: "rgba(251,44,54,0.12)",
    badgeText: "#ff959b",
    panelBg: "rgba(251,44,54,0.08)",
    panelBorder: "rgba(251,44,54,0.18)",
  },
  unknown: {
    dot: "rgba(255,255,255,0.45)",
    badgeBg: "rgba(255,255,255,0.08)",
    badgeText: "rgba(255,255,255,0.72)",
    panelBg: "rgba(255,255,255,0.04)",
    panelBorder: "rgba(255,255,255,0.1)",
  },
};

function normalizeStatus(status?: string) {
  const raw = (status ?? "unknown").trim();
  const lower = raw.toLowerCase();

  if (!raw) return { label: "Unknown", tone: STATUS_TONES.unknown };
  if (lower.includes("online") || lower.includes("healthy") || lower.includes("ready")) {
    return { label: raw, tone: STATUS_TONES.online };
  }
  if (lower.includes("active") || lower.includes("running")) {
    return { label: raw, tone: STATUS_TONES.active };
  }
  if (lower.includes("idle") || lower.includes("standby")) {
    return { label: raw, tone: STATUS_TONES.idle };
  }
  if (lower.includes("busy") || lower.includes("work") || lower.includes("queue")) {
    return { label: raw, tone: STATUS_TONES.busy };
  }
  if (lower.includes("degraded") || lower.includes("warn")) {
    return { label: raw, tone: STATUS_TONES.degraded };
  }
  if (lower.includes("offline") || lower.includes("error") || lower.includes("fail") || lower.includes("down")) {
    return { label: raw, tone: STATUS_TONES.offline };
  }

  return { label: raw, tone: STATUS_TONES.unknown };
}

function toTitleCase(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function parseCapabilityList(agent: AgentRecord) {
  const sources = [agent.capabilities, agent.tools, agent.roles];

  for (const source of sources) {
    if (Array.isArray(source)) {
      return source
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .map((item) => toTitleCase(item))
        .slice(0, 6);
    }

    if (source && typeof source === "object") {
      const enabledEntries = Object.entries(source as Record<string, unknown>)
        .filter(([, enabled]) => Boolean(enabled))
        .map(([key]) => toTitleCase(key));
      if (enabledEntries.length > 0) return enabledEntries.slice(0, 6);
    }

    if (typeof source === "string" && source.trim()) {
      return source
        .split(/[,|]/)
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => toTitleCase(item))
        .slice(0, 6);
    }
  }

  return [];
}

function getHeadline(agent: AgentRecord) {
  const raw =
    (typeof agent.description === "string" && agent.description.trim()) ||
    (typeof agent.task === "string" && agent.task.trim()) ||
    (typeof agent.name === "string" && agent.name.trim()) ||
    "Agent registered and ready for assignment.";

  return raw.length > 120 ? `${raw.slice(0, 117)}...` : raw;
}

function getInitials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return "AG";
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "AG";
}

function getRoleLabel(agent: AgentRecord) {
  return agent.name?.trim() || toTitleCase(agent.id || "Unnamed Agent");
}

export default function AgentHierarchyPage() {
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAgents() {
      try {
        setLoading(true);
        const response = await fetch("/api/control-center/agents", { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to fetch agent registry.");
        const data = await response.json();
        const nextAgents = Array.isArray(data) ? (data as AgentRecord[]) : [];
        if (cancelled) return;
        setAgents(nextAgents);
        setError(null);
      } catch (loadError) {
        if (cancelled) return;
        setAgents([]);
        setError(loadError instanceof Error ? loadError.message : "Failed to fetch agent registry.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadAgents();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const onlineCount = agents.filter((agent) => {
      const status = normalizeStatus(agent.status);
      return status.tone === STATUS_TONES.online || status.tone === STATUS_TONES.active;
    }).length;

    const capabilityCount = agents.reduce((total, agent) => total + parseCapabilityList(agent).length, 0);
    const uniqueModels = new Set(agents.map((agent) => agent.model).filter((model): model is string => Boolean(model?.trim())));

    return {
      total: agents.length,
      online: onlineCount,
      models: uniqueModels.size,
      capabilities: capabilityCount,
    };
  }, [agents]);

  return (
    <main className="flex h-full w-full flex-col gap-4 overflow-hidden p-6">
      <div className="mb-2 flex flex-col gap-1">
        <h1 className="font-manrope text-2xl font-medium text-white">Hierarchy</h1>
        <p className="font-ibm-plex-mono text-sm uppercase tracking-widest text-white/50">
          Live agent registry cards backed by the control-center agents endpoint.
        </p>
      </div>

      <section className="grid grid-cols-1 gap-[10px] md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Registered Agents", value: String(stats.total).padStart(2, "0") },
          { label: "Online / Active", value: String(stats.online).padStart(2, "0") },
          { label: "Model Variants", value: String(stats.models).padStart(2, "0") },
          { label: "Visible Capabilities", value: String(stats.capabilities).padStart(2, "0") },
        ].map((item) => (
          <article
            key={item.label}
            className="rounded-[14px] border border-[rgba(255,255,255,0.1)] bg-[#151618] p-[4px]"
          >
            <div className="flex h-full flex-col rounded-[10px] bg-[#111214] p-4">
              <span className="font-ibm-plex-mono text-[10px] uppercase tracking-[0.24em] text-white/40">
                {item.label}
              </span>
              <strong className="mt-3 font-manrope text-[32px] font-medium leading-none text-white">
                {item.value}
              </strong>
            </div>
          </article>
        ))}
      </section>

      {loading && (
        <div className="rounded-[14px] border border-white/10 bg-[#151618] p-4 text-white/70">
          Loading agent registry...
        </div>
      )}

      {!loading && error && (
        <div className="rounded-[14px] border border-rose-400/40 bg-rose-500/10 p-4 text-rose-200">
          {error}
        </div>
      )}

      {!loading && !error && agents.length === 0 && (
        <div className="rounded-[14px] border border-white/10 bg-[#151618] p-[4px]">
          <div className="flex flex-col items-start gap-3 rounded-[10px] bg-[#111214] p-5">
            <span className="font-ibm-plex-mono text-[10px] uppercase tracking-[0.24em] text-white/40">
              Agent Registry
            </span>
            <h2 className="font-manrope text-[18px] text-white">No agents registered yet</h2>
            <p className="max-w-2xl font-manrope text-[14px] leading-6 text-white/60">
              The hierarchy view is wired to the real endpoint now, but the registry is currently empty. Once agents are available,
              they will appear here with status, model, and capability metadata.
            </p>
          </div>
        </div>
      )}

      {!loading && !error && agents.length > 0 && (
        <section className="grid min-h-0 grid-cols-1 gap-[10px] overflow-y-auto pr-1 lg:grid-cols-2 2xl:grid-cols-3">
          {agents.map((agent) => {
            const roleLabel = getRoleLabel(agent);
            const status = normalizeStatus(agent.status);
            const capabilities = parseCapabilityList(agent);
            const modelLabel = agent.model?.trim() || "Unspecified model";
            const headline = getHeadline(agent);

            return (
              <article
                key={agent.id}
                className="rounded-[14px] border border-[rgba(255,255,255,0.1)] bg-[#151618] p-[4px]"
              >
                <div className="flex h-full flex-col gap-[10px] rounded-[10px] bg-[#111214] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] border border-white/10 bg-[#151618] font-ibm-plex-mono text-[14px] uppercase text-white"
                        aria-hidden
                      >
                        {getInitials(roleLabel)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-manrope text-[18px] font-medium text-white">{roleLabel}</p>
                        <p className="mt-1 truncate font-ibm-plex-mono text-[10px] uppercase tracking-[0.18em] text-white/40">
                          {agent.id}
                        </p>
                      </div>
                    </div>

                    <span
                      className="inline-flex h-[24px] shrink-0 items-center gap-2 rounded-[999px] px-[10px] font-ibm-plex-mono text-[10px] uppercase tracking-[0.14em]"
                      style={{
                        backgroundColor: status.tone.badgeBg,
                        color: status.tone.badgeText,
                      }}
                    >
                      <span
                        className="h-[6px] w-[6px] rounded-full"
                        style={{ backgroundColor: status.tone.dot }}
                      />
                      {status.label}
                    </span>
                  </div>

                  <div
                    className="rounded-[12px] border p-4"
                    style={{
                      backgroundColor: status.tone.panelBg,
                      borderColor: status.tone.panelBorder,
                    }}
                  >
                    <p className="font-ibm-plex-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
                      Active Context
                    </p>
                    <p className="mt-2 font-manrope text-[14px] leading-6 text-white/80">{headline}</p>
                  </div>

                  <div className="grid grid-cols-1 gap-[10px] sm:grid-cols-2">
                    <div className="rounded-[12px] border border-white/10 bg-[#151618] p-4">
                      <p className="font-ibm-plex-mono text-[10px] uppercase tracking-[0.2em] text-white/40">Model</p>
                      <p className="mt-2 break-words font-manrope text-[14px] text-white">{modelLabel}</p>
                    </div>
                    <div className="rounded-[12px] border border-white/10 bg-[#151618] p-4">
                      <p className="font-ibm-plex-mono text-[10px] uppercase tracking-[0.2em] text-white/40">Capability Count</p>
                      <p className="mt-2 font-manrope text-[14px] text-white">
                        {capabilities.length > 0 ? String(capabilities.length).padStart(2, "0") : "00"}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-[12px] border border-white/10 bg-[#151618] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-ibm-plex-mono text-[10px] uppercase tracking-[0.2em] text-white/40">Capabilities</p>
                      <span className="font-ibm-plex-mono text-[10px] uppercase tracking-[0.14em] text-white/30">
                        {capabilities.length > 0 ? "Live" : "Not reported"}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {capabilities.length > 0 ? (
                        capabilities.map((capability) => (
                          <span
                            key={`${agent.id}-${capability}`}
                            className="rounded-[999px] border border-white/10 bg-white/[0.04] px-3 py-1 font-ibm-plex-mono text-[10px] uppercase tracking-[0.14em] text-white/72"
                          >
                            {capability}
                          </span>
                        ))
                      ) : (
                        <p className="font-manrope text-[13px] leading-6 text-white/50">
                          This agent did not expose capability metadata from the current endpoint response.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
