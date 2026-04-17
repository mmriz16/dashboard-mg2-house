import { NextResponse } from "next/server";
import { getWebsites } from "@/lib/server-monitor";

export async function GET() {
  try {
    const websites = await getWebsites();
    return NextResponse.json({ ok: true, websites, updatedAt: Date.now() });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        websites: [],
        error: error instanceof Error ? error.message : "Unknown error",
        updatedAt: Date.now(),
      },
      { status: 200 },
    );
  }
}
