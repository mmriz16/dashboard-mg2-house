"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

/* ── Types ─────────────────────────────────────────────────── */

export interface ModelUsage {
    name: string;
    logo: string;
    percentage: number;
    color: string;
}

export interface TokenUsageData {
    requests: {
        fiveHours: number;
        daily: number;
        weekly: number;
        monthly: number;
    };
    models: ModelUsage[];
    quota?: {
        total: number;
        used: number;
        remaining: number;
        expiresAt?: string;
    };
}

interface ApiTokenUsageData {
    tokens: {
        total: number;
        fiveHours: number;
        daily: number;
        weekly: number;
        monthly: number;
    };
    requests: {
        total: number;
        fiveHours: number;
        daily: number;
        weekly: number;
        monthly: number;
    };
    models: Array<{
        model: string;
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
        requests: number;
        lastUsed?: string;
    }>;
    quota?: {
        tokens: {
            total: number;
            used: number;
            remaining: number;
            expiresAt?: string;
        };
        requests: {
            total: number;
            used: number;
            remaining: number;
            expiresAt?: string;
        };
    };
    lastUpdated: string;
}

interface TokenUsageCardProps {
    className?: string;
    data?: TokenUsageData;
}

/* ── Helpers ───────────────────────────────────────────────── */

function formatNumber(n: number): string {
    return n.toLocaleString("en-US");
}

