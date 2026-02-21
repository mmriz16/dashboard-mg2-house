import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

type SessionEntry = {
  sessionFile?: string;
  sessionId?: string;
  updatedAt?: number;
};

type ParsedAssistant = {
  timestamp: number;
  text: string;
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

function readSessionFileForKey(sessionKey: string): string | null {
  const sessionsPath = getSessionsFilePath();
  if (!fs.existsSync(sessionsPath)) return null;

  const raw = fs.readFileSync(sessionsPath, "utf-8");
  const parsed = JSON.parse(raw) as Record<string, SessionEntry>;

  const directKey = parsed?.[sessionKey];
  const prefixedKey = parsed?.[`agent:main:${sessionKey}`];
  const entry = directKey || prefixedKey;

  if (!entry) return null;

  if (entry.sessionFile && fs.existsSync(entry.sessionFile)) {
    return entry.sessionFile;
  }

  if (entry.sessionId) {
    const fallback = path.join(path.dirname(sessionsPath), `${entry.sessionId}.jsonl`);
    if (fs.existsSync(fallback)) return fallback;
  }

  return null;
}

function findLatestAssistantMessage(sessionFilePath: string, afterTs: number): ParsedAssistant | null {
  const raw = fs.readFileSync(sessionFilePath, "utf-8");
  const lines = raw.split("\n").filter(Boolean);

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
        .trim();

      if (!text) continue;

      return { timestamp: ts, text };
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
          const sessionFile = readSessionFileForKey(sessionKey);
          if (!sessionFile) return;

          const found = findLatestAssistantMessage(sessionFile, lastSentTs);
          if (!found) return;

          lastSentTs = found.timestamp;
          send("message", found);
        } catch (err) {
          send("error", { error: err instanceof Error ? err.message : String(err) });
        }
      }, 1000);

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
