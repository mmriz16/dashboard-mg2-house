import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export interface TokenUsageEntry {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  timestamp: string;
  requestId?: string;
}

export interface RequestCountEntry {
  model: string;
  timestamp: string;
  requestId?: string;
}

export interface ModelTokenUsage {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  requests: number;
  lastUsed?: string;
}

export interface TokenUsageData {
  totalTokens: number;
  dailyTokens: number;
  weeklyTokens: number;
  monthlyTokens: number;
  models: ModelTokenUsage[];
  quota?: {
    total: number;
    used: number;
    remaining: number;
    expiresAt?: string;
  };
  lastUpdated: string;
}

interface TokenUsageStorage {
  entries: TokenUsageEntry[];
  requestCounts: RequestCountEntry[];
  lastUpdated: string;
}

const USAGE_FILE_PATH = path.join(process.cwd(), "memory", "bailian-token-usage.json");

// Alibaba Cloud Bailian quota limits (Coding Plan Lite)
// Source: User confirmation - 18,000 requests/month total
const QUOTA_CONFIG = {
  tokens: {
    total: 1_000_000, // 1M tokens (theoretical max for lite plan)
    expiresAt: "2026-06-02T00:00:00.000Z",
  },
  requests: {
    total: 18000, // Coding Plan Lite - 18K requests/month total (shared across all models)
    window: "30 days",
    expiresAt: "2026-06-02T00:00:00.000Z",
  },
};

// Time constants in milliseconds
const MS_IN_HOUR = 60 * 60 * 1000;
const MS_IN_5_HOURS = 5 * MS_IN_HOUR;
const MS_IN_DAY = 24 * MS_IN_HOUR;
const MS_IN_WEEK = 7 * MS_IN_DAY;
const MS_IN_MONTH = 30 * MS_IN_DAY;
const MS_IN_90_DAYS = 90 * MS_IN_DAY;

async function readUsageFile(): Promise<TokenUsageStorage> {
  try {
    const content = await fs.readFile(USAGE_FILE_PATH, "utf-8");
    const parsed = JSON.parse(content);
    if (!parsed.requestCounts) {
      parsed.requestCounts = [];
    }
    return parsed;
  } catch {
    return {
      entries: [],
      requestCounts: [],
      lastUpdated: new Date().toISOString(),
    };
  }
}

