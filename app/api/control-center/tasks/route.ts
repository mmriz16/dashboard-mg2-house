import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { listSubagents } from '@/lib/openclaw';
import { withCapability } from '@/lib/auth/guards';

type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done' | 'inbox';

type TaskItem = {
  id: string;
  title: string;
  status: TaskStatus;
  ownerType: 'main-agent' | 'sub-agent';
  ownerName: string;
  updatedAt: string;
  source: 'checklist' | 'subagent';
  detail: string;
};

type TaskBoardState = {
  overrides: Record<string, { status: TaskStatus; updatedAt: string }>;
};

const STATE_FILE = path.join(process.cwd(), 'memory', 'tasks-board-state.json');

const statusDefinitions: Record<TaskStatus, { label: string; description: string }> = {
  todo: {
    label: 'Todo',
    description: 'Task sudah jelas dan siap dikerjakan, tapi belum ada eksekusi aktif.',
  },
  'in-progress': {
    label: 'In Progress',
    description: 'Task lagi dikerjain aktif oleh main agent atau sub-agent.',
  },
  review: {
    label: 'Review',
    description: 'Task sudah ada hasil awal, butuh verifikasi/QA/approval.',
  },
  done: {
    label: 'Done',
    description: 'Task selesai dan hasilnya sudah dianggap final.',
  },
  inbox: {
    label: 'Inbox',
    description: 'Log masuk mentah: catatan baru, item belum dipilah ke lifecycle kerja.',
  },
};

function makeStableId(prefix: string, value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);

  return `${prefix}-${slug || 'item'}`;
}

async function readBoardState(): Promise<TaskBoardState> {
  try {
    const raw = await fs.readFile(STATE_FILE, 'utf8');
    const parsed = JSON.parse(raw) as TaskBoardState;
    return { overrides: parsed?.overrides ?? {} };
  } catch {
    return { overrides: {} };
  }
}

async function writeBoardState(state: TaskBoardState) {
  await fs.mkdir(path.dirname(STATE_FILE), { recursive: true });
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

function parseChecklistToTasks(markdown: string): TaskItem[] {
  const lines = markdown.split(/\r?\n/);
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
      id: makeStableId('main', title),
      title,
      status,
      ownerType: 'main-agent',
      ownerName: 'Main Agent',
      updatedAt: 'from checklist',
      source: 'checklist',
      detail: `Checklist item dari docs/agent-control-tasks.md\n\nStatus awal terdeteksi dari marker markdown: [ ] / [~] / [x].`,
    });
  }

  return tasks;
}

function mapSubagentStatusToTaskStatus(status?: string): TaskStatus {
  const normalized = (status ?? '').toLowerCase();
  if (normalized.includes('run') || normalized.includes('active') || normalized.includes('work')) return 'in-progress';
  if (normalized.includes('done') || normalized.includes('success') || normalized.includes('complete')) return 'done';
  if (normalized.includes('error') || normalized.includes('fail')) return 'review';
  if (normalized.includes('queue') || normalized.includes('idle') || normalized.includes('wait')) return 'todo';
  return 'inbox';
}

async function getHandler(req: NextRequest) {
  try {
    const [subagents, checklistContent, state] = await Promise.all([
      listSubagents(),
      fs.readFile(path.join(process.cwd(), 'docs', 'agent-control-tasks.md'), 'utf8').catch(() => ''),
      readBoardState(),
    ]);

    const checklistTasks = checklistContent ? parseChecklistToTasks(checklistContent) : [];

    const subagentTasks: TaskItem[] = (Array.isArray(subagents) ? subagents : []).map((sub) => {
      const label =
        (typeof sub.label === 'string' && sub.label.trim()) ||
        (typeof sub.name === 'string' && sub.name.trim()) ||
        `Subagent ${String(sub.id).slice(0, 8)}`;

      const baseStatus = mapSubagentStatusToTaskStatus(typeof sub.status === 'string' ? sub.status : undefined);

      return {
        id: makeStableId('sub', `${sub.id ?? label}`),
        title: label,
        status: baseStatus,
        ownerType: 'sub-agent',
        ownerName: label,
        updatedAt: typeof sub.updatedAt === 'string' ? sub.updatedAt : 'live',
        source: 'subagent',
        detail: `Live sub-agent session\n\nID: ${String(sub.id ?? '-')}\nModel: ${String(sub.model ?? '-')}\nRaw Status: ${String(sub.status ?? '-')}`,
      };
    });

    const mergedTasks = [...subagentTasks, ...checklistTasks].map((task) => {
      const override = state.overrides[task.id];
      if (!override) return task;

      return {
        ...task,
        status: override.status,
        updatedAt: override.updatedAt,
      };
    });

    return NextResponse.json({
      tasks: mergedTasks,
      statusDefinitions,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error building tasks board data:', error);
    return NextResponse.json({ tasks: [], statusDefinitions, updatedAt: new Date().toISOString() });
  }
}

async function patchHandler(req: NextRequest) {
  try {
    const body = await req.json();
    const taskId = typeof body?.taskId === 'string' ? body.taskId : '';
    const status = body?.status as TaskStatus;

    const validStatus: TaskStatus[] = ['todo', 'in-progress', 'review', 'done', 'inbox'];

    if (!taskId) return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
    if (!validStatus.includes(status)) return NextResponse.json({ error: 'invalid status' }, { status: 400 });

    const state = await readBoardState();
    state.overrides[taskId] = {
      status,
      updatedAt: new Date().toISOString(),
    };

    await writeBoardState(state);

    return NextResponse.json({ ok: true, taskId, status, updatedAt: state.overrides[taskId].updatedAt });
  } catch (error) {
    console.error('Error persisting task status:', error);
    return NextResponse.json({ error: 'Failed to persist task status' }, { status: 500 });
  }
}

export const GET = withCapability('agent-control:subagents:read')(getHandler);
export const PATCH = withCapability('agent-control:subagents:write')(patchHandler);
