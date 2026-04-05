import { NextRequest, NextResponse } from 'next/server';
import { listFiles, createFile, updateFile, deleteFile } from '@/lib/openclaw';
import { withCapability } from '@/lib/auth/guards';
import { logAudit, AuditActionType, getActorId } from '@/lib/audit';

const ALLOWED_PREFIXES = ['memory/', 'docs/', 'skills/', 'lib/', 'app/'];
const ALLOWED_ROOT_FILES = new Set([
  'AGENTS.md',
  'SOUL.md',
  'TOOLS.md',
  'IDENTITY.md',
  'USER.md',
  'HEARTBEAT.md',
  'BOOTSTRAP.md',
  'MEMORY.md',
]);

function validateManagedPath(path: string | null) {
  if (!path) {
    return 'Missing required "path" parameter';
  }

  if (path.includes('..')) {
    return 'Invalid path: path traversal not allowed';
  }

  const normalized = path.replace(/\\/g, '/').replace(/^\.\//, '');
  const isAllowedPrefix = ALLOWED_PREFIXES.some((prefix) => normalized.startsWith(prefix));
  const isAllowedRootFile = ALLOWED_ROOT_FILES.has(normalized);

  if (!isAllowedPrefix && !isAllowedRootFile) {
    return `Invalid path: must be a core root file or start with one of ${ALLOWED_PREFIXES.join(', ')}`;
  }

  return null;
}

// GET /api/control-center/files - List all managed files
async function getHandler() {
  try {
    const files = await listFiles();
    return NextResponse.json(files);
  } catch (error) {
    console.error('Error fetching managed files:', error);
    return NextResponse.json([]);
  }
}

// POST /api/control-center/files - Create a new managed file
async function postHandler(req: NextRequest, session: unknown) {
  try {
    const body = await req.json();
    const { path, content } = body;

    const validationError = validateManagedPath(typeof path === 'string' ? path : null);
    if (validationError) {
      return NextResponse.json({ message: validationError }, { status: 400 });
    }

    if (typeof content !== 'string') {
      return NextResponse.json({ message: 'Missing required "content" parameter' }, { status: 400 });
    }

    const result = await createFile(path, content);

    logAudit({
      actorId: getActorId(session),
      actionType: AuditActionType.FILE_CREATE,
      targetId: path,
      details: { path },
    }).catch(() => {});

    return NextResponse.json({ ok: result.ok, path }, { status: 201 });
  } catch (error) {
    console.error('Error creating managed file:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH /api/control-center/files - Update an existing managed file
async function patchHandler(req: NextRequest, session: unknown) {
  try {
    const body = await req.json();
    const { path, content } = body;

    const validationError = validateManagedPath(typeof path === 'string' ? path : null);
    if (validationError) {
      return NextResponse.json({ message: validationError }, { status: 400 });
    }

    if (typeof content !== 'string') {
      return NextResponse.json({ message: 'Missing required "content" parameter' }, { status: 400 });
    }

    const result = await updateFile(path, content);

    logAudit({
      actorId: getActorId(session),
      actionType: AuditActionType.FILE_UPDATE,
      targetId: path,
      details: { path },
    }).catch(() => {});

    return NextResponse.json({ ok: result.ok, path });
  } catch (error) {
    console.error('Error updating managed file:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/control-center/files - Delete a managed file
async function deleteHandler(req: NextRequest, session: unknown) {
  try {
    const { searchParams } = new URL(req.url);
    const path = searchParams.get('path');

    const validationError = validateManagedPath(path);
    if (validationError) {
      return NextResponse.json({ message: validationError }, { status: 400 });
    }

    const result = await deleteFile(path!);

    logAudit({
      actorId: getActorId(session),
      actionType: AuditActionType.FILE_DELETE,
      targetId: path!,
      details: { path },
    }).catch(() => {});

    return NextResponse.json({ ok: result.ok, path });
  } catch (error) {
    console.error('Error deleting managed file:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export const GET = withCapability('agent-control:files:read')(getHandler);
export const POST = withCapability('agent-control:files:write')(postHandler);
export const PATCH = withCapability('agent-control:files:write')(patchHandler);
export const DELETE = withCapability('agent-control:files:delete')(deleteHandler);
