import { NextResponse } from "next/server";
import { convex } from "@/lib/convex-server";
import { api } from "@/convex/_generated/api";
import { isAuthenticated } from "@/lib/auth-server";

async function getUserId() {
  // Use the native Better Auth adapter which reads cookies directly
  return await isAuthenticated();
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await convex.query(api.chat.getConversations, { userId });

  const conversations = rows.map((row) => {
    const lastTs = row.updatedAt || row.createdAt;
    return {
      key: row.key,
      title: row.title?.trim() || "New Chat",
      pinned: !!row.pinned,
      lastTimestamp: lastTs,
    };
  });

  return NextResponse.json({ conversations });
}

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { key?: string };
  const conversationKey = body.key?.trim() || `c:${crypto.randomUUID()}`;
  const openclawSessionKey = `hook:webchat:${crypto.randomUUID()}`;

  // createConversation is a mutation that inserts if not exists
  await convex.mutation(api.chat.createConversation, {
    userId,
    key: conversationKey,
    openclawSessionKey,
  });

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

  // Find the conversation to get its _id
  const rows = await convex.query(api.chat.getConversations, { userId });
  const conv = rows.find((r) => r.key === key);
  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await convex.mutation(api.chat.updateConversation, {
    id: conv._id,
    ...(typeof body.title === "string" && { title: body.title.trim().slice(0, 80) || "New Chat" }),
    ...(typeof body.pinned === "boolean" && { pinned: body.pinned }),
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const key = new URL(req.url).searchParams.get("key")?.trim();
  if (!key) return NextResponse.json({ error: "key is required" }, { status: 400 });

  await convex.mutation(api.chat.deleteConversation, { userId, key });

  return NextResponse.json({ ok: true });
}
