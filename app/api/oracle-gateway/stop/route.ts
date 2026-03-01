import { NextResponse } from "next/server";

const ORACLE_SERVER = process.env.ORACLE_SERVER || "168.110.192.119";
const ORACLE_USER = process.env.ORACLE_USER || "ubuntu";
const ORACLE_SSH_KEY = process.env.ORACLE_SSH_KEY || "C:\\Users\\miftakhul.rizky\\Downloads\\ssh.key";

async function sshExec(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const { exec } = require("child_process");

    if (ORACLE_SERVER === "127.0.0.1" || ORACLE_SERVER === "localhost") {
      exec(command, { timeout: 60000, maxBuffer: 1024 * 1024 }, (error: Error | null, stdout: string, stderr: string) => {
        if (error) {
          reject(new Error(stderr || error.message));
          return;
        }
        resolve(stdout);
      });
      return;
    }

    const sshKeyPath = ORACLE_SSH_KEY.replace(/\\/g, "\\\\");
    const sshCmd = `ssh -i "${sshKeyPath}" -o StrictHostKeyChecking=no -o ConnectTimeout=10 ${ORACLE_USER}@${ORACLE_SERVER} '${command}'`;

    exec(sshCmd, { timeout: 60000, maxBuffer: 1024 * 1024 }, (error: Error | null, stdout: string, stderr: string) => {
      if (error) {
        reject(new Error(stderr || error.message));
        return;
      }
      resolve(stdout);
    });
  });
}

export async function POST() {
  try {
    // Stop the gateway using systemctl --user (since it's a user service)
    await sshExec("systemctl --user stop openclaw-gateway || openclaw gateway stop");

    return NextResponse.json({
      success: true,
      message: "Gateway stop initiated",
      timestamp: Date.now(),
    });
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : "Unknown error";

    return NextResponse.json({
      success: false,
      error: errorMessage,
      timestamp: Date.now(),
    }, { status: 500 });
  }
}
