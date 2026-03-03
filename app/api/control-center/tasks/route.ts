import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { listSubagents } from '@/lib/openclaw';
import { withCapability } from '@/lib/auth/guards';

type TaskStatus = 'inbox' | 'todo' | 'in-progress' | 'review' | 'done';

type TaskItem = {
  id: string;
  title: string;
  status: TaskStatus;
  ownerType: 'main-agent' | 'sub-agent';
  ownerName: string;
  updatedAt: string;
};

function parseChecklistToTasks(markdown: string): TaskItem[] {
  const lines = markdown.split(/\r?\n/);
  let i = 0;
  const tasks: TaskItem[] = [];

  for (const line of lines) {
    const match = line.match(/^\s*- \[(.| )\]\s+(.+)$/);
    if (!match) continue;

    const marker = match[1].trim();
    const title = match[2].trim();

    let status: TaskStatus = 'inbox';
    if (marker.toLowerCase() === 'x') status = 'done';
    else if (marker === '~') status = 'in-progress';
    else if (marker === ' ') status = 'todo';

    tasks.push({
      id: `main-${i++}`,
      title,
      status,
      ownerType: 'main-agent',
      ownerName: 'Main Agent',
      updatedAt: 'from checklist',
    });
  }

  return tasks;
}

function mapSubagentStatusToTaskStatus(status?: string): TaskStatus {
  const normalized = (status ?? '').toLowerCase();
  if (normalized.includes('run') || normalized.includes('active') || normalized.includes('work')) {
    return 'in-progress';
  }
  if (normalized.includes('done') || normalized.includes('success') || normalized.includes('complete')) {
    return 'done';
  }
  if (normalized.includes('error') || normalized.includes('fail')) {
    return 'review';
  }
  if (normalized.includes('queue') || normalized.includes('idle') || normalized.includes('wait')) {
    return 'todo';
  }
  return 'inbox';
}

async function getHandler(req: NextRequest) {
  try {
    const [subagents, checklistContent] = await Promise.all([
      listSubagents(),
      fs.readFile(path.join(process.cwd(), 'docs', 'agent-control-tasks.md'), 'utf8').catch(() => ''),
    ]);

    const checklistTasks = checklistContent ? parseChecklistToTasks(checklistContent) : [];

    const subagentTasks: TaskItem[] = (Array.isArray(subagents) ? subagents : []).map((sub, idx) => {
      const label =
        (typeof sub.label === 'string' && sub.label.trim()) ||
        (typeof sub.name === 'string' && sub.name.trim()) ||
        `Subagent ${String(sub.id).slice(0, 8)}`;

      return {
        id: `sub-${sub.id ?? idx}`,
        title: label,
        status: mapSubagentStatusToTaskStatus(typeof sub.status === 'string' ? sub.status : undefined),
        ownerType: 'sub-agent',
        ownerName: label,
        updatedAt: typeof sub.updatedAt === 'string' ? sub.updatedAt : (typeof sub.status === 'string' ? sub.status : 'live'),
      };
    });

    return NextResponse.json([...subagentTasks, ...checklistTasks]);
  } catch (error) {
    console.error('Error building tasks board data:', error);
    return NextResponse.json([]);
  }
}

export const GET = withCapability('agent-control:subagents:read')(getHandler);
