"use client";

import { useEffect, useMemo, useState } from "react";

type TaskStatus = "inbox" | "todo" | "in-progress" | "review" | "done";
type OwnerType = "main-agent" | "sub-agent";

type TaskItem = {
  id: string;
  title: string;
  status: TaskStatus;
  ownerType: OwnerType;
  ownerName: string;
  updatedAt: string;
};

const COLUMNS: Array<{ key: TaskStatus; label: string }> = [
  { key: "inbox", label: "Inbox" },
  { key: "todo", label: "Todo" },
  { key: "in-progress", label: "In Progress" },
  { key: "review", label: "Review" },
  { key: "done", label: "Done" },
];

export default function AgentTasksPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/control-center/tasks');
        if (!res.ok) throw new Error(`Failed to fetch tasks: ${res.status}`);
        const data = await res.json();
        setTasks(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tasks');
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, []);

  const grouped = useMemo(() => {
    return COLUMNS.reduce<Record<TaskStatus, TaskItem[]>>((acc, col) => {
      acc[col.key] = tasks.filter((task) => task.status === col.key);
      return acc;
    }, {
      inbox: [],
      todo: [],
      "in-progress": [],
      review: [],
      done: [],
    });
  }, [tasks]);

  const moveTask = (taskId: string, nextStatus: TaskStatus) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status: nextStatus,
              updatedAt: "just now",
            }
          : task,
      ),
    );
  };

  return (
    <main className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-manrope font-medium text-white">Tasks</h1>
        <p className="text-white/50 font-ibm-plex-mono text-sm uppercase tracking-widest">
          Kanban board untuk pantau tugas main agent + sub-agent
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-3">
        {COLUMNS.map((column) => (
          <section
            key={column.key}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (!draggingTaskId) return;
              moveTask(draggingTaskId, column.key);
              setDraggingTaskId(null);
            }}
            className="min-h-[360px] rounded-2xl border border-border bg-surface-card p-3"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">{column.label}</h2>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/70">
                {grouped[column.key].length}
              </span>
            </div>

            {loading ? (
              <p className="text-xs text-white/50">Loading tasks...</p>
            ) : (
              <div className="space-y-2">
                {grouped[column.key].map((task) => (
                  <article
                    key={task.id}
                    draggable
                    onDragStart={() => setDraggingTaskId(task.id)}
                    onDragEnd={() => setDraggingTaskId(null)}
                    className="cursor-grab rounded-xl border border-white/10 bg-white/5 p-3 active:cursor-grabbing"
                  >
                    <p className="text-sm text-white leading-snug">{task.title}</p>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-white/60">
                      <span>
                        {task.ownerType === "main-agent" ? "Main" : "Sub"} · {task.ownerName}
                      </span>
                      <span>{task.updatedAt}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </main>
  );
}
