import { NextRequest, NextResponse } from 'next/server';
import { listFiles, createFile, updateFile, deleteFile } from '@/lib/openclaw';
import { withCapability } from '@/lib/auth/guards';
import { logAudit, AuditActionType, getActorId } from '@/lib/audit';

// GET /api/control-center/files - List all managed files
async function getHandler(req: NextRequest) {
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

    if (!path) {
      return NextResponse.json({ message: 'Missing required "path" parameter' }, { status: 400 });
    }

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ message: 'Missing required "content" parameter' }, { status: 400 });
    }

    // Basic validation to prevent path traversal
    if (path.includes('..')) {
      return NextResponse.json({ message: 'Invalid path: path traversal not allowed' }, { status: 400 });
    }

    // Validate path is within allowed directories
    const allowedPrefixes = ['memory/', 'docs/', 'skills/', 'lib/', 'app/'];
    const isAllowed = allowedPrefixes.some(prefix => path.startsWith(prefix));
    if (!isAllowed) {
      return NextResponse.json({ 
        message: `Invalid path: must start with one of ${allowedPrefixes.join(', ')}` 
      }, { status: 400 });
    }

    const result = await createFile(path, content);
    
    // Audit log (best-effort: won't break primary action)
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

    if (!path) {
      return NextResponse.json({ message: 'Missing required "path" parameter' }, { status: 400 });
    }

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ message: 'Missing required "content" parameter' }, { status: 400 });
    }

    // Basic validation to prevent path traversal
    if (path.includes('..')) {
      return NextResponse.json({ message: 'Invalid path: path traversal not allowed' }, { status: 400 });
    }

    // Validate path is within allowed directories
    const allowedPrefixes = ['memory/', 'docs/', 'skills/', 'lib/', 'app/'];
    const isAllowed = allowedPrefixes.some(prefix => path.startsWith(prefix));
    if (!isAllowed) {
      return NextResponse.json({ 
        message: `Invalid path: must start with one of ${allowedPrefixes.join(', ')}` 
      }, { status: 400 });
    }

    const result = await updateFile(path, content);

    // Audit log (best-effort: won't break primary action)
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

    if (!path) {
      return NextResponse.json({ message: 'Missing required "path" parameter' }, { status: 400 });
    }

    // Basic validation to prevent path traversal
    if (path.includes('..')) {
      return NextResponse.json({ message: 'Invalid path: path traversal not allowed' }, { status: 400 });
    }

    // Validate path is within allowed directories
    const allowedPrefixes = ['memory/', 'docs/', 'skills/', 'lib/', 'app/'];
    const isAllowed = allowedPrefixes.some(prefix => path.startsWith(prefix));
    if (!isAllowed) {
      return NextResponse.json({ 
        message: `Invalid path: must start with one of ${allowedPrefixes.join(', ')}` 
      }, { status: 400 });
    }

    const result = await deleteFile(path);

    // Audit log (best-effort: won't break primary action)
    logAudit({
      actorId: getActorId(session),
      actionType: AuditActionType.FILE_DELETE,
      targetId: path,
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


