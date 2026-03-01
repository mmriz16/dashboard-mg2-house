import { NextResponse } from "next/server";
import { convex } from "@/lib/convex-server";
import { api } from "@/convex/_generated/api";
import { getServerSession } from "@/lib/server-session";

const DEFAULT_CONVERSATION_KEY = "default";

export async function GET(req: Request) {
  const session = await getServerSession();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conversationKey =
    new URL(req.url).searchParams.get("key")?.trim() || DEFAULT_CONVERSATION_KEY;

  const rows = await convex.query(api.chat.getMessages, {
    userId,
    conversationKey,
  });

  const messages = rows.map((row, idx) => ({
    id: row.ts + idx,
    sender: row.sender,
    content: row.content,
    timestamp: row.ts,
    modelId: row.modelId || undefined,
    usageLabel: row.usageLabel || undefined,
  }));

  return NextResponse.json({ messages });
}

export async function POST(req: Request) {
  const session = await getServerSession();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  await convex.mutation(api.chat.addMessageWithTitle, {
    userId,
    conversationKey,
    sender,
    content,
    timestamp,
    modelId: body.modelId || undefined,
    usageLabel: body.usageLabel || undefined,
  });

  return NextResponse.json({ ok: true });
}
