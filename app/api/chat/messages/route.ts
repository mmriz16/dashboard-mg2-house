import { NextResponse } from "next/server";
import { db, ensureChatTables } from "@/lib/db";
import { getServerSession } from "@/lib/server-session";

const DEFAULT_CONVERSATION_KEY = "default";

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

  return NextResponse.json({ ok: true });
}
