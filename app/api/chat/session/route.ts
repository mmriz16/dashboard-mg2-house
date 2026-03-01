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

  const sessionKey = await convex.mutation(api.chat.getSessionKey, {
    userId,
    key: conversationKey,
  });

  return NextResponse.json({ sessionKey });
}
