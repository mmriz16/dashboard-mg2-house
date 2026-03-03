"use client";

import { useEffect, useMemo, useState } from "react";

type TaskStatus = "todo" | "in-progress" | "review" | "done" | "inbox";
type OwnerType = "main-agent" | "sub-agent";

type TaskItem = {
  id: string;
  title: string;
  status: TaskStatus;
  ownerType: OwnerType;
  ownerName: string;
  updatedAt: string;
  source?: "checklist" | "subagent";
  detail?: string;
};

type StatusDefinition = {
  label: string;
  description: string;
};

const COLUMNS: Array<{ key: TaskStatus; label: string; kind?: "normal" | "log" }> = [
  { key: "todo", label: "Todo" },
  { key: "in-progress", label: "In Progress" },
  { key: "review", label: "Review" },
  { key: "done", label: "Done" },
  { key: "inbox", label: "Inbox", kind: "log" },
];

export default function AgentTasksPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [definitions, setDefinitions] = useState<Record<string, StatusDefinition>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/control-center/tasks");
        if (!res.ok) throw new Error(`Failed to fetch tasks: ${res.status}`);
        const data = await res.json();
        setTasks(Array.isArray(data?.tasks) ? data.tasks : []);
        setDefinitions(data?.statusDefinitions ?? {});
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load tasks");
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, []);

  const grouped = useMemo(() => {
    return COLUMNS.reduce<Record<TaskStatus, TaskItem[]>>(
      (acc, col) => {
        acc[col.key] = tasks.filter((task) => task.status === col.key);
        return acc;
      },
      {
        todo: [],
        "in-progress": [],
        review: [],
        done: [],
        inbox: [],
      },
    );
  }, [tasks]);

  const moveTask = async (taskId: string, nextStatus: TaskStatus) => {
    const prev = tasks;
    const optimistic = prev.map((task) =>
      task.id === taskId
        ? {
            ...task,
            status: nextStatus,
            updatedAt: "just now",
          }
        : task,
    );

    setTasks(optimistic);
    setSavingId(taskId);

    try {
      const res = await fetch("/api/control-center/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, status: nextStatus }),
      });

      if (!res.ok) {
        throw new Error(`Failed to persist: ${res.status}`);
      }

      const data = await res.json();
      setTasks((current) =>
        current.map((task) =>
          task.id === taskId
            ? {
                ...task,
                updatedAt: data.updatedAt ?? "just now",
              }
            : task,
        ),
      );
    } catch (err) {
      setTasks(prev);
      setError(err instanceof Error ? err.message : "Failed to persist task status");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <main className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-manrope font-medium text-white">Tasks</h1>
        <p className="text-white/50 font-ibm-plex-mono text-sm uppercase tracking-widest">
          Kanban board untuk pantau tugas main agent + sub-agent
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-2">
        {(Object.entries(definitions) as Array<[string, StatusDefinition]>).map(([key, item]) => (
          <div key={key} className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-xs font-semibold text-white">{item.label}</p>
            <p className="text-[11px] text-white/55 mt-1 leading-relaxed">{item.description}</p>
          </div>
        ))}
      </div>

      {error && <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-3">
        {COLUMNS.map((column) => {
          const isInbox = column.kind === "log";

          return (
            <section
              key={column.key}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (!draggingTaskId) return;
                void moveTask(draggingTaskId, column.key);
                setDraggingTaskId(null);
              }}
              className={`min-h-[420px] rounded-2xl p-3 ${
                isInbox
                  ? "border border-dashed border-sky-400/30 bg-sky-500/5"
                  : "border border-border bg-surface-card"
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className={`text-sm font-semibold ${isInbox ? "text-sky-200" : "text-white"}`}>{column.label}</h2>
                <span className={`rounded-full px-2 py-0.5 text-[11px] ${isInbox ? "bg-sky-500/20 text-sky-200" : "bg-white/10 text-white/70"}`}>
                  {grouped[column.key].length}
                </span>
              </div>

              {isInbox && (
                <p className="mb-2 text-[11px] text-sky-100/70">Inbox = log mentah sebelum dipilah ke status kerja.</p>
              )}

              {loading ? (
                <p className="text-xs text-white/50">Loading tasks...</p>
              ) : (
                <div className="space-y-2">
                  {grouped[column.key].map((task) => (
                    <article
                      key={task.id}
                      draggable
                      onClick={() => setSelectedTask(task)}
                      onDragStart={() => setDraggingTaskId(task.id)}
                      onDragEnd={() => setDraggingTaskId(null)}
                      className="cursor-grab rounded-xl border border-white/10 bg-white/5 p-3 active:cursor-grabbing hover:bg-white/[0.08]"
                    >
                      <p className="text-sm text-white leading-snug">{task.title}</p>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-white/60">
                        <span>
                          {task.ownerType === "main-agent" ? "Main" : "Sub"} · {task.ownerName}
                        </span>
                        <span>{savingId === task.id ? "saving..." : task.updatedAt}</span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {selectedTask && (
        <div className="fixed inset-0 z-50">
          <button className="absolute inset-0 bg-black/45" aria-label="close" onClick={() => setSelectedTask(null)} />
          <aside className="absolute right-0 top-0 h-full w-full max-w-[50vw] min-w-[420px] border-l border-white/10 bg-[#0b0f17] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-white/50">Task Detail</p>
                <h3 className="mt-1 text-xl font-semibold text-white">{selectedTask.title}</h3>
              </div>
              <button className="rounded-md border border-white/20 px-3 py-1 text-xs text-white/80 hover:bg-white/10" onClick={() => setSelectedTask(null)}>
                Close
              </button>
            </div>

            <div className="mt-5 space-y-3 text-sm text-white/80">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p>
                  <span className="text-white/50">Owner:</span> {selectedTask.ownerName}
                </p>
                <p>
                  <span className="text-white/50">Source:</span> {selectedTask.source ?? "-"}
                </p>
                <p>
                  <span className="text-white/50">Status:</span> {selectedTask.status}
                </p>
                <p>
                  <span className="text-white/50">Last Update:</span> {selectedTask.updatedAt}
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-xs uppercase tracking-wider text-white/50">Status Definition</p>
                <p className="mt-1 text-white">{definitions[selectedTask.status]?.description ?? "-"}</p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-xs uppercase tracking-wider text-white/50">Detail</p>
                <pre className="mt-2 whitespace-pre-wrap font-mono text-xs text-white/80">{selectedTask.detail ?? "No detail"}</pre>
              </div>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