function formatCompact(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2).replace(".", ",")}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(".", ",")}K`;
    return n.toString();
}

// Badge colors based on quota remaining percentage
function getBadgeColors(pct: number): { bg: string; text: string } {
    if (pct >= 70) return { bg: "rgba(0,201,80,0.1)", text: "#00C950" };
    if (pct >= 30) return { bg: "rgba(240,177,0,0.1)", text: "#F0B100" };
    return { bg: "rgba(251,44,54,0.1)", text: "#FB2C36" };
}

function getBarColor(pct: number): string {
    if (pct >= 70) return "#1EC581";
    if (pct >= 30) return "#F8DD16";
    return "#FC701A";
}

/* ── Model logo mapping ────────────────────────────────────── */

const MODEL_LOGO_MAP: Record<string, { name: string; logo: string; color: string }> = {
    "qwen3.5-plus": { name: "Qwen3.5 Plus", logo: "/logos/qwen-color.svg", color: "#F0B100" },
    "qwen3-coder-plus": { name: "Qwen3 Coding Plus", logo: "/logos/qwen-color.svg", color: "#F0B100" },
    "glm-5": { name: "GLM 5", logo: "/logos/zai.svg", color: "#00C950" },
    "kimi-k2.5": { name: "Kimi K2.5", logo: "/logos/kimi-color.svg", color: "#FB2C36" },
    "minimax-m2.5": { name: "Minimax M2.5", logo: "/logos/minimax-color.svg", color: "#F0B100" },
};

function getModelDisplay(model: string) {
    const key = model.toLowerCase();
    for (const [k, v] of Object.entries(MODEL_LOGO_MAP)) {
        if (key.includes(k)) return v;
    }
    return { name: model, logo: "/logos/qwen-color.svg", color: "#9CA3AF" };
}

/* ── Default mock data ─────────────────────────────────────── */

const defaultData: TokenUsageData = {
    requests: {
        fiveHours: 5,
        daily: 9,
        weekly: 20,
        monthly: 45,
    },
    models: [
        { name: "Qwen3.5 Plus", logo: "/logos/qwen-color.svg", percentage: 36, color: "#00C950" },
        { name: "Qwen3 Coding Plus", logo: "/logos/qwen-color.svg", percentage: 28, color: "#00C950" },
        { name: "GLM 5", logo: "/logos/zai.svg", percentage: 18, color: "#00C950" },
        { name: "Kimi K2.5", logo: "/logos/kimi-color.svg", percentage: 12, color: "#00C950" },
        { name: "Minimax M2.5", logo: "/logos/minimax-color.svg", percentage: 6, color: "#00C950" },
    ],
    quota: {
        total: 18000,
        used: 45,
        remaining: 17955,
        expiresAt: "2026-06-02T00:00:00.000Z",
    },
};

/* ── Component ─────────────────────────────────────────────── */

export function TokenUsageCard({ className = "", data: externalData }: TokenUsageCardProps) {
    const [data, setData] = useState<TokenUsageData>(externalData || defaultData);
    const [loading, setLoading] = useState(!externalData);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (externalData) return;

        const fetchUsage = async () => {
            try {
                const res = await fetch("/api/openclaw/token-usage", { cache: "no-store" });
                if (!res.ok) throw new Error("Failed to fetch token usage");
                const apiData: ApiTokenUsageData = await res.json();

                // Calculate total requests for percentage calculation
                const totalRequests = apiData.models.reduce((sum, m) => sum + m.requests, 0);
                
                // Calculate quota remaining percentage for badge colors
                const quotaRemainingPct = apiData.quota?.requests 
                    ? (apiData.quota.requests.remaining / apiData.quota.requests.total) * 100 
                    : 100;
                
                const badgeColors = getBadgeColors(quotaRemainingPct);

                // Transform API data to component format
                const models = apiData.models.map((m) => {
                    const display = getModelDisplay(m.model);
                    const percentage = totalRequests > 0 ? Math.round((m.requests / totalRequests) * 100) : 0;
                    return {
                        name: display.name,
                        logo: display.logo,
                        percentage,
                        color: badgeColors.text, // All badges same color based on quota health
                    };
                });

                setData({
                    requests: apiData.requests,
                    models,
                    quota: apiData.quota?.requests,
                });
            } catch (err) {
                setError(err instanceof Error ? err.message : "Unknown error");
            } finally {
                setLoading(false);
            }
        };

        void fetchUsage();
        const intervalId = setInterval(fetchUsage, 30000);
        return () => clearInterval(intervalId);
    }, [externalData]);

    if (loading) {
        return (
            <section className={`flex flex-col gap-2.5 rounded-[14px] border border-white/10 bg-surface-card p-1 ${className}`}>
                <div className="flex flex-col w-full animate-pulse">
                    <div className="flex flex-col justify-center rounded-[10px] bg-surface p-2.5 w-full">
                        <div className="h-4 w-24 bg-white/10 rounded mb-2" />
                        <div className="h-7 w-32 bg-white/10 rounded" />
                    </div>
                    <div className="flex items-center gap-0.5 p-2.5 w-full">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex-1 flex flex-col">
                                <div className="h-3 w-12 bg-white/10 rounded mb-1" />
                                <div className="h-4 w-16 bg-white/10 rounded" />
                            </div>
                        ))}
                    </div>
                </div>
                <div className="px-2.5 w-full">
                    <div className="h-1 w-full bg-white/10 rounded-[10px]" />
                </div>
                <div className="flex flex-col w-full rounded-[10px] bg-surface overflow-hidden">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center gap-2.5 px-2 py-2.5">
                            <div className="h-4 w-4 bg-white/10 rounded" />
                            <div className="flex-1 h-3 bg-white/10 rounded" />
                            <div className="h-4 w-8 bg-white/10 rounded" />
                        </div>
                    ))}
                </div>
            </section>
        );
    }

    if (error) {
        return (
            <section className={`flex flex-col gap-2.5 rounded-[14px] border border-white/10 bg-surface-card p-1 ${className}`}>
                <div className="flex flex-col justify-center rounded-[10px] bg-surface p-2.5 w-full">
                    <p className="font-manrope text-[14px] text-white/50">Monthly Requests</p>
                    <p className="font-ibm-plex-mono text-[26px] text-rose-400 leading-tight">Error</p>
                </div>
                <p className="text-xs text-white/50 px-2.5">{error}</p>
            </section>
        );
    }

    const quotaRemainingPct = data.quota ? (data.quota.remaining / data.quota.total) * 100 : 100;

    return (
        <section className={`flex flex-col gap-2.5 rounded-[14px] border border-white/10 bg-surface-card p-1 ${className}`}>
            {/* ── Total + Breakdown ─────────────────────────────── */}
            <div className="flex flex-col w-full">
                {/* Monthly Usage (main metric) */}
                <div className="flex flex-col justify-center rounded-[10px] bg-surface p-2.5 w-full">
                    <p className="font-manrope text-[14px] text-white/50">Monthly Requests</p>
                    <p className="font-ibm-plex-mono text-[26px] text-white leading-tight">
                        {formatNumber(data.requests.monthly)}
                    </p>
                    {data.quota && (
                        <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                        width: `${Math.min(100, quotaRemainingPct)}%`,
                                        backgroundColor: getBarColor(quotaRemainingPct),
                                    }}
                                />
                            </div>
                            <span className="font-ibm-plex-mono text-[10px] text-white/50 whitespace-nowrap">
                                {formatCompact(data.quota.remaining)} left
                            </span>
                        </div>
                    )}
                </div>

                {/* 5 Hours / Daily / Weekly / Monthly */}
                <div className="flex items-center gap-0.5 p-2.5 w-full">
                    <div className="flex-1 flex flex-col">
                        <p className="font-manrope text-[10px] text-white/50">5 Hours</p>
                        <p className="font-ibm-plex-mono text-[14px] text-white">{formatCompact(data.requests.fiveHours)}</p>
                    </div>
                    <div className="flex-1 flex flex-col">
                        <p className="font-manrope text-[10px] text-white/50">Daily</p>
                        <p className="font-ibm-plex-mono text-[14px] text-white">{formatCompact(data.requests.daily)}</p>
                    </div>
                    <div className="flex-1 flex flex-col">
                        <p className="font-manrope text-[10px] text-white/50">Weekly</p>
                        <p className="font-ibm-plex-mono text-[14px] text-white">{formatCompact(data.requests.weekly)}</p>
                    </div>
                    <div className="flex-1 flex flex-col">
                        <p className="font-manrope text-[10px] text-white/50">Monthly</p>
                        <p className="font-ibm-plex-mono text-[14px] text-white">{formatCompact(data.requests.monthly)}</p>
                    </div>
                </div>
            </div>

            {/* ── Progress Bar ──────────────────────────────────── */}
            <div className="px-2.5 w-full">
                <div className="flex h-1 w-full gap-0.5 rounded-[10px] overflow-hidden">
                    {data.models.map((model) => (
                        <div
                            key={model.name}
                            className="h-full"
                            style={{
                                backgroundColor: model.color,
                                flex: `${model.percentage} 0 0`,
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* ── Model List ────────────────────────────────────── */}
            <div className="flex flex-col w-full rounded-[10px] bg-surface overflow-hidden">
                <div className="flex flex-col w-full h-fit">
                    {data.models.map((model) => {
                        const badge = getBadgeColors(quotaRemainingPct);
                        return (
                            <div
                                key={model.name}
                                className="flex items-center gap-2.5 px-2 py-2.5 rounded-lg w-full shrink-0"
                            >
                                <Image
                                    src={model.logo}
                                    alt={model.name}
                                    width={16}
                                    height={16}
                                    className="shrink-0"
                                />
                                <p className="flex-1 font-ibm-plex-mono text-[12px] text-white whitespace-nowrap overflow-hidden text-ellipsis">
                                    {model.name}
                                </p>
                                <span
                                    className="flex h-4 items-center justify-center px-1.5 rounded-full font-ibm-plex-mono text-[10px] uppercase shrink-0"
                                    style={{ backgroundColor: badge.bg, color: badge.text }}
                                    title={`${model.percentage}% of total requests`}
                                >
                                    {model.percentage}%
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

export default TokenUsageCard;
