"use client";

import { useMemo, useState } from "react";

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

const SEED_TASKS: TaskItem[] = [
  {
    id: "tsk-001",
    title: "Stabilize OpenClaw gateway heartbeat alerts",
    status: "in-progress",
    ownerType: "main-agent",
    ownerName: "Main Agent",
    updatedAt: "2m ago",
  },
  {
    id: "tsk-002",
    title: "Audit cron failure spikes and recovery policy",
    status: "todo",
    ownerType: "main-agent",
    ownerName: "Main Agent",
    updatedAt: "12m ago",
  },
  {
    id: "tsk-003",
    title: "Implement typed confirm dialog hardening",
    status: "review",
    ownerType: "sub-agent",
    ownerName: "Subagent ACC-01",
    updatedAt: "25m ago",
  },
  {
    id: "tsk-004",
    title: "Write API integration tests for control-center routes",
    status: "todo",
    ownerType: "sub-agent",
    ownerName: "Subagent QA-02",
    updatedAt: "40m ago",
  },
  {
    id: "tsk-005",
    title: "Summarize evening mission progress report",
    status: "inbox",
    ownerType: "main-agent",
    ownerName: "Main Agent",
    updatedAt: "1h ago",
  },
  {
    id: "tsk-006",
    title: "Refactor automation status badges in dashboard",
    status: "done",
    ownerType: "sub-agent",
    ownerName: "Subagent UI-03",
    updatedAt: "3h ago",
  },
];

export default function AgentTasksPage() {
  const [tasks, setTasks] = useState<TaskItem[]>(SEED_TASKS);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);

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
          </section>
        ))}
      </div>
    </main>
  );
}
