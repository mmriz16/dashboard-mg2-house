import { NextRequest } from 'next/server';
import { withCapability } from '@/lib/auth/guards';
import { getTasksEventVersion, subscribeTasksEvent } from '@/lib/tasks-events';

async function getHandler(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      send('connected', { version: getTasksEventVersion(), at: new Date().toISOString() });

      const unsubscribe = subscribeTasksEvent((payload) => {
        send('task-change', payload);
      });

      const heartbeat = setInterval(() => {
        send('heartbeat', { at: new Date().toISOString() });
      }, 20_000);

      const onAbort = () => {
        clearInterval(heartbeat);
        unsubscribe();
        controller.close();
      };

      req.signal.addEventListener('abort', onAbort, { once: true });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

export const GET = withCapability('agent-control:subagents:read')(getHandler);
