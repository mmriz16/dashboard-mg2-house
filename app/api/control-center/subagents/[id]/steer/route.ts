import { NextRequest, NextResponse } from 'next/server';
import { steerSubagent } from '@/lib/openclaw';
import { withCapability } from '@/lib/auth/guards';
import { logAudit, AuditActionType, getActorId } from '@/lib/audit';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/control-center/subagents/[id]/steer - Steer a subagent
async function handler(req: NextRequest, session: unknown, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { message } = body;

    if (!message) {
      return NextResponse.json({ message: 'Missing required "message" parameter' }, { status: 400 });
    }

    const result = await steerSubagent(id, message);

    // Audit log (best-effort: won't break primary action)
    logAudit({
      actorId: getActorId(session),
      actionType: AuditActionType.SUBAGENT_STEER,
      targetId: id,
      details: { messageLength: message.length },
    }).catch(() => {});

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error steering subagent:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export const POST = withCapability('agent-control:subagents:write')(handler);
