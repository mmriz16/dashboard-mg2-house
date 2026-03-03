type TasksEventPayload = {
  type: 'task-created' | 'task-updated' | 'task-deleted';
  taskId?: string;
  at: string;
};

type Listener = (payload: TasksEventPayload & { version: number }) => void;

type TasksEventBus = {
  version: number;
  listeners: Set<Listener>;
};

declare global {
  var __tasksEventBus: TasksEventBus | undefined;
}

function getBus(): TasksEventBus {
  if (!globalThis.__tasksEventBus) {
    globalThis.__tasksEventBus = {
      version: 0,
      listeners: new Set(),
    };
  }
  return globalThis.__tasksEventBus;
}

export function publishTasksEvent(payload: TasksEventPayload) {
  const bus = getBus();
  bus.version += 1;
  const message = { ...payload, version: bus.version };
  for (const listener of bus.listeners) listener(message);
  return message;
}

export function subscribeTasksEvent(listener: Listener) {
  const bus = getBus();
  bus.listeners.add(listener);
  return () => bus.listeners.delete(listener);
}

export function getTasksEventVersion() {
  return getBus().version;
}
