import { NextResponse } from "next/server";

export async function POST() {
  try {
    const { execSync } = await import("child_process");
    try {
      const output = execSync("openclaw status", { encoding: "utf8", timeout: 300000, stdio: "pipe" });
      return NextResponse.json({ success: true, output });
    } catch (execError: unknown) {
      return NextResponse.json({ success: false, error: execError instanceof Error ? execError.message : "Update failed", output: "" }, { status: 500 });
    }
  } catch (e: unknown) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