async function writeUsageFile(data: TokenUsageStorage) {
  const dir = path.dirname(USAGE_FILE_PATH);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(USAGE_FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
}

interface TimeSeriesResult {
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
  models: ModelTokenUsage[];
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function normalizeTokenUsagePayload(body: unknown): {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  requestId?: string;
} | null {
  if (!body || typeof body !== "object") return null;

  const payload = body as Record<string, unknown>;
  const usage = payload.usage && typeof payload.usage === "object"
    ? (payload.usage as Record<string, unknown>)
    : null;
  const tokenUsage = payload.tokenUsage && typeof payload.tokenUsage === "object"
    ? (payload.tokenUsage as Record<string, unknown>)
    : null;
  const metrics = payload.metrics && typeof payload.metrics === "object"
    ? (payload.metrics as Record<string, unknown>)
    : null;

  const model = [
    payload.model,
    payload.modelName,
    payload.model_name,
    usage?.model,
    tokenUsage?.model,
    metrics?.model,
  ].find((value): value is string => typeof value === "string" && value.trim().length > 0)?.trim();

  if (!model) return null;

  const promptTokens =
    toFiniteNumber(payload.promptTokens) ??
    toFiniteNumber(payload.prompt_tokens) ??
    toFiniteNumber(usage?.promptTokens) ??
    toFiniteNumber(usage?.prompt_tokens) ??
    toFiniteNumber(tokenUsage?.promptTokens) ??
    toFiniteNumber(tokenUsage?.prompt_tokens) ??
    0;

  const completionTokens =
    toFiniteNumber(payload.completionTokens) ??
    toFiniteNumber(payload.completion_tokens) ??
    toFiniteNumber(payload.outputTokens) ??
    toFiniteNumber(payload.output_tokens) ??
    toFiniteNumber(usage?.completionTokens) ??
    toFiniteNumber(usage?.completion_tokens) ??
    toFiniteNumber(usage?.outputTokens) ??
    toFiniteNumber(usage?.output_tokens) ??
    toFiniteNumber(tokenUsage?.completionTokens) ??
    toFiniteNumber(tokenUsage?.completion_tokens) ??
    0;

  const totalTokens =
    toFiniteNumber(payload.totalTokens) ??
    toFiniteNumber(payload.total_tokens) ??
    toFiniteNumber(payload.tokens) ??
    toFiniteNumber(usage?.totalTokens) ??
    toFiniteNumber(usage?.total_tokens) ??
    toFiniteNumber(usage?.tokens) ??
    toFiniteNumber(tokenUsage?.totalTokens) ??
    toFiniteNumber(tokenUsage?.total_tokens) ??
    toFiniteNumber(tokenUsage?.tokens) ??
    (() => {
      const derived = promptTokens + completionTokens;
      return derived > 0 ? derived : null;
    })();

  if (totalTokens === null) return null;

  const requestId = [
    payload.requestId,
    payload.request_id,
    payload.id,
    usage?.requestId,
    usage?.request_id,
    tokenUsage?.requestId,
    tokenUsage?.request_id,
    metrics?.requestId,
    metrics?.request_id,
  ].find((value): value is string => typeof value === "string" && value.trim().length > 0)?.trim();

  return {
    model,
    promptTokens,
    completionTokens,
    totalTokens,
    requestId,
  };
}

function calculateTimeSeriesData(
  entries: TokenUsageEntry[],
  requestCounts: RequestCountEntry[]
): TimeSeriesResult {
  const now = new Date();
  const nowTime = now.getTime();

  const fiveHoursCutoff = nowTime - MS_IN_5_HOURS;
  const dailyCutoff = nowTime - MS_IN_DAY;
  const weeklyCutoff = nowTime - MS_IN_WEEK;
  const monthlyCutoff = nowTime - MS_IN_MONTH;

  let fiveHoursTokens = 0;
  let dailyTokens = 0;
  let weeklyTokens = 0;
  let monthlyTokens = 0;
  let totalTokens = 0;

  let fiveHoursRequests = 0;
  let dailyRequests = 0;
  let weeklyRequests = 0;
  let monthlyRequests = 0;
  let totalRequests = 0;

  const modelMap = new Map<string, ModelTokenUsage>();

  for (const entry of entries) {
    const entryTime = new Date(entry.timestamp).getTime();
    const tokens = entry.totalTokens;

    totalTokens += tokens;
    if (entryTime >= monthlyCutoff) monthlyTokens += tokens;
    if (entryTime >= weeklyCutoff) weeklyTokens += tokens;
    if (entryTime >= dailyCutoff) dailyTokens += tokens;
    if (entryTime >= fiveHoursCutoff) fiveHoursTokens += tokens;

    let modelStats = modelMap.get(entry.model);
    if (!modelStats) {
      modelStats = {
        model: entry.model,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        requests: 0,
        lastUsed: entry.timestamp,
      };
      modelMap.set(entry.model, modelStats);
    }

    modelStats.promptTokens += entry.promptTokens || 0;
    modelStats.completionTokens += entry.completionTokens || 0;
    modelStats.totalTokens += tokens;
    modelStats.requests += 1;

    if (!modelStats.lastUsed || entryTime > new Date(modelStats.lastUsed).getTime()) {
      modelStats.lastUsed = entry.timestamp;
    }
  }

  for (const req of requestCounts) {
    const entryTime = new Date(req.timestamp).getTime();

    totalRequests += 1;
    if (entryTime >= monthlyCutoff) monthlyRequests += 1;
    if (entryTime >= weeklyCutoff) weeklyRequests += 1;
    if (entryTime >= dailyCutoff) dailyRequests += 1;
    if (entryTime >= fiveHoursCutoff) fiveHoursRequests += 1;
  }

  return {
    tokens: {
      total: totalTokens,
      fiveHours: fiveHoursTokens,
      daily: dailyTokens,
      weekly: weeklyTokens,
      monthly: monthlyTokens,
    },
    requests: {
      total: totalRequests,
      fiveHours: fiveHoursRequests,
      daily: dailyRequests,
      weekly: weeklyRequests,
      monthly: monthlyRequests,
    },
    models: Array.from(modelMap.values()),
  };
}

function cleanupOldEntries<T extends { timestamp: string }>(entries: T[]): T[] {
  const cutoff = Date.now() - MS_IN_90_DAYS;
  return entries.filter((entry) => {
    const entryTime = new Date(entry.timestamp).getTime();
    return entryTime >= cutoff;
  });
}

function hasRequestIdConflict(storage: TokenUsageStorage, requestId: string): boolean {
  return storage.entries.some((entry) => entry.requestId === requestId)
    || storage.requestCounts.some((entry) => entry.requestId === requestId);
}

function buildUsageResponse(storage: TokenUsageStorage) {
  const usage = calculateTimeSeriesData(storage.entries, storage.requestCounts);
  const requestQuota = {
    total: QUOTA_CONFIG.requests.total,
    used: usage.requests.monthly,
    remaining: Math.max(0, QUOTA_CONFIG.requests.total - usage.requests.monthly),
    expiresAt: QUOTA_CONFIG.requests.expiresAt,
  };

  return {
    tokens: usage.tokens,
    requests: usage.requests,
    models: usage.models,
    quota: {
      tokens: {
        total: QUOTA_CONFIG.tokens.total,
        used: usage.tokens.monthly,
        remaining: Math.max(0, QUOTA_CONFIG.tokens.total - usage.tokens.monthly),
        expiresAt: QUOTA_CONFIG.tokens.expiresAt,
      },
      requests: requestQuota,
    },
    lastUpdated: storage.lastUpdated,
  };
}

export async function GET(request: NextRequest) {
  try {
    void request;
    const storage = await readUsageFile();

    const cleanedEntries = cleanupOldEntries(storage.entries);
    const cleanedRequests = cleanupOldEntries(storage.requestCounts);
    if (cleanedEntries.length !== storage.entries.length || cleanedRequests.length !== storage.requestCounts.length) {
      storage.entries = cleanedEntries;
      storage.requestCounts = cleanedRequests;
      await writeUsageFile(storage);
    }

    return NextResponse.json(buildUsageResponse(storage));
  } catch (error) {
    console.error("Error reading token usage:", error);
    return NextResponse.json(
      { error: "Failed to read token usage" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const normalized = normalizeTokenUsagePayload(body);

    if (!normalized) {
      return NextResponse.json(
        { error: "Missing required fields: model + token totals (totalTokens or prompt/completion tokens)" },
        { status: 400 }
      );
    }

    const storage = await readUsageFile();
    const now = new Date().toISOString();

    if (normalized.requestId && hasRequestIdConflict(storage, normalized.requestId)) {
      return NextResponse.json({
        ok: true,
        deduped: true,
        usage: buildUsageResponse(storage),
      });
    }

    const newEntry: TokenUsageEntry = {
      model: normalized.model,
      promptTokens: normalized.promptTokens,
      completionTokens: normalized.completionTokens,
      totalTokens: normalized.totalTokens,
      timestamp: now,
      requestId: normalized.requestId,
    };

    const newRequestEntry: RequestCountEntry = {
      model: normalized.model,
      timestamp: now,
      requestId: normalized.requestId,
    };

    storage.entries.push(newEntry);
    storage.requestCounts.push(newRequestEntry);
    storage.lastUpdated = now;
    storage.entries = cleanupOldEntries(storage.entries);
    storage.requestCounts = cleanupOldEntries(storage.requestCounts);

    await writeUsageFile(storage);

    return NextResponse.json({
      ok: true,
      deduped: false,
      usage: buildUsageResponse(storage),
      entry: newEntry,
    });
  } catch (error) {
    console.error("Error logging token usage:", error);
    return NextResponse.json(
      { error: "Failed to log token usage" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { reset, before } = body;

    const storage = await readUsageFile();

    if (reset === "all") {
      storage.entries = [];
      storage.requestCounts = [];
      storage.lastUpdated = new Date().toISOString();
      await writeUsageFile(storage);

      return NextResponse.json({ ok: true, usage: buildUsageResponse(storage) });
    }

    if (reset === "daily") {
      const dailyCutoff = Date.now() - MS_IN_DAY;
      storage.entries = storage.entries.filter((entry) => new Date(entry.timestamp).getTime() < dailyCutoff);
      storage.requestCounts = storage.requestCounts.filter((entry) => new Date(entry.timestamp).getTime() < dailyCutoff);
      storage.lastUpdated = new Date().toISOString();
      await writeUsageFile(storage);

      return NextResponse.json({ ok: true, usage: buildUsageResponse(storage) });
    }

    if (reset === "before" && before) {
      const cutoffTime = new Date(before).getTime();
      storage.entries = storage.entries.filter((entry) => new Date(entry.timestamp).getTime() >= cutoffTime);
      storage.requestCounts = storage.requestCounts.filter((entry) => new Date(entry.timestamp).getTime() >= cutoffTime);
      storage.lastUpdated = new Date().toISOString();
      await writeUsageFile(storage);

      return NextResponse.json({ ok: true, usage: buildUsageResponse(storage) });
    }

    return NextResponse.json(
      { error: "Invalid reset value. Use 'all', 'daily', or 'before' with ISO date" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error resetting token usage:", error);
    return NextResponse.json(
      { error: "Failed to reset token usage" },
      { status: 500 }
    );
  }
}
