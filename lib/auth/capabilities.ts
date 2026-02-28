import { NextRequest, NextResponse } from "next/server";

export type Role = "owner" | "admin" | "operator" | "viewer";

export type Capability =
  | "agent-control:agents:read"
  | "agent-control:agents:steer"
  | "agent-control:agents:kill"
  | "agent-control:subagents:read"
  | "agent-control:subagents:steer"
  | "agent-control:subagents:write"
  | "agent-control:subagents:kill"
  | "agent-control:files:read"
  | "agent-control:files:write"
  | "agent-control:files:delete"
  | "agent-control:cron:read"
  | "agent-control:cron:write"
  | "agent-control:heartbeat:read"
  | "agent-control:heartbeat:write"
  | "agent-control:audit:read";

const ROLE_CAPABILITIES: Record<Role, Capability[]> = {
  owner: [
    "agent-control:agents:read", "agent-control:agents:steer", "agent-control:agents:kill",
    "agent-control:subagents:read", "agent-control:subagents:steer", "agent-control:subagents:write", "agent-control:subagents:kill",
    "agent-control:files:read", "agent-control:files:write", "agent-control:files:delete",
    "agent-control:cron:read", "agent-control:cron:write",
    "agent-control:heartbeat:read", "agent-control:heartbeat:write",
    "agent-control:audit:read"
  ],
  admin: [
    "agent-control:agents:read", "agent-control:agents:steer", "agent-control:agents:kill",
    "agent-control:subagents:read", "agent-control:subagents:steer", "agent-control:subagents:write", "agent-control:subagents:kill",
    "agent-control:files:read", "agent-control:files:write", "agent-control:files:delete",
    "agent-control:cron:read", "agent-control:cron:write",
    "agent-control:heartbeat:read", "agent-control:heartbeat:write",
    "agent-control:audit:read"
  ],
  operator: [
    "agent-control:agents:read", "agent-control:agents:steer",
    "agent-control:subagents:read", "agent-control:subagents:steer", "agent-control:subagents:write",
    "agent-control:files:read", "agent-control:files:write",
    "agent-control:cron:read", "agent-control:cron:write",
    "agent-control:heartbeat:read", "agent-control:heartbeat:write"
  ],
  viewer: [
    "agent-control:agents:read", "agent-control:files:read", "agent-control:subagents:read",
    "agent-control:cron:read", "agent-control:heartbeat:read"
  ]
};

export function hasCapability(userRole: Role, capability: Capability): boolean {
  const capabilities = ROLE_CAPABILITIES[userRole] || [];
  return capabilities.includes(capability);
}

/**
 * Dev-friendly capability wrapper.
 * If no session wiring yet, temporarily assumes owner role.
 * TODO: replace with Better Auth server session lookup.
 */
export function withCapability(capability: Capability) {
  return (
    handler: (req: NextRequest, session: any, context?: any) => Promise<NextResponse>
  ) => {
    return async (req: NextRequest, context?: any) => {
      try {
        const existingSession = (req as any).session;
        const session = existingSession ?? { user: { id: "local-dev", role: "owner" as Role } };

        const userRole: Role = session.user?.role || "viewer";
        if (!hasCapability(userRole, capability)) {
          return NextResponse.json(
            { error: `Forbidden: Missing required capability '${capability}'` },
            { status: 403 }
          );
        }

        return await handler(req, session, context);
      } catch (error) {
        console.error("[Capability Middleware Error]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
      }
    };
  };
}
