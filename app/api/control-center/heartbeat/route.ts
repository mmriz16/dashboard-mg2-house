import { NextRequest, NextResponse } from 'next/server';
import { getHeartbeat, updateHeartbeat, triggerHeartbeat } from '@/lib/openclaw';
import { withCapability } from '@/lib/auth/guards';
import { logAudit, AuditActionType, getActorId } from '@/lib/audit';

// GET /api/control-center/heartbeat - Get heartbeat configuration
async function getHandler(req: NextRequest) {
  try {
    const heartbeat = await getHeartbeat();
    return NextResponse.json(heartbeat);
  } catch (error) {
    console.error('Error fetching heartbeat config:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH /api/control-center/heartbeat - Update heartbeat configuration
async function patchHandler(req: NextRequest, session: unknown) {
  try {
    const body = await req.json();
    
    // Validate the request body
    if (typeof body.enabled !== 'undefined' && typeof body.enabled !== 'boolean') {
      return NextResponse.json({ message: 'Invalid "enabled" parameter: must be a boolean' }, { status: 400 });
    }
    
    if (typeof body.intervalSeconds !== 'undefined') {
      if (typeof body.intervalSeconds !== 'number' || body.intervalSeconds < 30) {
        return NextResponse.json({ message: 'Invalid "intervalSeconds" parameter: must be a number >= 30' }, { status: 400 });
      }
    }
    
    if (typeof body.staleAfterSeconds !== 'undefined') {
      if (typeof body.staleAfterSeconds !== 'number' || body.staleAfterSeconds < 60) {
        return NextResponse.json({ message: 'Invalid "staleAfterSeconds" parameter: must be a number >= 60' }, { status: 400 });
      }
    }

    const updated = await updateHeartbeat({
      enabled: body.enabled,
      intervalSeconds: body.intervalSeconds,
      staleAfterSeconds: body.staleAfterSeconds,
    });

    // Audit log (best-effort: won't break primary action)
    logAudit({
      actorId: getActorId(session),
      actionType: AuditActionType.HEARTBEAT_UPDATE,
      details: { enabled: body.enabled, intervalSeconds: body.intervalSeconds, staleAfterSeconds: body.staleAfterSeconds },
    }).catch(() => {});
    
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating heartbeat config:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export const GET = withCapability('agent-control:heartbeat:read')(getHandler);
export const PATCH = withCapability('agent-control:heartbeat:write')(patchHandler);
