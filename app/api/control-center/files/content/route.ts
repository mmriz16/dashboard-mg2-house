
import { NextRequest, NextResponse } from 'next/server';
import { getFileContent } from '@/lib/openclaw';
import { withCapability } from '@/lib/auth/guards';

async function handler(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get('path');

  if (!path) {
    return NextResponse.json({ message: 'Missing required "path" parameter' }, { status: 400 });
  }

  // Basic validation to prevent path traversal
  if (path.includes('..')) {
    return NextResponse.json({ message: 'Invalid path' }, { status: 400 });
  }

  try {
    const result = await getFileContent(path);
    return NextResponse.json({ path: result.path, content: result.content });
  } catch (error) {
    console.error(`Error fetching content for ${path}:`, error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export const GET = withCapability('agent-control:files:read')(handler);

