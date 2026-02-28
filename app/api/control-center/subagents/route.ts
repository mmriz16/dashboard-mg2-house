import { NextRequest, NextResponse } from 'next/server';
import { listSubagents } from '@/lib/openclaw';
import { withCapability } from '@/lib/auth/guards';

async function getHandler(req: NextRequest) {
  try {
    const subagents = await listSubagents();
    return NextResponse.json(Array.isArray(subagents) ? subagents : []);
  } catch (error) {
    console.error('Error fetching subagents:', error);
    return NextResponse.json([]);
  }
}

export const GET = withCapability('agent-control:subagents:read')(getHandler);
