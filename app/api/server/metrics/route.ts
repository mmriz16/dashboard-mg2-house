import { NextResponse } from "next/server";
import { getServerOverview } from "@/lib/server-monitor";

function formatPercent(used: number, total: number) {
  if (!total) return "-";
  return `${((used / total) * 100).toFixed(1)}%`;
}

export async function GET() {
  try {
    const overview = await getServerOverview();
    return NextResponse.json({
      ok: true,
      cpu: overview.loadAverage[0] ?? "-",
      ram: formatPercent(
        overview.memory.usedMb,
        overview.memory.totalMb,
      ),
      disk:
        typeof overview.disks[0]?.usedPercent === "number"
          ? `${overview.disks[0].usedPercent.toFixed(1)}%`
          : "-",
      cronHealthyJobs: "-",
      updatedAt: Date.now(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        cpu: "-",
        ram: "-",
        disk: "-",
        cronHealthyJobs: "-",
        error: error instanceof Error ? error.message : "Unknown error",
        updatedAt: Date.now(),
      },
      { status: 200 },
    );
  }
}
