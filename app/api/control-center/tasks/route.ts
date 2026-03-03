import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { listSubagents } from '@/lib/openclaw';
import { withCapability } from '@/lib/auth/guards';
import { publishTasksEvent } from '@/lib/tasks-events';

type TaskStatus = 'planning' | 'backlog' | 'in-progress' | 'review' | 'done' | 'inbox';
type Priority = 'low' | 'medium' | 'high';

type TaskItem = {
  id: string;
  title: string;
  status: TaskStatus;
  ownerType: 'main-agent' | 'sub-agent';
  ownerName: string;
  updatedAt: string;
  source: 'checklist' | 'subagent' | 'manual';
  detail: string;
  priority: Priority;
  needsRework?: boolean;
};

type TaskBoardState = {
  overrides: Record<string, { status?: TaskStatus; priority?: Priority; needsRework?: boolean; updatedAt: string }>;
};

type ManualTaskStore = {
  tasks: TaskItem[];
};

type TaskComment = {
  id: string;
  taskId: string;
  author: string;
  authorType: 'main-agent' | 'sub-agent' | 'human';
  text: string;
  createdAt: string;
};

type TaskCommentStore = {
  comments: Record<string, TaskComment[]>;
};

const STATE_FILE = path.join(process.cwd(), 'memory', 'tasks-board-state.json');
const MANUAL_TASKS_FILE = path.join(process.cwd(), 'memory', 'tasks-custom.json');
const COMMENTS_FILE = path.join(process.cwd(), 'memory', 'tasks-comments.json');

const DONE_ALLOWED_ACTOR_IDS = new Set(
  (process.env.TASKS_DONE_ALLOWED_IDS ?? '618580430,local-dev')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean),
);

