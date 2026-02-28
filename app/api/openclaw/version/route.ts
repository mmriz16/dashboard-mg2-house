import { NextResponse } from "next/server";

const OPENCLAW_GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || "";

// Full path to openclaw CLI
const OPENCLAW_CLI = "C:\\Users\\miftakhul.rizky\\AppData\\Local\\nvm\\v22.12.0\\node_modules\\openclaw\\dist\\index.js";

async function getCurrentVersion(): Promise<string> {
  try {
    const { execSync } = await import("child_process");
    // Try direct CLI path first
    try {
      const version = execSync(`node "${OPENCLAW_CLI}" --version`, { 
        encoding: "utf8", 
        timeout: 10000,
        windowsHide: true,
        stdio: "pipe"
      }).trim();
      if (version && version.length > 0) return version;
    } catch {}
    
    // Fallback: try openclaw command with extended PATH
    const extendedPath = "C:\\Users\\miftakhul.rizky\\AppData\\Local\\nvm\\v22.12.0;" + process.env.PATH;
    const version = execSync("openclaw --version", { 
      encoding: "utf8", 
      timeout: 10000,
      windowsHide: true,
      stdio: "pipe",
      env: { ...process.env, PATH: extendedPath }
    }).trim();
    return version || "unknown";
  } catch {
    return "unknown";
  }
}

async function getLatestRelease(): Promise<{ version: string; notes: { emoji: string; text: string }[]; body: string }> {
  try {
    const res = await fetch("https://api.github.com/repos/openclaw/openclaw/releases/latest", { signal: AbortSignal.timeout(10000), cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      const version = data.tag_name?.replace(/^v/, "") || "unknown";
      const notes: { emoji: string; text: string }[] = [];
      if (data.body) {
        const lines = data.body.split("\n").filter((l: string) => l.trim().startsWith("-") || l.trim().startsWith("*"));
        for (const line of lines.slice(0, 6)) {
          const text = line.replace(/^[-*]\s*/, "").trim();
          if (text.length > 3) notes.push({ emoji: "", text });
        }
      }
      return { version, notes, body: data.body || "" };
    }
  } catch { }
  return { version: "unknown", notes: [], body: "" };
}

export async function GET() {
  try {
    const [current, latest] = await Promise.all([getCurrentVersion(), getLatestRelease()]);
    const updateAvailable = current !== "unknown" && latest.version !== "unknown" && current !== latest.version;
    return NextResponse.json({ current, latest: latest.version, updateAvailable, releaseNotes: latest.notes, releaseBody: latest.body, checkedAt: Date.now() });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error", current: "unknown", latest: "unknown", updateAvailable: false, releaseNotes: [], checkedAt: Date.now() }, { status: 500 });
  }
}
