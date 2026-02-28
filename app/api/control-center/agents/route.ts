import { NextRequest, NextResponse } from 'next/server';
import { listAgents } from '@/lib/openclaw';
import { withCapability } from '@/lib/auth/guards';

async function getHandler(req: NextRequest) {
  try {
    const agents = await listAgents();
    return NextResponse.json(Array.isArray(agents) ? agents : []);
  } catch (error) {
    console.error('Error fetching agents:', error);
    return NextResponse.json([]);
  }
}

export const GET = withCapability('agent-control:agents:read')(getHandler);
