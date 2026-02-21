import { NextResponse } from "next/server";

const OPENCLAW_HOOKS_URL = process.env.OPENCLAW_HOOKS_URL || "http://127.0.0.1:18789/hooks/agent";
const OPENCLAW_HOOKS_TOKEN = process.env.OPENCLAW_HOOKS_TOKEN || "";
const OPENCLAW_AGENT_ID = process.env.OPENCLAW_AGENT_ID || "main";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    if (!OPENCLAW_HOOKS_TOKEN) {
      return NextResponse.json({ error: "OPENCLAW_HOOKS_TOKEN is missing" }, { status: 500 });
    }

    const resolvedSessionKey = "hook:webchat";

    const trimmed = message.trim();
    const isStatusCommand = /^\/(usage|status)\b/i.test(trimmed);
    const bridgedMessage = isStatusCommand
      ? `Jalankan ${trimmed.startsWith("/") ? trimmed : "/usage"}. Ringkas hasilnya dalam bahasa Indonesia, tetap pertahankan emoji penting (jangan dihapus), dan jaga angka usage/reset persis seperti output aslinya.`
      : message;

    const r = await fetch(OPENCLAW_HOOKS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENCLAW_HOOKS_TOKEN}`,
      },
      body: JSON.stringify({
        message: bridgedMessage,
        agentId: OPENCLAW_AGENT_ID,
        name: "web-chat",
        wakeMode: "now",
        deliver: false,
      }),
    });

    const data = await r.json().catch(() => ({}));

    return NextResponse.json(
      {
        ok: r.ok,
        status: r.status,
        sessionKey: resolvedSessionKey,
        acceptedAt: Date.now(),
        data,
      },
      { status: r.ok ? 200 : 500 }
    );
  } catch (e: unknown) {
    console.error("OpenClaw webhook error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
