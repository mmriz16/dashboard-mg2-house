import { NextRequest, NextResponse } from 'next/server';
import { triggerHeartbeat } from '@/lib/openclaw';
import { withCapability } from '@/lib/auth/guards';
import { logAudit, AuditActionType, getActorId } from '@/lib/audit';

// POST /api/control-center/heartbeat/trigger - Manually trigger a heartbeat check
async function postHandler(req: NextRequest, session: unknown) {
  try {
    const result = await triggerHeartbeat();

    // Audit log (best-effort: won't break primary action)
    logAudit({
      actorId: getActorId(session),
      actionType: AuditActionType.HEARTBEAT_TRIGGER,
    }).catch(() => {});

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error triggering heartbeat:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export const POST = withCapability('agent-control:heartbeat:write')(postHandler);
