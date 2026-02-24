import { NextResponse } from "next/server";
import { db, ensureChatTables } from "@/lib/db";
import { getServerSession } from "@/lib/server-session";

type ConversationRow = {
  key: string;
  title: string | null;
  pinned: boolean;
  updated_at: string;
  last_content: string | null;
  last_ts: string | null;
};

async function getUserId() {
  const session = await getServerSession();
  return session?.user?.id;
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureChatTables();

  const result = await db.query<ConversationRow>(
    `select c.key, c.title, c.pinned, c.updated_at, lm.content as last_content, lm.ts::text as last_ts
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
      order by c.pinned desc, lm.ts desc`,
    [userId]
  );

  const conversations = result.rows.map((row) => {
    const lastTs = row.last_ts ? Number(row.last_ts) : Date.parse(row.updated_at);
    const safeLastTs = Number.isFinite(lastTs) ? lastTs : Date.now();

    return {
      key: row.key,
      title: row.title?.trim() || row.last_content?.trim()?.slice(0, 56) || "New Chat",
      pinned: !!row.pinned,
      lastTimestamp: safeLastTs,
    };
  });

  return NextResponse.json({ conversations });
}

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

export async function PATCH(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    key?: string;
    title?: string;
    pinned?: boolean;
  };

  const key = body.key?.trim();
  if (!key) return NextResponse.json({ error: "key is required" }, { status: 400 });

  if (typeof body.title === "string") {
    await db.query(
      `update chat_conversations set title = $3, updated_at = now() where user_id = $1 and key = $2`,
      [userId, key, body.title.trim().slice(0, 80) || "New Chat"]
    );
  }

  if (typeof body.pinned === "boolean") {
    await db.query(
      `update chat_conversations set pinned = $3 where user_id = $1 and key = $2`,
      [userId, key, body.pinned]
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const key = new URL(req.url).searchParams.get("key")?.trim();
  if (!key) return NextResponse.json({ error: "key is required" }, { status: 400 });

  await db.query(`delete from chat_messages where user_id = $1 and conversation_key = $2`, [userId, key]);
  await db.query(`delete from chat_conversations where user_id = $1 and key = $2`, [userId, key]);

  return NextResponse.json({ ok: true });
}
