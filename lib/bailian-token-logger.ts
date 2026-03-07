/**
 * Bailian Token Usage Logger
 * 
 * Utility untuk track token usage dari Alibaba Cloud Bailian API.
 * Karena Bailian tidak menyediakan official quota API, kita track secara lokal.
 * 
 * Usage:
 * ```ts
 * await logTokenUsage({
 *   model: "qwen3.5-plus",
 *   promptTokens: 150,
 *   completionTokens: 280,
 *   totalTokens: 430,
 * });
 * ```
 */

export interface TokenUsageEntry {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  timestamp: string;
  requestId?: string;
}

const LOG_ENDPOINT = "/api/openclaw/token-usage";

/**
 * Log token usage ke API endpoint
 * Non-blocking, fire-and-forget dengan error handling
 * Automatically logs both token usage AND request count
 */
export async function logTokenUsage(
  entry: Omit<TokenUsageEntry, "timestamp"> & { requestId?: string }
): Promise<void> {
  try {
    const payload = {
      model: entry.model,
      promptTokens: entry.promptTokens || 0,
      completionTokens: entry.completionTokens || 0,
      totalTokens: entry.totalTokens,
      requestId: entry.requestId,
    };

    await fetch(LOG_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch((err) => {
      console.warn("[TokenLogger] Failed to log usage:", err);
    });
  } catch (error) {
    console.warn("[TokenLogger] Unexpected error:", error);
  }
}

/**
 * Log a simple API request (for when you only want to track request count, not tokens)
 */
export async function logApiRequest(
  model: string,
  requestId?: string
): Promise<void> {
  try {
    await fetch(LOG_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        requestId,
      }),
      keepalive: true,
    }).catch((err) => {
      console.warn("[TokenLogger] Failed to log request:", err);
    });
  } catch (error) {
    console.warn("[TokenLogger] Unexpected error:", error);
  }
}

/**
 * Extract token usage dari Bailian API response
 * Bailian response format:
 * ```json
 * {
 *   "usage": {
 *     "prompt_tokens": 150,
 *     "completion_tokens": 280,
 *     "total_tokens": 430
 *   }
 * }
 * ```
 */
export function extractTokenUsageFromResponse(
  model: string,
  responseBody: unknown
): Omit<TokenUsageEntry, "timestamp"> | null {
  try {
    if (!responseBody || typeof responseBody !== "object") return null;

    const body = responseBody as Record<string, unknown>;
    const usage = body.usage as Record<string, unknown> | undefined;

    if (!usage) return null;

    const promptTokens = Number(usage.prompt_tokens ?? 0);
    const completionTokens = Number(usage.completion_tokens ?? 0);
    const totalTokens = Number(usage.total_tokens ?? 0);

    if (totalTokens === 0 && promptTokens === 0 && completionTokens === 0) {
      return null;
    }

    return {
      model,
      promptTokens,
      completionTokens,
      totalTokens,
    };
  } catch (error) {
    console.warn("[TokenLogger] Failed to extract usage from response:", error);
    return null;
  }
}

/**
 * Wrapper untuk fetch yang otomatis log token usage
 * 
 * Example:
 * ```ts
 * const response = await fetchWithTokenLogging(
 *   "https://api.bailian.ai/v1/chat/completions",
 *   {
 *     method: "POST",
 *     headers: { "Authorization": "Bearer xxx" },
 *     body: JSON.stringify({ model: "qwen3.5-plus", messages: [...] })
 *   },
 *   "qwen3.5-plus"
 * );
 * ```
 */
export async function fetchWithTokenLogging(
  url: string,
  options: RequestInit,
  model: string
): Promise<Response> {
  try {
    const response = await fetch(url, options);

    // Clone response so we can read body without consuming it
    const clone = response.clone();

    // Parse and log token usage (non-blocking)
    clone
      .json()
      .then((data) => {
        const usage = extractTokenUsageFromResponse(model, data);
        if (usage) {
          logTokenUsage(usage);
        }
      })
      .catch(() => {
        // Ignore parse errors
      });

    return response;
  } catch (error) {
    console.error("[TokenLogger] Fetch failed:", error);
    throw error;
  }
}

/**
 * Get current token usage dari API
 */
export async function getTokenUsage(): Promise<{
  totalTokens: number;
  dailyTokens: number;
  weeklyTokens: number;
  monthlyTokens: number;
  quota?: {
    total: number;
    used: number;
    remaining: number;
    expiresAt?: string;
  };
} | null> {
  try {
    const response = await fetch(LOG_ENDPOINT, { cache: "no-store" });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.warn("[TokenLogger] Failed to fetch usage:", error);
    return null;
  }
}
