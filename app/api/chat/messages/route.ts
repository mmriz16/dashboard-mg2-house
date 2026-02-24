import { NextResponse } from "next/server";
import { db, ensureChatTables } from "@/lib/db";
import { getServerSession } from "@/lib/server-session";

const DEFAULT_CONVERSATION_KEY = "default";

const STOP_WORDS = new Set([
  "yang","dan","atau","dengan","untuk","dari","ke","di","ini","itu","saya","aku","kamu","kami","kita","the","a","an","is","are","to","of","in","on","for","please","tolong","bisa","jadi","buat","dari","agar","nya","ya","ok","oke"
]);

function summarizeConversation(contents: string[]): string {
  const text = contents.join(" ").toLowerCase();
  const words = text.match(/[a-zA-Z0-9]{3,}/g) || [];
  const freq = new Map<string, number>();

  for (const w of words) {
    if (STOP_WORDS.has(w)) continue;
    freq.set(w, (freq.get(w) || 0) + 1);
  }

  const top = Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([w]) => w);

  if (top.length === 0) return "New Chat";

  return top.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export async function GET(req: Request) {
  const session = await getServerSession();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureChatTables();

  const conversationKey =
    new URL(req.url).searchParams.get("key")?.trim() || DEFAULT_CONVERSATION_KEY;

  const result = await db.query<{
    sender: "user" | "agent";
    content: string;
    ts: number;
    model_id: string | null;
    usage_label: string | null;
  }>(
    `select sender, content, ts, model_id, usage_label
       from chat_messages
      where user_id = $1 and conversation_key = $2
      order by ts asc
      limit 300`,
    [userId, conversationKey]
  );

  const messages = result.rows.map((row, idx) => {
    const ts = Number(row.ts);
    const safeTs = Number.isFinite(ts) ? ts : Date.now();

    return {
      id: safeTs + idx,
      sender: row.sender,
      content: row.content,
      timestamp: safeTs,
      modelId: row.model_id || undefined,
      usageLabel: row.usage_label || undefined,
    };
  });

  return NextResponse.json({ messages });
}

export async function POST(req: Request) {
  const session = await getServerSession();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    key?: string;
    sender?: "user" | "agent";
    content?: string;
    timestamp?: number;
    modelId?: string;
    usageLabel?: string;
  };

  const conversationKey = body.key?.trim() || DEFAULT_CONVERSATION_KEY;
  const sender = body.sender;
  const content = body.content?.trim();
  const timestamp = typeof body.timestamp === "number" ? body.timestamp : Date.now();

  if (!sender || (sender !== "user" && sender !== "agent") || !content) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await ensureChatTables();

  await db.query(
    `insert into chat_messages (user_id, conversation_key, sender, content, ts, model_id, usage_label)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [
      userId,
      conversationKey,
      sender,
      content,
      timestamp,
      body.modelId || null,
      body.usageLabel || null,
    ]
  );

  const recent = await db.query<{ content: string }>(
    `select content
       from chat_messages
      where user_id = $1 and conversation_key = $2
      order by ts desc
      limit 30`,
    [userId, conversationKey]
  );

  const title = summarizeConversation(recent.rows.map((r) => r.content));

  await db.query(
    `update chat_conversations
        set updated_at = now(),
            title = $3
      where user_id = $1 and key = $2`,
    [userId, conversationKey, title]
  );

  return NextResponse.json({ ok: true });
}