const statusDefinitions: Record<TaskStatus, { label: string; description: string }> = {
  planning: {
    label: 'Planning',
    description: 'Task direncanakan dulu (scope, acceptance criteria, breakdown).',
  },
  backlog: {
    label: 'Backlog',
    description: 'Task siap eksekusi tapi nunggu giliran dikerjain.',
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
    description: 'Log masuk mentah: catatan baru, item belum dipilah ke workflow.',
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

function normalizeStatus(status: string | undefined): TaskStatus {
  const s = (status ?? '').toLowerCase();
  if (s === 'todo') return 'backlog';
  if (s === 'planning' || s === 'backlog' || s === 'in-progress' || s === 'review' || s === 'done' || s === 'inbox') return s;
  return 'inbox';
}

function normalizePriority(priority: string | undefined): Priority {
  if (priority === 'high' || priority === 'medium' || priority === 'low') return priority;
  return 'medium';
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

async function readManualTasks(): Promise<TaskItem[]> {
  try {
    const raw = await fs.readFile(MANUAL_TASKS_FILE, 'utf8');
    const parsed = JSON.parse(raw) as ManualTaskStore;
    return Array.isArray(parsed?.tasks) ? parsed.tasks.map((task) => ({ ...task, status: normalizeStatus(task.status), priority: normalizePriority(task.priority) })) : [];
  } catch {
    return [];
  }
}

async function writeManualTasks(tasks: TaskItem[]) {
  await fs.mkdir(path.dirname(MANUAL_TASKS_FILE), { recursive: true });
  await fs.writeFile(MANUAL_TASKS_FILE, JSON.stringify({ tasks }, null, 2), 'utf8');
}

async function readComments(): Promise<TaskCommentStore> {
  try {
    const raw = await fs.readFile(COMMENTS_FILE, 'utf8');
    const parsed = JSON.parse(raw) as TaskCommentStore;
    return { comments: parsed?.comments ?? {} };
  } catch {
    return { comments: {} };
  }
}

async function writeComments(store: TaskCommentStore) {
  await fs.mkdir(path.dirname(COMMENTS_FILE), { recursive: true });
  await fs.writeFile(COMMENTS_FILE, JSON.stringify(store, null, 2), 'utf8');
}

function parseChecklistToTasks(markdown: string): TaskItem[] {
  const lines = markdown.split(/\r?\n/);
  const tasks: TaskItem[] = [];

  let inLegendBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (/^Status legend:/i.test(trimmed)) {
      inLegendBlock = true;
      continue;
    }

    if (inLegendBlock && trimmed === '---') {
      inLegendBlock = false;
      continue;
    }

    if (inLegendBlock) continue;

    const match = line.match(/^\s*- \[(.| )\]\s+(.+)$/);
    if (!match) continue;

    const marker = match[1].trim();
    const title = match[2].trim();

    if (/^(todo|planning|in progress|in-progress|done|review)$/i.test(title)) continue;

    let status: TaskStatus = 'inbox';
    if (marker.toLowerCase() === 'x') status = 'done';
    else if (marker === '~') status = 'in-progress';
    else if (marker === ' ') status = 'backlog';

    tasks.push({
      id: makeStableId('main', title),
      title,
      status,
      ownerType: 'main-agent',
      ownerName: 'Main Agent',
      updatedAt: 'from checklist',
      source: 'checklist',
      detail: `Checklist item dari docs/agent-control-tasks.md`,
      priority: 'medium',
      needsRework: false,
    });
  }

  return tasks;
}

function mapSubagentStatusToTaskStatus(status?: string): TaskStatus {
  const normalized = (status ?? '').toLowerCase();
  if (normalized.includes('run') || normalized.includes('active') || normalized.includes('work')) return 'in-progress';
  if (normalized.includes('done') || normalized.includes('success') || normalized.includes('complete')) return 'done';
  if (normalized.includes('error') || normalized.includes('fail')) return 'review';
  if (normalized.includes('queue') || normalized.includes('idle') || normalized.includes('wait')) return 'backlog';
  return 'inbox';
}

function priorityWeight(priority: Priority) {
  return priority === 'high' ? 3 : priority === 'medium' ? 2 : 1;
}

async function getHandler(req: NextRequest) {
  void req;
  try {
    const [subagents, checklistContent, state, manualTasks, comments] = await Promise.all([
      listSubagents(),
      fs.readFile(path.join(process.cwd(), 'docs', 'agent-control-tasks.md'), 'utf8').catch(() => ''),
      readBoardState(),
      readManualTasks(),
      readComments(),
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
        priority: 'medium',
        needsRework: false,
      };
    });

    const mergedTasks = [...manualTasks, ...subagentTasks, ...checklistTasks].map((task) => {
      const override = state.overrides[task.id];
      if (!override) return task;

      return {
        ...task,
        status: override.status ? normalizeStatus(override.status) : normalizeStatus(task.status),
        priority: override.priority ? normalizePriority(override.priority) : normalizePriority(task.priority),
        needsRework: override.needsRework ?? task.needsRework ?? false,
        updatedAt: override.updatedAt,
      };
    });

    const idleSubagents = (Array.isArray(subagents) ? subagents : []).filter((s) => String(s?.status ?? '').toLowerCase().includes('idle'));
    const queueCandidates = mergedTasks
      .filter((task) => task.source !== 'subagent' && task.status === 'backlog')
      .sort((a, b) => {
        const rw = Number(Boolean(b.needsRework)) - Number(Boolean(a.needsRework));
        if (rw !== 0) return rw;
        const p = priorityWeight(b.priority) - priorityWeight(a.priority);
        if (p !== 0) return p;
        return String(b.updatedAt).localeCompare(String(a.updatedAt));
      });

    const suggestedAssignments = idleSubagents.slice(0, queueCandidates.length).map((sub, idx) => ({
      subagentId: String(sub.id ?? ''),
      subagentName: String(sub.label ?? sub.name ?? sub.id ?? 'subagent'),
      taskId: queueCandidates[idx]?.id,
      taskTitle: queueCandidates[idx]?.title,
      priority: queueCandidates[idx]?.priority,
    }));

    return NextResponse.json({
      tasks: mergedTasks,
      comments: comments.comments,
      statusDefinitions,
      suggestedAssignments,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error building tasks board data:', error);
    return NextResponse.json({ tasks: [], comments: {}, statusDefinitions, suggestedAssignments: [], updatedAt: new Date().toISOString() });
  }
}

async function postHandler(req: NextRequest) {
  try {
    const body = await req.json();
    const title = typeof body?.title === 'string' ? body.title.trim() : '';
    const detail = typeof body?.detail === 'string' ? body.detail.trim() : '';
    const ownerName = typeof body?.ownerName === 'string' && body.ownerName.trim() ? body.ownerName.trim() : 'Main Agent';
    const status = normalizeStatus(body?.status as string);
    const priority = normalizePriority(body?.priority as string);
    const source = body?.source === 'subagent' || body?.source === 'checklist' ? body.source : 'manual';

    if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 });

    const now = new Date().toISOString();
    const task: TaskItem = {
      id: `manual-${Date.now().toString(36)}`,
      title,
      status,
      ownerType: source === 'subagent' ? 'sub-agent' : 'main-agent',
      ownerName,
      updatedAt: now,
      source,
      detail: detail || 'Manual task created from Tasks board.',
      priority,
      needsRework: false,
    };

    const existing = await readManualTasks();
    await writeManualTasks([task, ...existing]);
    publishTasksEvent({ type: 'task-created', taskId: task.id, at: new Date().toISOString() });

    return NextResponse.json({ ok: true, task }, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}

async function patchHandler(req: NextRequest, session: { user?: { id?: string } }) {
  try {
    const body = await req.json();

    if (body?.action === 'add-comment') {
      const taskId = typeof body?.taskId === 'string' ? body.taskId : '';
      const text = typeof body?.text === 'string' ? body.text.trim() : '';
      const author = typeof body?.author === 'string' && body.author.trim() ? body.author.trim() : 'Agent';
      const authorType = body?.authorType === 'sub-agent' || body?.authorType === 'human' ? body.authorType : 'main-agent';

      if (!taskId || !text) return NextResponse.json({ error: 'taskId and text are required' }, { status: 400 });

      const store = await readComments();
      const nextComment: TaskComment = {
        id: `c-${Date.now().toString(36)}`,
        taskId,
        author,
        authorType,
        text,
        createdAt: new Date().toISOString(),
      };

      store.comments[taskId] = [nextComment, ...(store.comments[taskId] ?? [])];
      await writeComments(store);

      const state = await readBoardState();
      const currentStatus = normalizeStatus(
        (state.overrides[taskId]?.status as string | undefined) ??
          (typeof body?.taskStatus === 'string' ? body.taskStatus : 'inbox'),
      );
      // Kalau human kasih komentar saat review, task otomatis balik ke backlog + needs rework.
      if (authorType === 'human' && currentStatus === 'review') {
        state.overrides[taskId] = {
          ...state.overrides[taskId],
          status: 'backlog',
          needsRework: true,
          updatedAt: new Date().toISOString(),
        };
        await writeBoardState(state);
      }

      publishTasksEvent({ type: 'task-updated', taskId, at: new Date().toISOString() });
      return NextResponse.json({
        ok: true,
        comment: nextComment,
        status: state.overrides[taskId]?.status,
        needsRework: state.overrides[taskId]?.needsRework,
      });
    }

    const taskId = typeof body?.taskId === 'string' ? body.taskId : '';
    const status = normalizeStatus(body?.status as string);
    const priority = body?.priority ? normalizePriority(body?.priority as string) : undefined;

    if (!taskId) return NextResponse.json({ error: 'taskId is required' }, { status: 400 });

    const actorId = String(session?.user?.id ?? '');
    if (status === 'done' && !DONE_ALLOWED_ACTOR_IDS.has(actorId)) {
      return NextResponse.json({ error: 'Hanya owner yang boleh memindahkan task ke Done.' }, { status: 403 });
    }

    const state = await readBoardState();
    state.overrides[taskId] = {
      ...state.overrides[taskId],
      status,
      priority: priority ?? state.overrides[taskId]?.priority,
      needsRework: status === 'backlog' ? (state.overrides[taskId]?.needsRework ?? false) : false,
      updatedAt: new Date().toISOString(),
    };

    await writeBoardState(state);
    publishTasksEvent({ type: 'task-updated', taskId, at: new Date().toISOString() });

    return NextResponse.json({ ok: true, taskId, status, priority: state.overrides[taskId].priority, updatedAt: state.overrides[taskId].updatedAt });
  } catch (error) {
    console.error('Error persisting task update:', error);
    return NextResponse.json({ error: 'Failed to persist task update' }, { status: 500 });
  }
}

async function deleteHandler(req: NextRequest) {
  try {
    const body = await req.json();
    const taskId = typeof body?.taskId === 'string' ? body.taskId : '';

    if (!taskId) return NextResponse.json({ error: 'taskId is required' }, { status: 400 });

    const manualTasks = await readManualTasks();
    const nextManualTasks = manualTasks.filter((task) => task.id !== taskId);

    if (nextManualTasks.length === manualTasks.length) {
      return NextResponse.json({ error: 'Task tidak ditemukan atau bukan manual task.' }, { status: 404 });
    }

    await writeManualTasks(nextManualTasks);

    const state = await readBoardState();
    if (state.overrides[taskId]) {
      delete state.overrides[taskId];
      await writeBoardState(state);
    }

    const comments = await readComments();
    if (comments.comments[taskId]) {
      delete comments.comments[taskId];
      await writeComments(comments);
    }

    publishTasksEvent({ type: 'task-deleted', taskId, at: new Date().toISOString() });
    return NextResponse.json({ ok: true, taskId, deleted: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}

export const GET = withCapability('agent-control:subagents:read')(getHandler);
export const POST = withCapability('agent-control:subagents:write')(postHandler);
export const PATCH = withCapability('agent-control:subagents:write')(patchHandler);
export const DELETE = withCapability('agent-control:subagents:write')(deleteHandler);
