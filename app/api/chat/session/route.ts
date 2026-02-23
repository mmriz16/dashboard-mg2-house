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

  const existing = await db.query<{ openclaw_session_key: string }>(
    `select openclaw_session_key from chat_conversations where user_id = $1 and key = $2 limit 1`,
    [userId, conversationKey]
  );

  if (existing.rows[0]?.openclaw_session_key) {
    return NextResponse.json({ sessionKey: existing.rows[0].openclaw_session_key });
  }

  const generated = `hook:webchat:${crypto.randomUUID()}`;

  await db.query(
    `insert into chat_conversations (user_id, key, openclaw_session_key) values ($1, $2, $3)
     on conflict (user_id, key) do update set updated_at = now()`,
    [userId, conversationKey, generated]
  );

  return NextResponse.json({ sessionKey: generated });
}
