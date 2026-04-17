import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import {
  getEnvironmentSnapshot,
  type EnvironmentSnapshot,
} from "@/lib/server-monitor";

function readEnvKeys(filePath: string) {
  if (!existsSync(filePath)) return [];
  const content = readFileSync(filePath, "utf8");
  const keys = new Set<string>();

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    if (!line.includes("=")) continue;
    const key = line.split("=", 1)[0]?.trim();
    if (key) keys.add(key);
  }

  return Array.from(keys).sort();
}

export async function GET() {
  try {
    const docker = await getEnvironmentSnapshot();
    const cwd = process.cwd();
    const local: EnvironmentSnapshot["local"] = [
      { file: ".env", keys: readEnvKeys(path.join(cwd, ".env")) },
      { file: ".env.local", keys: readEnvKeys(path.join(cwd, ".env.local")) },
    ].filter((entry) => entry.keys.length > 0);

    return NextResponse.json({
      ok: true,
      environment: { local, docker },
      updatedAt: Date.now(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        environment: { local: [], docker: [] },
        error: error instanceof Error ? error.message : "Unknown error",
        updatedAt: Date.now(),
      },
      { status: 200 },
    );
  }
}
