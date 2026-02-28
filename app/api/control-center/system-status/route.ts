import { NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const execFileAsync = promisify(execFile);
const CMD_TIMEOUT_MS = 3500;

let lastGoodCronJobs: unknown[] = [];
let lastGoodCronAt = 0;

async function runOpenclaw(args: string[]): Promise<{ ok: boolean; text: string }> {
  try {
    const { stdout } = await execFileAsync("openclaw", args, {
      encoding: "utf8",
      timeout: CMD_TIMEOUT_MS,
      windowsHide: true,
      maxBuffer: 1024 * 1024,
    });
    return { ok: true, text: stdout || "" };
  } catch {}

  try {
    const userProfile = process.env.USERPROFILE || "";
    const cliPath =
      process.env.OPENCLAW_CLI_PATH ||
      path.join(
        userProfile,
        "AppData",
        "Local",
        "nvm",
        "v22.12.0",
        "node_modules",
        "openclaw",
        "dist",
        "index.js"
      );

    const { stdout } = await execFileAsync("node", [cliPath, ...args], {
      encoding: "utf8",
      timeout: CMD_TIMEOUT_MS,
      windowsHide: true,
      maxBuffer: 1024 * 1024,
    });
    return { ok: true, text: stdout || "" };
  } catch (e: any) {
    const text =
      (typeof e?.stdout === "string" && e.stdout) ||
      (typeof e?.stderr === "string" && e.stderr) ||
      (typeof e?.message === "string" ? e.message : "");
    return { ok: false, text };
  }
}

export async function GET() {
  const [gateway, cron, status] = await Promise.all([
    runOpenclaw(["gateway", "status"]),
    runOpenclaw(["cron", "list", "--json"]),
    runOpenclaw(["status"]),
  ]);

  let cronJobs: unknown[] = [];
  let cronFromCache = false;

  if (cron.ok) {
    try {
      const parsed = JSON.parse(cron.text);
      cronJobs = Array.isArray((parsed as any)?.jobs)
        ? (parsed as any).jobs
        : Array.isArray(parsed)
          ? parsed
          : [];

      if (cronJobs.length > 0) {
        lastGoodCronJobs = cronJobs;
        lastGoodCronAt = Date.now();
      }
    } catch {
      cronJobs = lastGoodCronJobs;
      cronFromCache = cronJobs.length > 0;
    }
  } else {
    cronJobs = lastGoodCronJobs;
    cronFromCache = cronJobs.length > 0;
  }

  const gatewayHealthy = gateway.ok && /RPC probe:\s*ok/i.test(gateway.text);

  return NextResponse.json(
    {
      gateway: {
        ok: gatewayHealthy,
        rawOk: gateway.ok,
        summary: gatewayHealthy ? "healthy" : "unknown_or_unhealthy",
      },
      cron: {
        ok: cron.ok || cronFromCache,
        stale: cronFromCache,
        lastGoodAt: lastGoodCronAt || null,
        count: cronJobs.length,
        jobs: cronJobs,
      },
      status: {
        ok: status.ok,
        note: status.ok ? "available" : "unavailable_non_blocking",
        excerpt: (status.text || "").slice(0, 500),
      },
      generatedAt: Date.now(),
    },
    {
      headers: {
        "Cache-Control": "private, max-age=5",
      },
    }
  );
}
