import { NextResponse } from "next/server";
import { db, ensureChatTables } from "@/lib/db";
import { getServerSession } from "@/lib/server-session";

type ConversationRow = {
  key: string;
  updated_at: string;
  last_content: string | null;
  last_ts: string | null;
};

export async function GET() {
  const session = await getServerSession();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureChatTables();

  const result = await db.query<ConversationRow>(
    `select c.key, c.updated_at, lm.content as last_content, lm.ts::text as last_ts
       from chat_conversations c
       join lateral (
         select content, ts
           from chat_messages m
          where m.user_id = c.user_id
            and m.conversation_key = c.key
          order by ts desc
          limit 1
       ) lm on true
      where c.user_id = $1
      order by lm.ts desc`,
    [userId]
  );

  const conversations = result.rows.map((row) => {
    const lastTs = row.last_ts ? Number(row.last_ts) : Date.parse(row.updated_at);
    const safeLastTs = Number.isFinite(lastTs) ? lastTs : Date.now();

    return {
      key: row.key,
      title: row.last_content?.trim()?.slice(0, 56) || "New Chat",
      lastTimestamp: safeLastTs,
    };
  });

  return NextResponse.json({ conversations });
}

export async function POST(req: Request) {
  const session = await getServerSession();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureChatTables();

  const body = (await req.json().catch(() => ({}))) as { key?: string };
  const conversationKey = body.key?.trim() || `c:${crypto.randomUUID()}`;
  const openclawSessionKey = `hook:webchat:${crypto.randomUUID()}`;

  await db.query(
    `insert into chat_conversations (user_id, key, openclaw_session_key)
     values ($1, $2, $3)
     on conflict (user_id, key) do nothing`,
    [userId, conversationKey, openclawSessionKey]
  );

  return NextResponse.json({ key: conversationKey, sessionKey: openclawSessionKey });
}
