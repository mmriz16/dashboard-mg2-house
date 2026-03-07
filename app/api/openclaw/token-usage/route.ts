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
    // Ensure requestCounts array exists (migration from old format)
    if (!parsed.requestCounts) {
      parsed.requestCounts = [];
    }
    return parsed;
  } catch {
    // Return default empty structure if file doesn't exist
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
  
  // Token calculations
  let fiveHoursTokens = 0;
  let dailyTokens = 0;
  let weeklyTokens = 0;
  let monthlyTokens = 0;
  let totalTokens = 0;
  
  // Request count calculations
  let fiveHoursRequests = 0;
  let dailyRequests = 0;
  let weeklyRequests = 0;
  let monthlyRequests = 0;
  let totalRequests = 0;
  
  const modelMap = new Map<string, ModelTokenUsage>();
  
  // Process token entries
  for (const entry of entries) {
    const entryTime = new Date(entry.timestamp).getTime();
    const tokens = entry.totalTokens;
    
    totalTokens += tokens;
    if (entryTime >= monthlyCutoff) monthlyTokens += tokens;
    if (entryTime >= weeklyCutoff) weeklyTokens += tokens;
    if (entryTime >= dailyCutoff) dailyTokens += tokens;
    if (entryTime >= fiveHoursCutoff) fiveHoursTokens += tokens;
    
    // Model aggregation
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
  
  // Process request count entries (separate from token entries)
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

function cleanupOldEntries(entries: TokenUsageEntry[]): TokenUsageEntry[] {
  const cutoff = Date.now() - MS_IN_90_DAYS;
  return entries.filter((entry) => {
    const entryTime = new Date(entry.timestamp).getTime();
    return entryTime >= cutoff;
  });
}

// GET - Fetch current token usage
export async function GET(request: NextRequest) {
  try {
    const storage = await readUsageFile();
    
    // Cleanup old entries (>90 days)
    const cleanedEntries = cleanupOldEntries(storage.entries);
    const cleanedRequests = cleanupOldEntries(storage.requestCounts);
    if (cleanedEntries.length !== storage.entries.length || cleanedRequests.length !== storage.requestCounts.length) {
      storage.entries = cleanedEntries;
      storage.requestCounts = cleanedRequests;
      await writeUsageFile(storage);
    }
    
    // Calculate time-series data
    const usage = calculateTimeSeriesData(storage.entries, storage.requestCounts);
    
    // Calculate request quota (using monthly requests as the main limit)
    const requestQuota = {
      total: QUOTA_CONFIG.requests.total,
      used: usage.requests.monthly,
      remaining: Math.max(0, QUOTA_CONFIG.requests.total - usage.requests.monthly),
      expiresAt: QUOTA_CONFIG.requests.expiresAt,
    };

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error("Error reading token usage:", error);
    return NextResponse.json(
      { error: "Failed to read token usage" },
      { status: 500 }
    );
  }
}

// POST - Log new token usage + request count
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { model, promptTokens, completionTokens, totalTokens, requestId } = body;

    if (!model || typeof totalTokens !== "number") {
      return NextResponse.json(
        { error: "Missing required fields: model, totalTokens" },
        { status: 400 }
      );
    }

    const storage = await readUsageFile();
    const now = new Date();

    // Create token entry
    const newEntry: TokenUsageEntry = {
      model,
      promptTokens: promptTokens || 0,
      completionTokens: completionTokens || 0,
      totalTokens,
      timestamp: now.toISOString(),
      requestId,
    };

    // Create request count entry (1 request = 1 API call)
    const newRequestEntry: RequestCountEntry = {
      model,
      timestamp: now.toISOString(),
      requestId,
    };

    // Add entries to storage
    storage.entries.push(newEntry);
    storage.requestCounts.push(newRequestEntry);
    storage.lastUpdated = now.toISOString();

    // Cleanup old entries (>90 days) to prevent file bloat
    storage.entries = cleanupOldEntries(storage.entries);
    storage.requestCounts = cleanupOldEntries(storage.requestCounts);

    await writeUsageFile(storage);

    // Calculate and return current usage stats
    const usage = calculateTimeSeriesData(storage.entries, storage.requestCounts);
    const requestQuota = {
      total: QUOTA_CONFIG.requests.total,
      used: usage.requests.monthly,
      remaining: Math.max(0, QUOTA_CONFIG.requests.total - usage.requests.monthly),
      expiresAt: QUOTA_CONFIG.requests.expiresAt,
    };

    return NextResponse.json({ 
      ok: true, 
      usage: {
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
      },
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

// PATCH - Reset usage (admin only)
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
      
      const usage = calculateTimeSeriesData(storage.entries, storage.requestCounts);
      return NextResponse.json({ 
        ok: true, 
        usage: { 
          tokens: usage.tokens,
          requests: usage.requests,
          models: usage.models,
          quota: {
            tokens: {
              total: QUOTA_CONFIG.tokens.total,
              used: 0,
              remaining: QUOTA_CONFIG.tokens.total,
              expiresAt: QUOTA_CONFIG.tokens.expiresAt,
            },
            requests: {
              total: QUOTA_CONFIG.requests.total,
              used: 0,
              remaining: QUOTA_CONFIG.requests.total,
              expiresAt: QUOTA_CONFIG.requests.expiresAt,
            },
          },
          lastUpdated: storage.lastUpdated,
        },
      });
    }

    if (reset === "daily") {
      const dailyCutoff = Date.now() - MS_IN_DAY;
      storage.entries = storage.entries.filter((entry) => {
        const entryTime = new Date(entry.timestamp).getTime();
        return entryTime < dailyCutoff;
      });
      storage.requestCounts = storage.requestCounts.filter((entry) => {
        const entryTime = new Date(entry.timestamp).getTime();
        return entryTime < dailyCutoff;
      });
      storage.lastUpdated = new Date().toISOString();
      await writeUsageFile(storage);
      
      const usage = calculateTimeSeriesData(storage.entries, storage.requestCounts);
      return NextResponse.json({ ok: true, usage: { tokens: usage.tokens, requests: usage.requests, models: usage.models, lastUpdated: storage.lastUpdated } });
    }

    if (reset === "before" && before) {
      const cutoffTime = new Date(before).getTime();
      storage.entries = storage.entries.filter((entry) => {
        const entryTime = new Date(entry.timestamp).getTime();
        return entryTime >= cutoffTime;
      });
      storage.requestCounts = storage.requestCounts.filter((entry) => {
        const entryTime = new Date(entry.timestamp).getTime();
        return entryTime >= cutoffTime;
      });
      storage.lastUpdated = new Date().toISOString();
      await writeUsageFile(storage);
      
      const usage = calculateTimeSeriesData(storage.entries, storage.requestCounts);
      return NextResponse.json({ ok: true, usage: { tokens: usage.tokens, requests: usage.requests, models: usage.models, lastUpdated: storage.lastUpdated } });
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
