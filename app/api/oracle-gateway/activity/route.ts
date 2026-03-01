import { NextResponse } from "next/server";

const ORACLE_SERVER = process.env.ORACLE_SERVER || "168.110.192.119";
const ORACLE_USER = process.env.ORACLE_USER || "ubuntu";
const ORACLE_SSH_KEY = process.env.ORACLE_SSH_KEY || "C:\\Users\\miftakhul.rizky\\Downloads\\ssh.key";

interface ActivityItem {
  time: string;
  message: string;
  status: "success" | "info" | "warning" | "error";
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

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" });
}

function simplifyMessage(subsystem: string, rawMsg: string): string {
  // Extract more details from the raw message
  
  // Agent run events
  if (rawMsg.includes("embedded run start")) {
    const runIdMatch = rawMsg.match(/runId=([a-f0-9-]+)/);
    const runId = runIdMatch ? runIdMatch[1].slice(0, 8) : "";
    const modelMatch = rawMsg.match(/model=([a-z0-9.-]+)/i);
    const model = modelMatch ? modelMatch[1] : "unknown";
    return runId ? `Agent run started (${model}, ${runId})` : `Agent run started (${model})`;
  }
  if (rawMsg.includes("embedded run done") || rawMsg.includes("embedded run complete")) {
    const runIdMatch = rawMsg.match(/runId=([a-f0-9-]+)/);
    const runId = runIdMatch ? runIdMatch[1].slice(0, 8) : "";
    const durationMatch = rawMsg.match(/durationMs=(\d+)/);
    const duration = durationMatch ? `${Math.round(parseInt(durationMatch[1])/1000)}s` : "";
    let result = "Agent run completed";
    if (duration) result += ` (${duration})`;
    if (runId) result += ` [${runId}]`;
    return result;
  }
  if (rawMsg.includes("embedded run agent end")) {
    const runIdMatch = rawMsg.match(/runId=([a-f0-9-]+)/);
    const runId = runIdMatch ? runIdMatch[1].slice(0, 8) : "";
    const isError = rawMsg.includes("isError=true");
    let result = isError ? "Agent finished with error" : "Agent finished successfully";
    if (runId) result += ` [${runId}]`;
    return result;
  }
  if (rawMsg.includes("embedded run agent start")) {
    const runIdMatch = rawMsg.match(/runId=([a-f0-9-]+)/);
    const runId = runIdMatch ? runIdMatch[1].slice(0, 8) : "";
    return "Agent processing" + (runId ? ` [${runId}]` : "");
  }
  
  // Tool execution
  if (rawMsg.includes("embedded run tool start")) {
    return "Tool execution started";
  }
  if (rawMsg.includes("embedded run tool end")) {
    return "Tool execution completed";
  }
  
  // Prompt processing
  if (rawMsg.includes("embedded run prompt start")) {
    return "Processing prompt";
  }
  if (rawMsg.includes("embedded run prompt end")) {
    const durationMatch = rawMsg.match(/durationMs=(\d+)/);
    const duration = durationMatch ? `${Math.round(parseInt(durationMatch[1])/1000)}s` : "";
    return "Prompt done" + (duration ? ` (${duration})` : "");
  }
  
  // Run lifecycle
  if (rawMsg.includes("run registered")) {
    const sessionMatch = rawMsg.match(/sessionId=([a-f0-9-]+)/);
    const sessionId = sessionMatch ? sessionMatch[1].slice(0, 8) : "";
    const totalMatch = rawMsg.match(/totalActive=(\d+)/);
    let result = "Run registered";
    if (totalMatch) result += ` (${totalMatch[1]} active)`;
    if (sessionId) result += ` [${sessionId}]`;
    return result;
  }
  if (rawMsg.includes("run cleared")) {
    const sessionMatch = rawMsg.match(/sessionId=([a-f0-9-]+)/);
    const sessionId = sessionMatch ? sessionMatch[1].slice(0, 8) : "";
    return "Run cleared" + (sessionId ? ` [${sessionId}]` : "");
  }
  
  // Task/queue events
  if (rawMsg.includes("lane task done")) {
    const durationMatch = rawMsg.match(/durationMs=(\d+)/);
    const duration = durationMatch ? `${Math.round(parseInt(durationMatch[1])/1000)}s` : "";
    const activeMatch = rawMsg.match(/active=(\d+)/);
    let result = "Task completed";
    if (activeMatch) result += ` (${activeMatch[1]} active)`;
    if (duration) result += ` in ${duration}`;
    return result;
  }
  if (rawMsg.includes("lane enqueue")) {
    const laneMatch = rawMsg.match(/lane=([^ ]+)/);
    const lane = laneMatch ? laneMatch[1].split(":").pop() : "unknown";
    const queueMatch = rawMsg.match(/queueSize=(\d+)/);
    return `Task queued (${lane}, queue: ${queueMatch ? queueMatch[1] : "?"})`;
  }
  if (rawMsg.includes("lane dequeue")) {
    const laneMatch = rawMsg.match(/lane=([^ ]+)/);
    const lane = laneMatch ? laneMatch[1].split(":").pop() : "unknown";
    const waitMatch = rawMsg.match(/waitMs=(\d+)/);
    const wait = waitMatch ? `${waitMatch[1]}ms` : "";
    let result = "Task dequeued";
    if (wait) result += ` (waited ${wait})`;
    result += ` [${lane}]`;
    return result;
  }
  
  // Telegram events
  if (rawMsg.includes("telegram") && rawMsg.includes("sendMessage")) {
    const chatMatch = rawMsg.match(/chat=(\d+)/);
    const chatId = chatMatch ? chatMatch[1] : "?";
    return `Telegram message sent to ${chatId}`;
  }
  if (rawMsg.includes("telegram") && rawMsg.includes("message")) {
    return "Telegram message received";
  }
  
  // Session events
  if (rawMsg.includes("session started")) {
    return "Session started";
  }
  if (rawMsg.includes("session ended")) {
    return "Session ended";
  }
  
  // Gateway/System events
  if (rawMsg.includes("heartbeat")) {
    return "Heartbeat";
  }
  if (rawMsg.includes("signal SIGTERM")) {
    return "Gateway stopped (SIGTERM)";
  }
  if (rawMsg.includes("gateway") && rawMsg.includes("starting")) {
    const botMatch = rawMsg.match(/@(\w+)/);
    return `Telegram bot starting: ${botMatch ? botMatch[1] : "unknown"}`;
  }
  if (rawMsg.includes("error") || rawMsg.includes("Error")) {
    return "Error: " + rawMsg.slice(0, 100);
  }
  
  // Default: include subsystem and full message
  const shortSubsystem = subsystem.split("/").pop() || subsystem;
  return shortSubsystem + ": " + rawMsg;
}

