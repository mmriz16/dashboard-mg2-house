import { NextRequest, NextResponse } from 'next/server';
import { createCronJob } from '@/lib/openclaw';
import { withCapability } from '@/lib/auth/guards';
import { logAudit, AuditActionType, getActorId } from '@/lib/audit';
import { execFileSync } from 'node:child_process';

// GET /api/control-center/cron - List all cron jobs
async function getHandler(req: NextRequest) {
  try {
    // Prefer CLI source because gateway HTTP surface doesn't expose JSON cron list.
    const raw = execFileSync('openclaw', ['cron', 'list', '--json'], {
      encoding: 'utf8',
      timeout: 10000,
      windowsHide: true,
    });

    const parsed = JSON.parse(raw);
    const jobs = Array.isArray(parsed?.jobs) ? parsed.jobs : Array.isArray(parsed) ? parsed : [];
    return NextResponse.json(jobs);
  } catch (error) {
    console.error('Error fetching cron jobs:', error);
    // Fail soft for UI: return empty list instead of 500
    return NextResponse.json([]);
  }
}

// POST /api/control-center/cron - Create a new cron job
async function postHandler(req: NextRequest, session: unknown) {
  try {
    const body = await req.json();
    const { name, schedule, enabled } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ message: 'Missing required "name" parameter' }, { status: 400 });
    }

    if (!schedule || typeof schedule !== 'string') {
      return NextResponse.json({ message: 'Missing required "schedule" parameter' }, { status: 400 });
    }

    const cronParts = schedule.trim().split(/\s+/);
    if (cronParts.length !== 5) {
      return NextResponse.json({ message: 'Invalid "schedule" format: must be a valid cron expression (5 fields)' }, { status: 400 });
    }

    const cronJob = await createCronJob({
      name,
      schedule,
      enabled: enabled !== false,
    });

    logAudit({
      actorId: getActorId(session),
      actionType: AuditActionType.CRON_CREATE,
      targetId: cronJob?.id,
      details: { name, schedule, enabled: enabled !== false },
    }).catch(() => {});

    return NextResponse.json(cronJob, { status: 201 });
  } catch (error) {
    console.error('Error creating cron job:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export const GET = withCapability('agent-control:cron:read')(getHandler);
export const POST = withCapability('agent-control:cron:write')(postHandler);
