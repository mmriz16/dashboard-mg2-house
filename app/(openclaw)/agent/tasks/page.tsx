"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type TaskStatus =
  | "planning"
  | "backlog"
  | "in-progress"
  | "review"
  | "done"
  | "inbox";
type OwnerType = "main-agent" | "sub-agent";
type Priority = "low" | "medium" | "high";

type TaskItem = {
  id: string;
  title: string;
  status: TaskStatus;
  ownerType: OwnerType;
  ownerName: string;
  updatedAt: string;
  source?: "checklist" | "subagent" | "manual";
  detail?: string;
  priority: Priority;
  needsRework?: boolean;
};

type TaskComment = {
  id: string;
  taskId: string;
  author: string;
  authorType: "main-agent" | "sub-agent" | "human";
  text: string;
  createdAt: string;
};

type StatusDefinition = {
  label: string;
  description: string;
};

const MAIN_COLUMNS: Array<{
  key: Exclude<TaskStatus, "inbox">;
  label: string;
  badgeColor: string;
  badgeBg: string;
}> = [
  {
    key: "planning",
    label: "Planning",
    badgeColor: "text-[#00a6f4]",
    badgeBg: "bg-[rgba(0,166,244,0.1)]",
  },
  {
    key: "backlog",
    label: "Backlog",
    badgeColor: "text-white",
    badgeBg: "bg-[rgba(255,255,255,0.1)]",
  },
  {
    key: "in-progress",
    label: "In Progress",
    badgeColor: "text-[#b558ff]",
    badgeBg: "bg-[rgba(181,88,255,0.1)]",
  },
  {
    key: "review",
    label: "Review",
    badgeColor: "text-[#f0b100]",
    badgeBg: "bg-[rgba(240,177,0,0.1)]",
  },
  {
    key: "done",
    label: "Done",
    badgeColor: "text-[#00c950]",
    badgeBg: "bg-[rgba(0,201,80,0.1)]",
  },
];

const PRIORITY_OPTIONS: Priority[] = ["low", "medium", "high"];

