import { OpenClawApiError, normalizeOpenClawError } from "./errors";

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export interface OpenClawClientOptions {
  baseUrl: string;
  apiKey?: string;
  timeoutMs?: number;
  retryMax?: number; // gentle mode default: 1 retry
  retryBaseDelayMs?: number;
  fetchImpl?: typeof fetch;
}

export interface AgentSummary {
  id: string;
  name?: string;
  status?: string;
  model?: string;
  [key: string]: unknown;
}

export interface SubagentSummary {
  id: string;
  status?: string;
  model?: string;
  [key: string]: unknown;
}

export interface ManagedFile {
  path: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface CronJob {
  id: string;
  name?: string;
  schedule?: string;
  enabled?: boolean;
  [key: string]: unknown;
}

export interface HeartbeatConfig {
  enabled?: boolean;
  intervalSeconds?: number;
  staleAfterSeconds?: number;
  [key: string]: unknown;
}

export class OpenClawClient {
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly timeoutMs: number;
  private readonly retryMax: number;
  private readonly retryBaseDelayMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: OpenClawClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.apiKey = options.apiKey;
    this.timeoutMs = options.timeoutMs ?? 8000;
    this.retryMax = options.retryMax ?? 1;
    this.retryBaseDelayMs = options.retryBaseDelayMs ?? 400;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  // Agents/subagents
  listAgents() {
    return this.request<AgentSummary[]>("GET", "/agents");
  }

  listSubagents() {
    return this.request<SubagentSummary[]>("GET", "/subagents");
  }

  steerSubagent(id: string, message: string) {
    return this.request<{ ok: boolean }>("POST", `/subagents/${encodeURIComponent(id)}/steer`, {
      message,
    });
  }

  killSubagent(id: string) {
    return this.request<{ ok: boolean }>("POST", `/subagents/${encodeURIComponent(id)}/kill`);
  }

  // Files
  listFiles() {
    return this.request<ManagedFile[]>("GET", "/files");
  }

  getFileContent(path: string) {
    const query = new URLSearchParams({ path }).toString();
    return this.request<{ path: string; content: string }>("GET", `/files/content?${query}`);
  }

  createFile(path: string, content: string) {
    return this.request<{ ok: boolean }>("POST", "/files", { path, content });
  }

  updateFile(path: string, content: string) {
    return this.request<{ ok: boolean }>("PATCH", "/files", { path, content });
  }

  deleteFile(path: string) {
    const query = new URLSearchParams({ path }).toString();
    return this.request<{ ok: boolean }>("DELETE", `/files?${query}`);
  }

  // Cron
  listCronJobs() {
    return this.request<CronJob[]>("GET", "/cron");
  }

  createCronJob(payload: Record<string, unknown>) {
    return this.request<CronJob>("POST", "/cron", payload);
  }

  updateCronJob(id: string, payload: Record<string, unknown>) {
    return this.request<CronJob>("PATCH", `/cron/${encodeURIComponent(id)}`, payload);
  }

  deleteCronJob(id: string) {
    return this.request<{ ok: boolean }>("DELETE", `/cron/${encodeURIComponent(id)}`);
  }

  runCronNow(id: string) {
    return this.request<{ ok: boolean }>("POST", `/cron/${encodeURIComponent(id)}/run-now`);
  }

  // Heartbeat
  getHeartbeat() {
    return this.request<HeartbeatConfig>("GET", "/heartbeat");
  }

  updateHeartbeat(payload: Partial<HeartbeatConfig>) {
    return this.request<HeartbeatConfig>("PATCH", "/heartbeat", payload);
  }

  triggerHeartbeat() {
    return this.request<{ ok: boolean }>("POST", "/heartbeat/trigger");
  }

  private async request<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
    let attempt = 0;
    let lastError: OpenClawApiError | null = null;

    while (attempt <= this.retryMax) {
      try {
        const data = await this.executeRequest<T>(method, path, body);
        return data;
      } catch (error) {
        const normalized = await normalizeOpenClawError(error);
        lastError = normalized;

        const canRetry = normalized.retriable && attempt < this.retryMax;
        if (!canRetry) throw normalized;

        const backoff = this.retryBaseDelayMs * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, backoff));
        attempt += 1;
      }
    }

    throw lastError ??
      new OpenClawApiError({
        message: "OpenClaw request failed after retry.",
        code: "UNKNOWN",
      });
  }

  private async executeRequest<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method,
        headers: {
          "content-type": "application/json",
          ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const requestId = res.headers.get("x-request-id") ?? undefined;
      const text = await res.text();
      const parsed = text ? safeParseJson(text) : null;

      if (!res.ok) {
        throw new OpenClawApiError({
          message:
            (parsed && typeof parsed === "object" && "message" in parsed && typeof (parsed as any).message === "string"
              ? (parsed as any).message
              : `OpenClaw HTTP ${res.status}`),
          code: "HTTP_ERROR",
          status: res.status,
          requestId,
          details: parsed ?? text,
          retriable: res.status >= 500 || res.status === 429,
        });
      }

      if (!parsed) return {} as T;
      return parsed as T;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

function safeParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    // Non-JSON responses can happen when gateway serves dashboard HTML.
    // Return null and let callers decide graceful fallback.
    return null;
  }
}

