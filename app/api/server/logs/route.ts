import { NextResponse } from "next/server";
import { getServerLogs } from "@/lib/server-monitor";

export async function GET() {
  try {
    const logs = await getServerLogs();
    return NextResponse.json({ ok: true, logs, updatedAt: Date.now() });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        logs: null,
        error: error instanceof Error ? error.message : "Unknown error",
        updatedAt: Date.now(),
      },
      { status: 200 },
    );
  }
}
