import { NextResponse } from "next/server";
import { getServerOverview } from "@/lib/server-monitor";

export async function GET() {
  try {
    const overview = await getServerOverview();
    return NextResponse.json({ ok: true, overview, updatedAt: Date.now() });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        overview: null,
        error: error instanceof Error ? error.message : "Unknown error",
        updatedAt: Date.now(),
      },
      { status: 200 },
    );
  }
}