export default function AgentTasksPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [definitions, setDefinitions] = useState<
    Record<string, StatusDefinition>
  >({});
  const [commentsMap, setCommentsMap] = useState<Record<string, TaskComment[]>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [ownerFilter, setOwnerFilter] = useState<"all" | OwnerType>("all");
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDetail, setNewTaskDetail] = useState("");
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>("planning");
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>("medium");
  const [newTaskOwner, setNewTaskOwner] = useState("Main Agent");
  const [creatingTask, setCreatingTask] = useState(false);
  const [deletingTask, setDeletingTask] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [clock, setClock] = useState(() => Date.now());

  // Debounce ref to prevent rapid refetches
  const lastFetchRef = useRef<number>(0);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const fetchTasks = async (force = false) => {
    const now = Date.now();
    // Debounce: min 2s between fetches to prevent flickering
    if (!force && now - lastFetchRef.current < 2000) {
      return;
    }

    lastFetchRef.current = now;

    // Don't show loading state after first load to prevent flicker
    if (!hasLoadedOnce) {
      setLoading(true);
    }

    setError(null);

    try {
      const res = await fetch("/api/control-center/tasks");
      if (!res.ok) throw new Error(`Failed to fetch tasks: ${res.status}`);
      const data = await res.json();
      setTasks(Array.isArray(data?.tasks) ? data.tasks : []);
      setDefinitions(data?.statusDefinitions ?? {});
      setCommentsMap(data?.comments ?? {});
      setHasLoadedOnce(true);
    } catch (err) {
      // Keep showing cached data on error, don't reset to empty state
      console.error("Failed to fetch tasks:", err);
      if (!hasLoadedOnce) {
        setError(err instanceof Error ? err.message : "Failed to load tasks");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchTasks(true); // Force initial load

    const es = new EventSource("/api/control-center/tasks/stream");
    const onTaskChange = () => {
      void fetchTasks(false); // Debounced fetch
    };

    es.addEventListener("task-change", onTaskChange);
    es.onerror = () => {
      // Silent fail on SSE error - polling will catch up
      es.close();
    };

    const poll = setInterval(() => {
      void fetchTasks(false); // Debounced fetch
    }, 10000);

    const ticker = setInterval(() => {
      setClock(Date.now());
    }, 30000);

    return () => {
      es.removeEventListener("task-change", onTaskChange);
      es.close();
      clearInterval(poll);
      clearInterval(ticker);
    };
  }, []);

  const filteredTasks = useMemo(() => {
    const base =
      ownerFilter === "all"
        ? tasks
        : tasks.filter((task) => task.ownerType === ownerFilter);
    return [...base].sort((a, b) => {
      // 1. needsRework first (rework tasks get priority)
      const rw =
        Number(Boolean(b.needsRework)) - Number(Boolean(a.needsRework));
      if (rw !== 0) return rw;
      
      // 2. Priority (high > medium > low)
      const p = weightPriority(b.priority) - weightPriority(a.priority);
      if (p !== 0) return p;
      
      // 3. Within same priority: newest first (by updatedAt timestamp)
      const timeA = parseTaskTimestamp(a.updatedAt);
      const timeB = parseTaskTimestamp(b.updatedAt);
      return timeB - timeA; // Descending: newest first
    });
  }, [tasks, ownerFilter]);

  const grouped = useMemo(() => {
    const result: Record<TaskStatus, TaskItem[]> = {
      planning: [],
      backlog: [],
      "in-progress": [],
      review: [],
      done: [],
      inbox: [],
    };

    for (const task of filteredTasks) result[task.status].push(task);
    return result;
  }, [filteredTasks]);

  const summary = useMemo(() => {
    const total = filteredTasks.length;
    const done = grouped.done.length;
    const inProgress = grouped["in-progress"].length;
    const thisWeek =
      grouped.planning.length +
      grouped.backlog.length +
      grouped["in-progress"].length +
      grouped.review.length;
    const completion = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, inProgress, thisWeek, completion };
  }, [filteredTasks, grouped]);

  const selectedComments = selectedTask
    ? (commentsMap[selectedTask.id] ?? [])
    : [];

  const moveTask = async (taskId: string, nextStatus: TaskStatus) => {
    const prev = tasks;
    setTasks((curr) =>
      curr.map((task) =>
        task.id === taskId
          ? { ...task, status: nextStatus, updatedAt: "just now" }
          : task,
      ),
    );
    setSavingId(taskId);

    try {
      const res = await fetch("/api/control-center/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, status: nextStatus }),
      });

      if (!res.ok) {
        const fail = await res.json().catch(() => ({}));
        throw new Error(fail?.error ?? `Failed to persist: ${res.status}`);
      }

      const data = await res.json();
      setTasks((current) =>
        current.map((task) =>
          task.id === taskId
            ? { ...task, updatedAt: data.updatedAt ?? "just now" }
            : task,
        ),
      );
    } catch (err) {
      setTasks(prev);
      setError(
        err instanceof Error ? err.message : "Failed to persist task status",
      );
    } finally {
      setSavingId(null);
    }
  };

  const updatePriority = async (taskId: string, priority: Priority) => {
    const prev = tasks;
    setTasks((curr) =>
      curr.map((task) => (task.id === taskId ? { ...task, priority } : task)),
    );

    try {
      const res = await fetch("/api/control-center/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          status: tasks.find((t) => t.id === taskId)?.status ?? "planning",
          priority,
        }),
      });
      if (!res.ok) throw new Error(`Failed to update priority: ${res.status}`);
    } catch (err) {
      setTasks(prev);
      setError(
        err instanceof Error ? err.message : "Failed to update priority",
      );
    }
  };

  const createTask = async () => {
    if (!newTaskTitle.trim()) return setError("Title wajib diisi.");

    try {
      setCreatingTask(true);
      setError(null);

      const res = await fetch("/api/control-center/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          detail: newTaskDetail.trim(),
          status: newTaskStatus,
          priority: newTaskPriority,
          ownerName: newTaskOwner,
          source: "manual",
        }),
      });

      if (!res.ok) throw new Error(`Failed to create task: ${res.status}`);

      const data = await res.json();
      const createdTask = data?.task as TaskItem | undefined;
      if (createdTask) setTasks((prev) => [createdTask, ...prev]);

      setNewTaskOpen(false);
      setNewTaskTitle("");
      setNewTaskDetail("");
      setNewTaskStatus("planning");
      setNewTaskPriority("medium");
      setNewTaskOwner("Main Agent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setCreatingTask(false);
    }
  };

  const addComment = async () => {
    if (!selectedTask || !newComment.trim()) return;

    try {
      const res = await fetch("/api/control-center/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add-comment",
          taskId: selectedTask.id,
          taskStatus: selectedTask.status,
          text: newComment.trim(),
          author: "You",
          authorType: "human",
        }),
      });
      if (!res.ok) throw new Error(`Failed to add comment: ${res.status}`);
      const data = await res.json();
      const comment = data?.comment as TaskComment | undefined;
      if (comment) {
        const nextStatus =
          (data?.status as TaskStatus | undefined) ?? selectedTask.status;
        const nextNeedsRework = Boolean(data?.needsRework);
        setCommentsMap((prev) => ({
          ...prev,
          [selectedTask.id]: [comment, ...(prev[selectedTask.id] ?? [])],
        }));
        setTasks((prev) =>
          prev.map((t) =>
            t.id === selectedTask.id
              ? {
                  ...t,
                  status: nextStatus,
                  needsRework: nextNeedsRework,
                  updatedAt: comment.createdAt,
                }
              : t,
          ),
        );
        setSelectedTask((prev) =>
          prev
            ? {
                ...prev,
                status: nextStatus,
                needsRework: nextNeedsRework,
                updatedAt: comment.createdAt,
              }
            : prev,
        );
        setNewComment("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add comment");
    }
  };

  const deleteTask = async () => {
    if (!selectedTask) return;
    if (selectedTask.source !== "manual") {
      setError("Saat ini delete hanya untuk manual task.");
      return;
    }

    const confirmed = window.confirm(
      "Hapus task ini dari Kanban? Task akan hilang dari antrian cron juga.",
    );
    if (!confirmed) return;

    try {
      setDeletingTask(true);
      const res = await fetch("/api/control-center/tasks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: selectedTask.id }),
      });

      if (!res.ok) {
        const fail = await res.json().catch(() => ({}));
        throw new Error(fail?.error ?? `Failed to delete task: ${res.status}`);
      }

      setTasks((prev) => prev.filter((t) => t.id !== selectedTask.id));
      setCommentsMap((prev) => {
        const next = { ...prev };
        delete next[selectedTask.id];
        return next;
      });
      setSelectedTask(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete task");
    } finally {
      setDeletingTask(false);
    }
  };

  return (
    <main className="flex h-full w-full flex-col gap-[10px] overflow-hidden p-6">
      <div className="flex flex-col gap-1 mb-2">
        <h1 className="text-2xl font-manrope font-medium text-white">
          Agent Tasks
        </h1>
        <p className="text-white/50 font-ibm-plex-mono text-sm uppercase tracking-widest">
          Manajemen antrian task untuk Agent
        </p>
      </div>
      <div className="flex w-full shrink-0 flex-col items-start overflow-hidden rounded-[14px] border border-white/10 bg-[#151618] p-1">
        <div className="flex w-full shrink-0 items-center justify-between px-4 py-[10px]">
          <h1 className="font-manrope text-base font-normal capitalize text-white">
            Tasks Status
          </h1>
          <div className="flex shrink-0 items-center gap-[10px]">
            <div className="relative">
              <select
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value as any)}
                className="h-10 w-[150px] appearance-none rounded-lg border border-white/10 bg-[#111214] pl-3 pr-8 font-manrope text-sm text-white outline-none"
              >
                <option value="all">All Agents</option>
                <option value="main-agent">Main Agent</option>
                <option value="sub-agent">Sub-Agent</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-white">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
            </div>
            <button
              onClick={() => setNewTaskOpen(true)}
              className="flex h-10 shrink-0 items-center justify-center rounded-lg bg-[rgba(0,166,244,0.1)] px-3 font-manrope text-sm text-[#00a6f4] transition duration-200 hover:bg-[rgba(0,166,244,0.2)]"
            >
              New Tasks
            </button>
            <button
              onClick={() => void fetchTasks()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-[#111214] text-white/70 transition duration-200 hover:bg-white/5"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                <path d="M16 21v-5h5" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-wrap items-center gap-6 rounded-[10px] bg-[#111214] p-4 text-white lg:flex-nowrap lg:gap-[25px]">
          <div className="flex min-w-[120px] flex-col justify-center whitespace-nowrap lg:flex-1">
            <p className="font-manrope text-[10px] text-white/50">
              Active Queue
            </p>
            <p className="font-ibm-plex-mono text-[26px] text-[#00c950]">
              {String(summary.thisWeek).padStart(2, "0")}
            </p>
          </div>
          <div className="hidden h-14 w-px bg-white/10 lg:block" />
          <div className="flex min-w-[120px] flex-col justify-center whitespace-nowrap lg:flex-1">
            <p className="font-manrope text-[10px] text-white/50">
              In Progress
            </p>
            <p className="font-ibm-plex-mono text-[26px] text-[#00a6f4]">
              {String(summary.inProgress).padStart(2, "0")}
            </p>
          </div>
          <div className="hidden h-14 w-px bg-white/10 lg:block" />
          <div className="flex min-w-[120px] flex-col justify-center whitespace-nowrap lg:flex-1">
            <p className="font-manrope text-[10px] text-white/50">
              Total Tasks
            </p>
            <p className="font-ibm-plex-mono text-[26px] text-white">
              {String(summary.total).padStart(2, "0")}
            </p>
          </div>
          <div className="hidden h-14 w-px bg-white/10 lg:block" />
          <div className="flex min-w-[120px] flex-col justify-center whitespace-nowrap lg:flex-1">
            <p className="font-manrope text-[10px] text-white/50">
              Completion Tasks
            </p>
            <p className="font-ibm-plex-mono text-[26px] text-[#00c950]">
              {summary.completion}%
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-[14px] border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="grid min-h-0 flex-1 w-full grid-cols-1 gap-[10px] md:grid-cols-2 xl:grid-cols-5">
        {MAIN_COLUMNS.map((column) => (
          <section
            key={column.key}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (!draggingTaskId) return;
              void moveTask(draggingTaskId, column.key);
              setDraggingTaskId(null);
            }}
            className="flex h-full flex-col overflow-hidden rounded-[14px] border border-white/10 bg-[#151618] p-1"
          >
            <div className="flex w-full shrink-0 items-center justify-between p-4">
              <h2 className="font-manrope text-base font-normal capitalize text-white">
                {column.label}
              </h2>
              <div
                className={`flex h-4 items-center justify-center rounded-[20px] px-1.5 ${column.badgeBg}`}
              >
                <span
                  className={`font-ibm-plex-mono text-[10px] uppercase leading-none ${column.badgeColor}`}
                >
                  {String(grouped[column.key].length).padStart(2, "0")}
                </span>
              </div>
            </div>

            <div className="hide-scrollbar flex w-full flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden rounded-[10px] bg-[#111214] p-1">
              {grouped[column.key].length === 0 ? (
                <div className="flex w-full shrink-0 items-center justify-center py-3">
                  <p className="font-ibm-plex-mono text-[10px] uppercase text-white/50">
                    {loading && !hasLoadedOnce
                      ? "Loading tasks..."
                      : "No tasks"}
                  </p>
                </div>
              ) : (
                grouped[column.key].map((task) => {
                  let bgBorderCls = "bg-[#151618] border-transparent";
                  if (task.priority === "high") {
                    bgBorderCls =
                      "bg-[rgba(251,44,54,0.05)] border-[rgba(251,44,54,0.15)]";
                  } else if (task.priority === "medium") {
                    bgBorderCls =
                      "bg-[rgba(240,177,0,0.05)] border-[rgba(240,177,0,0.15)]";
                  } else if (task.priority === "low") {
                    bgBorderCls =
                      "bg-[rgba(0,201,80,0.05)] border-[rgba(0,201,80,0.15)]";
                  }

                  return (
                    <article
                      key={task.id}
                      draggable
                      onClick={() => setSelectedTask(task)}
                      onDragStart={() => setDraggingTaskId(task.id)}
                      onDragEnd={() => setDraggingTaskId(null)}
                      className={`flex w-full cursor-grab active:cursor-grabbing flex-col gap-1 items-start justify-center rounded-lg border p-3 transition duration-200 hover:brightness-110 ${bgBorderCls}`}
                    >
                      <div className="flex w-full shrink-0 items-center justify-between">
                        <div className="flex items-center gap-1 font-ibm-plex-mono text-[10px] uppercase text-white/50">
                          <span>{task.ownerName}</span>
                          <span>·</span>
                          <span>
                            {savingId === task.id
                              ? "saving"
                              : formatTaskTimestamp(task.updatedAt, clock)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {task.needsRework && <ReworkBadge />}
                          <PriorityBadge priority={task.priority} />
                        </div>
                      </div>
                      <p className="line-clamp-2 w-full shrink-0 overflow-hidden text-ellipsis font-manrope text-sm font-normal text-white">
                        {task.title}
                      </p>
                      <p className="w-full shrink-0 overflow-hidden text-ellipsis font-manrope text-[10px] font-normal text-white/50 line-clamp-2">
                        {task.detail?.replace(/\n+/g, " ") || "No detail"}
                      </p>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        ))}
      </div>

      {newTaskOpen && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-[10px] p-6 backdrop-blur-[5px]">
          <button
            className="absolute inset-0 bg-black/50"
            aria-label="close"
            onClick={() => setNewTaskOpen(false)}
          />
          <div className="relative w-full max-w-[720px] shrink-0 overflow-clip rounded-[14px] border border-white/10 bg-[#151618] p-1">
            <div className="flex items-center p-3">
              <p className="font-manrope text-base text-white">
                Create New Task
              </p>
            </div>
            <div className="flex flex-col gap-[10px] rounded-[10px] bg-[#111214] p-3">
              <div className="flex flex-col gap-1">
                <label className="font-manrope text-sm text-white">
                  Task Title
                </label>
                <input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g. Sub-Agent : Implement handoff format"
                  className="h-10 w-full rounded-lg bg-[#151618] px-4 font-manrope text-sm text-white outline-none placeholder:text-white/50"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-manrope text-sm text-white">
                  Description
                </label>
                <textarea
                  value={newTaskDetail}
                  onChange={(e) => setNewTaskDetail(e.target.value)}
                  rows={3}
                  placeholder="Describe task..."
                  className="h-[104px] w-full resize-none rounded-lg bg-[#151618] px-4 py-4 font-manrope text-sm text-white outline-none placeholder:text-white/50"
                />
              </div>
              <div className="flex gap-[10px]">
                <div className="flex flex-1 flex-col gap-1">
                  <label className="font-manrope text-sm text-white">
                    Type
                  </label>
                  <div className="relative">
                    <select
                      value={newTaskStatus}
                      onChange={(e) =>
                        setNewTaskStatus(e.target.value as TaskStatus)
                      }
                      className="h-10 w-full appearance-none rounded-lg bg-[#151618] px-4 pr-10 font-manrope text-sm text-white outline-none"
                    >
                      <option className="bg-[#151618]" value="planning">Planning</option>
                      <option className="bg-[#151618]" value="backlog">Backlog</option>
                      <option className="bg-[#151618]" value="in-progress">In Progress</option>
                      <option className="bg-[#151618]" value="review">Review</option>
                      <option className="bg-[#151618]" value="done">Done</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-white/50">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <label className="font-manrope text-sm text-white">
                    Priority
                  </label>
                  <div className="relative">
                    <select
                      value={newTaskPriority}
                      onChange={(e) =>
                        setNewTaskPriority(e.target.value as Priority)
                      }
                      className="h-10 w-full appearance-none rounded-lg bg-[#151618] px-4 pr-10 font-manrope text-sm text-white outline-none"
                    >
                      {PRIORITY_OPTIONS.map((p) => (
                        <option key={p} className="bg-[#151618]" value={p}>
                          {p.charAt(0).toUpperCase() + p.slice(1)}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-white/50">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <label className="font-manrope text-sm text-white">
                    Agent
                  </label>
                  <div className="relative">
                    <select
                      value={newTaskOwner}
                      onChange={(e) => setNewTaskOwner(e.target.value)}
                      className="h-10 w-full appearance-none rounded-lg bg-[#151618] px-4 pr-10 font-manrope text-sm text-white outline-none"
                    >
                      <option className="bg-[#151618]" value="Main Agent">Main Agent</option>
                      <option className="bg-[#151618]" value="Sub-Agent">Sub-Agent</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-white/50">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="relative flex w-full max-w-[720px] shrink-0 gap-1 rounded-[14px] border border-white/10 bg-[#151618] p-1">
            <button
              onClick={() => setNewTaskOpen(false)}
              className="flex h-[43px] flex-1 items-center justify-center rounded-[10px] bg-[#111214] font-manrope text-sm text-white transition duration-200 hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              onClick={() => void createTask()}
              disabled={creatingTask}
              className="flex h-[43px] flex-1 items-center justify-center rounded-[10px] bg-[rgba(181,88,255,0.1)] font-manrope text-sm text-[#b558ff] transition duration-200 hover:bg-[rgba(181,88,255,0.2)] disabled:opacity-60"
            >
              {creatingTask ? "Creating..." : "Create Task"}
            </button>
          </div>
        </div>
      )}

      {selectedTask && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            className="absolute inset-0 bg-black/50 backdrop-blur-[5px]"
            aria-label="close"
            onClick={() => setSelectedTask(null)}
          />
          <div className="relative flex h-full w-full max-w-[780px] flex-col items-end gap-[10px] overflow-y-auto p-6">
            {/* Header Card */}
            <div className="w-full shrink-0 overflow-clip rounded-[14px] border border-white/10 bg-[#151618] p-1">
              <div className="flex items-center gap-1 p-3">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="font-ibm-plex-mono text-sm uppercase text-white/70">
                    Task Detail
                  </p>
                  <h3 className="font-manrope text-xl font-medium text-white">
                    {selectedTask.title}
                  </h3>
                </div>
                {selectedTask.source === "manual" && (
                  <button
                    className="flex h-10 shrink-0 items-center justify-center rounded-lg bg-[rgba(251,44,54,0.1)] px-3 text-[#fb2c36] transition duration-200 hover:bg-[rgba(251,44,54,0.2)] disabled:opacity-60"
                    onClick={() => void deleteTask()}
                    disabled={deletingTask}
                    title={deletingTask ? "Deleting..." : "Delete task"}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" />
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-[25px] rounded-[10px] bg-[#111214] p-4">
                <div className="flex flex-1 flex-col justify-center whitespace-nowrap">
                  <p className="font-manrope text-xs text-white/50">Owner</p>
                  <p className="font-ibm-plex-mono text-[26px] text-[#00c950]">
                    {selectedTask.ownerName}
                  </p>
                </div>
                <div className="h-14 w-px bg-white/10" />
                <div className="flex flex-1 flex-col justify-center whitespace-nowrap">
                  <p className="font-manrope text-xs text-white/50">Status</p>
                  <p className="font-ibm-plex-mono text-[26px] capitalize text-white">
                    {selectedTask.status}
                    {selectedTask.needsRework && (
                      <span className="ml-2 align-middle text-xs text-[#fb2c36]">REWORK</span>
                    )}
                  </p>
                </div>
                <div className="h-14 w-px bg-white/10" />
                <div className="flex flex-1 flex-col justify-center whitespace-nowrap">
                  <p className="font-manrope text-xs text-white/50">Priority</p>
                  <button
                    onClick={() => {
                      const priorities: Priority[] = ["low", "medium", "high"];
                      const idx = priorities.indexOf(selectedTask.priority);
                      const next = priorities[(idx + 1) % 3];
                      void updatePriority(selectedTask.id, next);
                      setSelectedTask((prev) =>
                        prev ? { ...prev, priority: next } : prev,
                      );
                    }}
                    className={`text-left font-ibm-plex-mono text-[26px] capitalize transition hover:opacity-80 ${
                      selectedTask.priority === "high"
                        ? "text-[#fb2c36]"
                        : selectedTask.priority === "medium"
                          ? "text-[#f0b100]"
                          : "text-[#00c950]"
                    }`}
                  >
                    {selectedTask.priority}
                  </button>
                </div>
              </div>
            </div>

            {/* Details Card */}
            <div className="w-full shrink-0 overflow-clip rounded-[14px] border border-white/10 bg-[#151618] p-1">
              <div className="flex items-center p-3">
                <p className="font-manrope text-base text-white">Details</p>
              </div>
              <div className="rounded-[10px] bg-[#111214] p-3">
                <div className="font-manrope text-sm leading-relaxed text-white/50 space-y-2">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                    h1: ({node, ...props}) => <h1 className="text-2xl font-semibold text-white mt-6 mb-4" {...props} />,
                    h2: ({node, ...props}) => <h2 className="text-xl font-semibold text-white mt-5 mb-3" {...props} />,
                    h3: ({node, ...props}) => <h3 className="text-base font-semibold text-white mt-4 mb-2" {...props} />,
                    strong: ({node, ...props}) => <strong className="text-white font-semibold" {...props} />,
                    code: ({node, ...props}) => <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs font-mono text-white" {...props} />,
                    pre: ({node, ...props}) => <pre className="bg-black/30 p-3 rounded-lg overflow-x-auto my-3" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc list-outside ml-5 my-2" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal list-outside ml-5 my-2" {...props} />,
                    li: ({node, ...props}) => <li className="my-1" {...props} />,
                    blockquote: ({node, ...props}) => <blockquote className="border-l-3 border-white/10 pl-3 my-3 text-white/70" {...props} />,
                    hr: ({node, ...props}) => <hr className="border-t border-white/10 my-4" {...props} />,
                    a: ({node, ...props}) => <a className="text-blue-400 underline" {...props} />,
                    table: ({node, ...props}) => <table className="border-collapse w-full my-3" {...props} />,
                    th: ({node, ...props}) => <th className="border border-white/10 px-3 py-2 text-left font-semibold text-white bg-white/5" {...props} />,
                    td: ({node, ...props}) => <td className="border border-white/10 px-3 py-2 text-left" {...props} />,
                  }}>
                    {selectedTask.detail ?? "No detail"}
                  </ReactMarkdown>
                </div>
              </div>
            </div>

            {/* Review Thread / History Card */}
            <div className="flex w-full min-h-[200px] flex-1 flex-col overflow-clip rounded-[14px] border border-white/10 bg-[#151618] p-1">
              <div className="flex shrink-0 items-center p-3">
                <p className="font-manrope text-base text-white">
                  Review Thread / History
                </p>
              </div>
              <div className="flex flex-1 flex-col gap-[10px] overflow-y-auto rounded-[10px] bg-[#111214] p-3">
                {selectedComments.length === 0 ? (
                  <p className="font-ibm-plex-mono text-xs text-white/50">
                    No comments yet.
                  </p>
                ) : (
                  selectedComments.map((comment) => (
                    <div
                      key={comment.id}
                      className="flex shrink-0 items-start gap-[10px]"
                    >
                      <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-lg bg-white/10 font-ibm-plex-mono text-lg text-white/50">
                        {comment.author.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <div className="flex items-center gap-[2px] overflow-hidden whitespace-nowrap font-ibm-plex-mono">
                          <span className="text-sm text-white">
                            {comment.author}
                          </span>
                          <span className="text-sm text-white/30">·</span>
                          <span className="text-xs text-white/50">
                            {formatTaskTimestamp(comment.createdAt, clock)}
                          </span>
                          {comment.authorType !== "human" && (
                            <>
                              <span className="text-sm text-white/30">·</span>
                              <span className="text-xs text-white/50">
                                {comment.authorType}
                              </span>
                            </>
                          )}
                        </div>
                        <div className="rounded-lg border border-white/10 bg-[#151618] p-[10px]">
                          <p className="font-manrope text-sm text-white">
                            {comment.text}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Message Input Card */}
            <div className="flex w-full shrink-0 gap-1 overflow-clip rounded-[14px] border border-white/10 bg-[#151618] p-1">
              <div className="flex flex-1 items-start rounded-[10px] bg-[#111214] p-4">
                <input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void addComment();
                    }
                  }}
                  placeholder="Type your message here..."
                  className="w-full bg-transparent font-ibm-plex-mono text-sm text-white outline-none placeholder:text-white/40"
                />
              </div>
              <button
                onClick={() => void addComment()}
                className="flex w-[52px] aspect-square shrink-0 items-center justify-center self-stretch rounded-[10px] bg-[rgba(0,166,244,0.1)] text-[#00a6f4] transition duration-200 hover:bg-[rgba(0,166,244,0.2)]"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m22 2-7 20-4-9-9-4z" />
                  <path d="M22 2 11 13" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}



function parseTaskTimestamp(value: string): number {
  if (!value) return 0;
  const raw = value.trim().toLowerCase();
  
  // Handle special cases
  if (raw === "just now" || raw === "from checklist" || raw === "live") {
    return Date.now();
  }
  
  // Handle relative time: "X min ago", "X h ago", "yesterday"
  const minMatch = raw.match(/^(\d+)\s*min\s*ago$/);
  if (minMatch) {
    const mins = parseInt(minMatch[1], 10);
    return Date.now() - mins * 60_000;
  }
  
  const hourMatch = raw.match(/^(\d+)\s*h\s*ago$/);
  if (hourMatch) {
    const hours = parseInt(hourMatch[1], 10);
    return Date.now() - hours * 60 * 60_000;
  }
  
  if (raw === "yesterday") {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.getTime();
  }
  
  // Try parsing as ISO date string
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return date.getTime();
  }
  
  // Fallback: try parsing common date formats
  // e.g., "MAR 05, 2026" or "Mar 4, 2026"
  const dateMatch = raw.match(/^([a-z]{3})\s+(\d{1,2}),?\s+(\d{4})$/i);
  if (dateMatch) {
    const [, monthStr, dayStr, yearStr] = dateMatch;
    const months: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };
    const month = months[monthStr.toLowerCase()];
    const day = parseInt(dayStr, 10);
    const year = parseInt(yearStr, 10);
    if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
      return new Date(year, month, day).getTime();
    }
  }
  
  // Last resort: return 0 (will be sorted last)
  return 0;
}

function formatTaskTimestamp(value: string, nowMs: number) {
  if (!value) return "-";
  const raw = value.trim();
  if (/just now|from checklist|live/i.test(raw)) return raw;

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;

  const now = new Date(nowMs);
  const diffMs = now.getTime() - date.getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return "just now";
  if (diffMs < hour) return `${Math.floor(diffMs / minute)} min ago`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)} h ago`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "yesterday";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function weightPriority(priority: Priority) {
  return priority === "high" ? 3 : priority === "medium" ? 2 : 1;
}

function PriorityBadge({ priority }: { priority: Priority }) {
  if (priority === "high") {
    return (
      <div className="flex h-4 items-center justify-center rounded-[20px] bg-[rgba(251,44,54,0.1)] px-1.5">
        <p className="font-ibm-plex-mono text-[10px] uppercase leading-none text-[#fb2c36]">
          {priority}
        </p>
      </div>
    );
  }
  if (priority === "medium") {
    return (
      <div className="flex h-4 items-center justify-center rounded-[20px] bg-[rgba(240,177,0,0.1)] px-1.5">
        <p className="font-ibm-plex-mono text-[10px] uppercase leading-none text-[#f0b100]">
          {priority}
        </p>
      </div>
    );
  }
  return (
    <div className="flex h-4 items-center justify-center rounded-[20px] bg-[rgba(0,201,80,0.1)] px-1.5">
      <p className="font-ibm-plex-mono text-[10px] uppercase leading-none text-[#00c950]">
        {priority}
      </p>
    </div>
  );
}

function ReworkBadge() {
  return (
    <div className="flex h-4 items-center justify-center rounded-[20px] bg-[rgba(251,44,54,0.1)] px-1.5">
      <p className="font-ibm-plex-mono text-[10px] uppercase leading-none text-[#fb2c36]">
        REWORK
      </p>
    </div>
  );
}
