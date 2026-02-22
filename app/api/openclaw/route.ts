import { NextResponse } from "next/server";

const OPENCLAW_BASE_URL =
  process.env.OPENCLAW_BASE_URL ||
  process.env.OPENCLAW_GATEWAY_URL ||
  "http://127.0.0.1:18789";
const OPENCLAW_HOOKS_URL =
  process.env.OPENCLAW_HOOKS_URL ||
  `${OPENCLAW_BASE_URL.replace(/\/+$/, "")}/hooks/agent`;
const OPENCLAW_HOOKS_TOKEN = process.env.OPENCLAW_HOOKS_TOKEN || process.env.OPENCLAW_GATEWAY_TOKEN || "";
const OPENCLAW_AGENT_ID = process.env.OPENCLAW_AGENT_ID || "main";
const OPENCLAW_ALLOW_REQUEST_SESSION_KEY = process.env.OPENCLAW_ALLOW_REQUEST_SESSION_KEY === "true";

export async function POST(req: Request) {
  try {
    const { message, sessionKey } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    if (!OPENCLAW_HOOKS_TOKEN) {
      return NextResponse.json({ error: "OPENCLAW_HOOKS_TOKEN is missing" }, { status: 500 });
    }

    const resolvedSessionKey =
      typeof sessionKey === "string" && sessionKey.trim().length > 0
        ? sessionKey.trim()
        : `hook:webchat:${crypto.randomUUID()}`;

    const trimmed = message.trim();
    const isStatusCommand = /^\/(usage|status)\b/i.test(trimmed);
    const bridgedMessage = isStatusCommand
      ? `Jalankan ${trimmed.startsWith("/") ? trimmed : "/usage"}. Ringkas hasilnya dalam bahasa Indonesia, tetap pertahankan emoji penting (jangan dihapus), dan jaga angka usage/reset persis seperti output aslinya.`
      : message;

    const hookPayload: Record<string, unknown> = {
      message: bridgedMessage,
      agentId: OPENCLAW_AGENT_ID,
      name: "web-chat",
      wakeMode: "now",
      deliver: false,
    };

    // /hooks/agent rejects request sessionKey by default unless server enables hooks.allowRequestSessionKey=true
    if (OPENCLAW_ALLOW_REQUEST_SESSION_KEY) {
      hookPayload.sessionKey = resolvedSessionKey;
    }

    let r = await fetch(OPENCLAW_HOOKS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENCLAW_HOOKS_TOKEN}`,
      },
      body: JSON.stringify(hookPayload),
    });

    // Safety retry: if server rejects request sessionKey policy, retry once without sessionKey.
    if (!r.ok && r.status === 400 && Object.prototype.hasOwnProperty.call(hookPayload, "sessionKey")) {
      delete hookPayload.sessionKey;
      r = await fetch(OPENCLAW_HOOKS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENCLAW_HOOKS_TOKEN}`,
        },
        body: JSON.stringify(hookPayload),
      });
    }

    const rawText = await r.text();
    let data: unknown = {};
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      data = { raw: rawText };
    }

    const dataObj = (data && typeof data === "object") ? (data as Record<string, unknown>) : null;
    const upstreamSessionKey = typeof dataObj?.sessionKey === "string" ? dataObj.sessionKey : undefined;

    return NextResponse.json(
      {
        ok: r.ok,
        status: r.status,
        sessionKey: upstreamSessionKey || resolvedSessionKey,
        acceptedAt: Date.now(),
        hooksUrl: OPENCLAW_HOOKS_URL,
        data,
      },
      { status: r.ok ? 200 : r.status || 500 }
    );
  } catch (e: unknown) {
    console.error("OpenClaw webhook error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
