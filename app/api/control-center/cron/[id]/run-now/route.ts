import { NextRequest, NextResponse } from 'next/server';
import { runCronNow } from '@/lib/openclaw';
import { withCapability } from '@/lib/auth/guards';
import { logAudit, AuditActionType, getActorId } from '@/lib/audit';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// POST /api/control-center/cron/:id/run-now - Run a cron job immediately
async function postHandler(req: NextRequest, session: unknown, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({ message: 'Missing cron job ID' }, { status: 400 });
    }

    const result = await runCronNow(id);

    // Audit log (best-effort: won't break primary action)
    logAudit({
      actorId: getActorId(session),
      actionType: AuditActionType.CRON_RUN_NOW,
      targetId: id,
    }).catch(() => {});

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error running cron job:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export const POST = withCapability('agent-control:cron:write')(postHandler);
