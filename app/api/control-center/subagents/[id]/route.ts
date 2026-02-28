import { NextRequest, NextResponse } from 'next/server';
import { steerSubagent, killSubagent } from '@/lib/openclaw';
import { withCapability } from '@/lib/auth/guards';
import { logAudit, AuditActionType, getActorId } from '@/lib/audit';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Legacy combined endpoint:
// POST /api/control-center/subagents/[id]?action=steer|kill
async function handler(req: NextRequest, session: unknown, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'steer') {
      const body = await req.json();
      const { message } = body;

      if (!message) {
        return NextResponse.json({ message: 'Missing required "message" parameter' }, { status: 400 });
      }

      const result = await steerSubagent(id, message);

      logAudit({
        actorId: getActorId(session),
        actionType: AuditActionType.SUBAGENT_STEER,
        targetId: id,
        details: { messageLength: message.length, endpoint: 'legacy-combined' },
      }).catch(() => {});

      return NextResponse.json(result);
    }

    if (action === 'kill') {
      const result = await killSubagent(id);

      logAudit({
        actorId: getActorId(session),
        actionType: AuditActionType.SUBAGENT_KILL,
        targetId: id,
        details: { endpoint: 'legacy-combined' },
      }).catch(() => {});

      return NextResponse.json(result);
    }

    return NextResponse.json({ message: 'Missing action parameter (steer or kill)' }, { status: 400 });
  } catch (error) {
    console.error('Error handling subagent action:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export const POST = withCapability('agent-control:subagents:write')(handler);
