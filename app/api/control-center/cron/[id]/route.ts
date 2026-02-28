import { NextRequest, NextResponse } from 'next/server';
import { updateCronJob, deleteCronJob } from '@/lib/openclaw';
import { withCapability } from '@/lib/auth/guards';
import { logAudit, AuditActionType, getActorId } from '@/lib/audit';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// PATCH /api/control-center/cron/:id - Update a cron job
async function patchHandler(req: NextRequest, session: unknown, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({ message: 'Missing cron job ID' }, { status: 400 });
    }

    const body = await req.json();
    const { name, schedule, enabled } = body;

    // Validate request body
    if (name !== undefined && typeof name !== 'string') {
      return NextResponse.json({ message: 'Invalid "name" parameter: must be a string' }, { status: 400 });
    }

    if (schedule !== undefined) {
      if (typeof schedule !== 'string') {
        return NextResponse.json({ message: 'Invalid "schedule" parameter: must be a string' }, { status: 400 });
      }
      // Basic cron schedule validation
      const cronParts = schedule.trim().split(/\s+/);
      if (cronParts.length !== 5) {
        return NextResponse.json({ message: 'Invalid "schedule" format: must be a valid cron expression (5 fields)' }, { status: 400 });
      }
    }

    if (enabled !== undefined && typeof enabled !== 'boolean') {
      return NextResponse.json({ message: 'Invalid "enabled" parameter: must be a boolean' }, { status: 400 });
    }

    const updated = await updateCronJob(id, {
      ...(name !== undefined && { name }),
      ...(schedule !== undefined && { schedule }),
      ...(enabled !== undefined && { enabled }),
    });

    // Audit log (best-effort: won't break primary action)
    logAudit({
      actorId: getActorId(session),
      actionType: AuditActionType.CRON_UPDATE,
      targetId: id,
      details: { name, schedule, enabled },
    }).catch(() => {});
    
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating cron job:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/control-center/cron/:id - Delete a cron job
async function deleteHandler(req: NextRequest, session: unknown, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({ message: 'Missing cron job ID' }, { status: 400 });
    }

    const result = await deleteCronJob(id);

    // Audit log (best-effort: won't break primary action)
    logAudit({
      actorId: getActorId(session),
      actionType: AuditActionType.CRON_DELETE,
      targetId: id,
    }).catch(() => {});

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error deleting cron job:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export const PATCH = withCapability('agent-control:cron:write')(patchHandler);
export const DELETE = withCapability('agent-control:cron:write')(deleteHandler);
