import { NextRequest, NextResponse } from 'next/server';
import { getFileContent } from '@/lib/openclaw';
import { withCapability } from '@/lib/auth/guards';

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

async function handler(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get('path');
  const validationError = validateManagedPath(path);

  if (validationError) {
    return NextResponse.json({ message: validationError }, { status: 400 });
  }

  try {
    const result = await getFileContent(path!);
    return NextResponse.json({ path: result.path, content: result.content });
  } catch (error) {
    console.error(`Error fetching content for ${path}:`, error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export const GET = withCapability('agent-control:files:read')(handler);
