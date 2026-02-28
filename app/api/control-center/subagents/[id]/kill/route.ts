import { NextRequest, NextResponse } from 'next/server';
import { killSubagent } from '@/lib/openclaw';
import { withCapability } from '@/lib/auth/guards';
import { logAudit, AuditActionType, getActorId } from '@/lib/audit';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/control-center/subagents/[id]/kill - Kill a subagent
async function handler(req: NextRequest, session: unknown, { params }: RouteParams) {
  try {
    const { id } = await params;
    const result = await killSubagent(id);

    // Audit log (best-effort: won't break primary action)
    logAudit({
      actorId: getActorId(session),
      actionType: AuditActionType.SUBAGENT_KILL,
      targetId: id,
    }).catch(() => {});

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error killing subagent:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export const POST = withCapability('agent-control:subagents:write')(handler);
