/**
 * Unified audit logging helper.
 * - Best-effort (never throws)
 * - Compatible exports for control-center routes
 */

const CONVEX_URL = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;

export interface AuditLogEntry {
  actorId?: string;
  actionType: string;
  targetId?: string;
  details?: Record<string, unknown> | string;
  status?: "success" | "failure" | "pending";
}

export const AuditActionType = {
  FILE_CREATE: "file_create",
  FILE_UPDATE: "file_update",
  FILE_DELETE: "file_delete",
  SUBAGENT_STEER: "subagent_steer",
  SUBAGENT_KILL: "subagent_kill",
  HEARTBEAT_UPDATE: "heartbeat_update",
  HEARTBEAT_TRIGGER: "heartbeat_trigger",
  CRON_CREATE: "cron_create",
  CRON_UPDATE: "cron_update",
  CRON_DELETE: "cron_delete",
  CRON_RUN_NOW: "cron_run_now",
} as const;

export function getActorId(session: unknown): string | undefined {
  if (!session || typeof session !== "object") return undefined;
  const s = session as { user?: { id?: string } };
  return s.user?.id;
}

export async function logAudit(entry: AuditLogEntry): Promise<void> {
  await auditLog(entry);
}

export async function auditLog(entry: AuditLogEntry): Promise<void> {
  const payload = {
    actorId: entry.actorId ?? "system",
    actionType: entry.actionType,
    targetId: entry.targetId ?? undefined,
    details:
      typeof entry.details === "string"
        ? entry.details
        : entry.details
          ? JSON.stringify(entry.details)
          : undefined,
    status: entry.status ?? "success",
  };

  try {
    console.log("[AUDIT]", payload);
  } catch {}

  if (!CONVEX_URL) return;
  try {
    const mutationUrl = `${CONVEX_URL}/api/mutations/agentActions:logAction`;
    const res = await fetch(mutationUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.warn("[audit] mutation failed", res.status);
    }
  } catch (err) {
    console.warn("[audit] convex write failed", err instanceof Error ? err.message : err);
  }
}
