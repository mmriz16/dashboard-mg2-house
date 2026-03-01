import { NextResponse } from "next/server";

const ORACLE_SERVER = process.env.ORACLE_SERVER || "168.110.192.119";
const ORACLE_USER = process.env.ORACLE_USER || "ubuntu";
const ORACLE_SSH_KEY = process.env.ORACLE_SSH_KEY || "C:\\Users\\miftakhul.rizky\\Downloads\\ssh.key";

interface GatewayStatus {
  status: "healthy" | "warning" | "offline";
  port?: string;
  pid?: string;
  channel?: string;
  uptime?: string;
  lastHeartbeat?: string;
  lastProbe?: string;
  error?: string;
}

async function sshExec(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const { exec } = require("child_process");
    
    const sshKeyPath = ORACLE_SSH_KEY.replace(/\\/g, "/");
    const sshCmd = `ssh -i "${sshKeyPath}" -o StrictHostKeyChecking=no -o ConnectTimeout=15 ${ORACLE_USER}@${ORACLE_SERVER} ${command}`;
    
    exec(sshCmd, { timeout: 30000, maxBuffer: 1024 * 1024, shell: "cmd.exe" }, (error: Error | null, stdout: string, stderr: string) => {
      if (error) {
        reject(new Error(stderr || error.message));
        return;
      }
      resolve(stdout);
    });
  });
}

function formatUptime(timestampStr: string): string {
  try {
    // Parse UTC timestamp: "Fri 2026-02-27 17:54:46 UTC"
    const date = new Date(timestampStr.replace(/ UTC$/, "Z"));
    if (isNaN(date.getTime())) return "-";
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${days}d ${hours}h ${mins}m`;
  } catch {
    return "-";
  }
}

export async function GET() {
  try {
    // Get gateway status and uptime in one command
    const output = await sshExec("openclaw gateway status --json");
    
    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(output.trim());
    } catch {
      data = { raw: output };
    }

    // Parse nested structure from openclaw gateway status --json
    const serviceRuntime = (data.service as Record<string, unknown>)?.runtime as Record<string, unknown> | undefined;
    const gateway = data.gateway as Record<string, unknown> | undefined;
    const rpc = data.rpc as Record<string, unknown> | undefined;

    // Get uptime from systemd
    let uptime = "-";
    try {
      const uptimeOutput = await sshExec("systemctl --user show openclaw-gateway --property=ActiveEnterTimestamp");
      const match = uptimeOutput.match(/ActiveEnterTimestamp=(.+)/);
      if (match && match[1]) {
        uptime = formatUptime(match[1].trim());
      }
    } catch {
      // Use fallback
    }

    const gatewayStatus: GatewayStatus = {
      status: (serviceRuntime?.status === "running") ? "healthy" : "offline",
      port: String(gateway?.port || "0"),
      pid: String(serviceRuntime?.pid || "0"),
      channel: "stable",
      uptime: uptime,
      lastHeartbeat: new Date().toLocaleTimeString("en-US", { hour12: false }),
      lastProbe: rpc?.ok === true ? new Date().toLocaleTimeString("en-US", { hour12: false }) : "-",
    };

    return NextResponse.json({
      ...gatewayStatus,
      checkedAt: Date.now(),
    });
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    
    return NextResponse.json({
      status: "offline" as const,
      port: "-",
      pid: "-",
      channel: "stable",
      uptime: "-",
      lastHeartbeat: "-",
      lastProbe: "-",
      error: errorMessage,
      checkedAt: Date.now(),
    });
  }
}
