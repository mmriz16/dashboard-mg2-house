import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { withCapability } from '@/lib/auth/guards';

type DailyItem = {
  file: string;
  date: string;
  updatedAt: string;
  preview: string;
};

const MEMORY_DIR = path.join(process.cwd(), 'memory');
const LONG_TERM_FILE = path.join(process.cwd(), 'MEMORY.md');

function safePreview(content: string, max = 160) {
  const clean = content.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

async function listDaily(): Promise<DailyItem[]> {
  try {
    const entries = await fs.readdir(MEMORY_DIR, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile() && /^\d{4}-\d{2}-\d{2}\.md$/.test(entry.name))
      .map((entry) => entry.name);

    const items = await Promise.all(
      files.map(async (file) => {
        const fullPath = path.join(MEMORY_DIR, file);
        const [stat, content] = await Promise.all([
          fs.stat(fullPath),
          fs.readFile(fullPath, 'utf8').catch(() => ''),
        ]);

        return {
          file,
          date: file.replace('.md', ''),
          updatedAt: stat.mtime.toISOString(),
          preview: safePreview(content),
        } satisfies DailyItem;
      }),
    );

    return items.sort((a, b) => b.date.localeCompare(a.date));
  } catch {
    return [];
  }
}

async function handler(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const file = (searchParams.get('file') ?? '').trim();

  if (file) {
    if (!/^\d{4}-\d{2}-\d{2}\.md$/.test(file)) {
      return NextResponse.json({ error: 'Invalid file parameter' }, { status: 400 });
    }

    const fullPath = path.join(MEMORY_DIR, file);
    try {
      const content = await fs.readFile(fullPath, 'utf8');
      return NextResponse.json({ file, content });
    } catch {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
  }

  const [longTerm, daily] = await Promise.all([
    fs.readFile(LONG_TERM_FILE, 'utf8').catch(() => ''),
    listDaily(),
  ]);

  return NextResponse.json({
    longTerm: { file: 'MEMORY.md', content: longTerm },
    daily,
  });
}

export const GET = withCapability('agent-control:files:read')(handler);
