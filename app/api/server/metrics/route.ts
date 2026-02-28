import { NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const SSH_HOST = process.env.ORACLE_SSH_HOST || "168.110.192.119";
const SSH_USER = process.env.ORACLE_SSH_USER || "ubuntu";
const SSH_PORT = process.env.ORACLE_SSH_PORT || "22";
const SSH_KEY_PATH =
  process.env.ORACLE_SSH_KEY_PATH ||
  "C:\\Users\\miftakhul.rizky\\Downloads\\ssh.key";

async function sshRun(command: string): Promise<string> {
  const { stdout } = await execFileAsync(
    "ssh",
    [
      "-i",
      SSH_KEY_PATH,
      "-o",
      "StrictHostKeyChecking=accept-new",
      "-o",
      "ConnectTimeout=8",
      "-p",
      SSH_PORT,
      `${SSH_USER}@${SSH_HOST}`,
      command,
    ],
    {
      encoding: "utf8",
      timeout: 12000,
      windowsHide: true,
      maxBuffer: 1024 * 1024,
    }
  );

  return stdout || "";
}

function parsePercent(value: string): string {
  const n = Number.parseFloat(value);
  if (Number.isNaN(n)) return "-";
  return `${n.toFixed(1)}%`;
}

export async function GET() {
  try {
    const [cpuRaw, ramRaw, diskRaw, cronRaw] = await Promise.all([
      sshRun(`vmstat 1 2 | tail -1 | awk '{print 100-$15}'`),
      sshRun(`free -m | awk 'NR==2{printf "%.1f", ($3/$2)*100}'`),
      sshRun(`df -P / | awk 'NR==2{gsub("%","",$5); print $5}'`),
      sshRun("openclaw cron list --json 2>/dev/null || echo '{}'"),
    ]);

    const cpu = parsePercent(cpuRaw.trim());
    const ram = parsePercent(ramRaw.trim());
    const disk = parsePercent(diskRaw.trim());

    let cronHealthy = 0;
    let cronTotal = 0;

    try {
      const parsed = JSON.parse(cronRaw.trim() || "{}");
      const jobs = Array.isArray((parsed as any)?.jobs)
        ? (parsed as any).jobs
        : Array.isArray(parsed)
          ? parsed
          : [];
      cronTotal = jobs.length;
      cronHealthy = jobs.filter((j: any) => {
        if (j?.enabled === false) return false;
        const ce = Number(j?.state?.consecutiveErrors ?? j?.consecutiveErrors ?? 0);
        return ce === 0;
      }).length;
    } catch {
      // ignore parse errors
    }

    return NextResponse.json({
      ok: true,
      cpu,
      ram,
      disk,
      cronHealthyJobs: `${cronHealthy}/${cronTotal}`,
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
      { status: 200 }
    );
  }
}
