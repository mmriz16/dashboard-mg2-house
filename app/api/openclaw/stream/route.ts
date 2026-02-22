import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

type SessionEntry = {
  sessionFile?: string;
  sessionId?: string;
  updatedAt?: number;
  totalTokens?: number;
  contextTokens?: number;
};

type ParsedAssistant = {
  timestamp: number;
  text: string;
  model?: string;
  usageLabel?: string;
};

type AssistantPart = {
  type?: string;
  text?: string;
};

function getSessionsFilePath(): string {
  const override = process.env.OPENCLAW_SESSIONS_FILE;
  if (override) return override;

  const userProfile = process.env.USERPROFILE;
  if (!userProfile) {
    throw new Error("USERPROFILE is not set");
  }

  return path.join(userProfile, ".openclaw", "agents", "main", "sessions", "sessions.json");
}

function readSessionInfoForKey(sessionKey: string): { sessionFile: string; entry: SessionEntry } | null {
  const sessionsPath = getSessionsFilePath();
  if (!fs.existsSync(sessionsPath)) return null;

  const raw = fs.readFileSync(sessionsPath, "utf-8");
  const parsed = JSON.parse(raw) as Record<string, SessionEntry>;

  const directKey = parsed?.[sessionKey];
  const prefixedKey = parsed?.[`agent:main:${sessionKey}`];
  const entry = directKey || prefixedKey;

  if (!entry) return null;

  if (entry.sessionFile && fs.existsSync(entry.sessionFile)) {
    return { sessionFile: entry.sessionFile, entry };
  }

  if (entry.sessionId) {
    const fallback = path.join(path.dirname(sessionsPath), `${entry.sessionId}.jsonl`);
    if (fs.existsSync(fallback)) return { sessionFile: fallback, entry };
  }

  return null;
}

function formatUsageLabel(entry: SessionEntry, sessionStartTs?: number): string | undefined {
  const total = entry.totalTokens;
  const ctx = entry.contextTokens;
  if (!total || !ctx) return undefined;

  const pct = Math.min(100, Math.max(0, Math.round((total / ctx) * 100)));
  if (!sessionStartTs) return `${pct}%`;

  const resetHours = Number(process.env.OPENCLAW_CONTEXT_RESET_HOURS || "6");
  const cycleMs = (Number.isFinite(resetHours) && resetHours > 0 ? resetHours : 6) * 3600000;

  const now = Date.now();
  const elapsedSinceStart = Math.max(0, now - sessionStartTs);
  const untilResetMs = cycleMs - (elapsedSinceStart % cycleMs);

  const rh = Math.floor(untilResetMs / 3600000);
  const rm = Math.floor((untilResetMs % 3600000) / 60000);
  const remaining = `${rh}h ${rm}m`;

  const cyclesPassed = Math.floor(elapsedSinceStart / cycleMs);
  const nextResetAt = sessionStartTs + (cyclesPassed + 1) * cycleMs;
  const tz = process.env.OPENCLAW_USER_TIMEZONE || "Asia/Jakarta";
  const resetAt = new Date(nextResetAt).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: tz,
  });

  return `${pct}% - ${remaining} (${resetAt})`;
}

function findLatestAssistantMessage(sessionFilePath: string, afterTs: number, entry: SessionEntry): ParsedAssistant | null {
  const raw = fs.readFileSync(sessionFilePath, "utf-8");
  const lines = raw.split("\n").filter(Boolean);

  let sessionStartTs: number | undefined;
  if (lines.length > 0) {
    try {
      const first = JSON.parse(lines[0]);
      const ts = Date.parse(first?.timestamp ?? "");
      if (Number.isFinite(ts)) sessionStartTs = ts;
    } catch {
      // ignore
    }
  }

  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const row = JSON.parse(lines[i]);
      if (row?.type !== "message") continue;
      if (row?.message?.role !== "assistant") continue;

      const ts = Number(row?.message?.timestamp ?? Date.parse(row?.timestamp ?? ""));
      if (!Number.isFinite(ts) || ts <= afterTs) continue;

      const content: AssistantPart[] = Array.isArray(row?.message?.content) ? row.message.content : [];
      const text = content
        .filter((part) => part?.type === "text" && typeof part?.text === "string")
        .map((part) => part.text as string)
        .join("\n")
        .replace(/^\[\[\s*reply_to[^\]]*\]\]\s*/i, "")
        .trim();

      if (!text) continue;

      const model =
        typeof row?.message?.model === "string"
          ? row.message.model
          : typeof row?.model === "string"
            ? row.model
            : undefined;
      const usageLabel = formatUsageLabel(entry, sessionStartTs);
      return { timestamp: ts, text, model, usageLabel };
    } catch {
      // ignore invalid line
    }
  }

  return null;
}

export async function GET(req: NextRequest) {
  const sessionKey = req.nextUrl.searchParams.get("sessionKey");
  const after = Number(req.nextUrl.searchParams.get("after") || "0");

  if (!sessionKey) {
    return new Response("sessionKey is required", { status: 400 });
  }

  let timer: NodeJS.Timeout | null = null;
  let keepAlive: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const send = (event: string, payload: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      send("ready", { ok: true, sessionKey });

      let lastSentTs = Number.isFinite(after) ? after : 0;

      timer = setInterval(() => {
        try {
          const sessionInfo = readSessionInfoForKey(sessionKey);
          if (!sessionInfo) return;

          const found = findLatestAssistantMessage(sessionInfo.sessionFile, lastSentTs, sessionInfo.entry);
          if (!found) return;

          lastSentTs = found.timestamp;
          send("message", found);
        } catch (err) {
          send("error", { error: err instanceof Error ? err.message : String(err) });
        }
      }, 400);

      keepAlive = setInterval(() => {
        send("ping", { t: Date.now() });
      }, 15000);

      (controller as ReadableStreamDefaultController & { _cleanup?: () => void })._cleanup = () => {
        if (timer) clearInterval(timer);
        if (keepAlive) clearInterval(keepAlive);
      };
    },
    cancel() {
      if (timer) clearInterval(timer);
      if (keepAlive) clearInterval(keepAlive);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