function parseActivityFromLog(logLine: string): ActivityItem | null {
  try {
    const data = JSON.parse(logLine);
    if (data.type !== "log") return null;
    
    const time = data.time ? formatTime(new Date(data.time).getTime()) : formatTime(Date.now());
    const level = (data.level || "info").toUpperCase();
    const rawMsg = data.message || "";
    
    // Skip heartbeat/status JSON dumps
    if (typeof rawMsg === "string" && rawMsg.includes("\"service\":") && rawMsg.includes("\"rpc\":")) {
      return null;
    }
    
    if (!rawMsg || typeof rawMsg !== "string") return null;
    
    const subsystemMatch = rawMsg.match(/\"subsystem\":\"([^\"]+)\"/);
    const subsystem = subsystemMatch ? subsystemMatch[1] : "";
    
    const message = simplifyMessage(subsystem, rawMsg);
    if (!message) return null;
    
    const status: ActivityItem["status"] = 
      level === "ERROR" || rawMsg.includes("error") ? "error" :
      level === "WARN" ? "warning" :
      "info";
    
    return { time, message, status };
  } catch {
    return null;
  }
}

export async function GET() {
  const activities: ActivityItem[] = [];

  try {
    const logOutput = await sshExec(`openclaw logs --json --limit 100`);
    const lines = logOutput.split("\n").filter(line => line.trim());
    
    for (const line of lines) {
      const activity = parseActivityFromLog(line);
      if (activity) {
        activities.push(activity);
      }
    }
    
    if (activities.length === 0) {
      activities.push({
        time: formatTime(Date.now()),
        message: "Gateway idle - no recent activity",
        status: "info",
      });
    }

  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    activities.push({
      time: formatTime(Date.now()),
      message: `Error: ${errorMessage}`,
      status: "error",
    });
  }

  activities.sort((a, b) => b.time.localeCompare(a.time));
  const limited = activities.slice(0, 50);

  return NextResponse.json({
    items: limited,
    count: limited.length,
    checkedAt: Date.now(),
  });
}
