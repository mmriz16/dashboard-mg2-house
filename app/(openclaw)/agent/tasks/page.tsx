"use client";

import { useEffect, useMemo, useState } from "react";

type TaskStatus = "planning" | "backlog" | "in-progress" | "review" | "done" | "inbox";
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

const MAIN_COLUMNS: Array<{ key: Exclude<TaskStatus, "inbox">; label: string; badgeColor: string; badgeBg: string }> = [
  { key: "planning", label: "Planning", badgeColor: "text-[#00a6f4]", badgeBg: "bg-[rgba(0,166,244,0.1)]" },
  { key: "backlog", label: "Backlog", badgeColor: "text-white", badgeBg: "bg-[rgba(255,255,255,0.1)]" },
  { key: "in-progress", label: "In Progress", badgeColor: "text-[#b558ff]", badgeBg: "bg-[rgba(181,88,255,0.1)]" },
  { key: "review", label: "Review", badgeColor: "text-[#f0b100]", badgeBg: "bg-[rgba(240,177,0,0.1)]" },
  { key: "done", label: "Done", badgeColor: "text-[#00c950]", badgeBg: "bg-[rgba(0,201,80,0.1)]" },
];

const PRIORITY_OPTIONS: Priority[] = ["low", "medium", "high"];

export default function AgentTasksPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [definitions, setDefinitions] = useState<Record<string, StatusDefinition>>({});
  const [commentsMap, setCommentsMap] = useState<Record<string, TaskComment[]>>({});
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
  const [creatingTask, setCreatingTask] = useState(false);
  const [deletingTask, setDeletingTask] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [clock, setClock] = useState(() => Date.now());

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/control-center/tasks");
      if (!res.ok) throw new Error(`Failed to fetch tasks: ${res.status}`);
      const data = await res.json();
      setTasks(Array.isArray(data?.tasks) ? data.tasks : []);
      setDefinitions(data?.statusDefinitions ?? {});
      setCommentsMap(data?.comments ?? {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchTasks();

    const es = new EventSource('/api/control-center/tasks/stream');
    const onTaskChange = () => {
      void fetchTasks();
    };

    es.addEventListener('task-change', onTaskChange);
    es.onerror = () => {
      void fetchTasks();
    };

    const poll = setInterval(() => {
      void fetchTasks();
    }, 10000);

    const ticker = setInterval(() => {
      setClock(Date.now());
    }, 30000);

    return () => {
      es.removeEventListener('task-change', onTaskChange);
      es.close();
      clearInterval(poll);
      clearInterval(ticker);
    };
  }, []);

  const filteredTasks = useMemo(() => {
    const base = ownerFilter === "all" ? tasks : tasks.filter((task) => task.ownerType === ownerFilter);
    return [...base].sort((a, b) => {
      const rw = Number(Boolean(b.needsRework)) - Number(Boolean(a.needsRework));
      if (rw !== 0) return rw;
      const p = weightPriority(b.priority) - weightPriority(a.priority);
      if (p !== 0) return p;
      return String(b.updatedAt).localeCompare(String(a.updatedAt));
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
    const thisWeek = grouped.planning.length + grouped.backlog.length + grouped["in-progress"].length + grouped.review.length;
    const completion = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, inProgress, thisWeek, completion };
  }, [filteredTasks, grouped]);

  const selectedComments = selectedTask ? commentsMap[selectedTask.id] ?? [] : [];

  const moveTask = async (taskId: string, nextStatus: TaskStatus) => {
    const prev = tasks;
    setTasks((curr) => curr.map((task) => (task.id === taskId ? { ...task, status: nextStatus, updatedAt: "just now" } : task)));
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
        current.map((task) => (task.id === taskId ? { ...task, updatedAt: data.updatedAt ?? "just now" } : task)),
      );
    } catch (err) {
      setTasks(prev);
      setError(err instanceof Error ? err.message : "Failed to persist task status");
    } finally {
      setSavingId(null);
    }
  };

  const updatePriority = async (taskId: string, priority: Priority) => {
    const prev = tasks;
    setTasks((curr) => curr.map((task) => (task.id === taskId ? { ...task, priority } : task)));

    try {
      const res = await fetch("/api/control-center/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, status: tasks.find((t) => t.id === taskId)?.status ?? "planning", priority }),
      });
      if (!res.ok) throw new Error(`Failed to update priority: ${res.status}`);
    } catch (err) {
      setTasks(prev);
      setError(err instanceof Error ? err.message : "Failed to update priority");
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
          ownerName: "Main Agent",
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
        const nextStatus = (data?.status as TaskStatus | undefined) ?? selectedTask.status;
        const nextNeedsRework = Boolean(data?.needsRework);
        setCommentsMap((prev) => ({ ...prev, [selectedTask.id]: [comment, ...(prev[selectedTask.id] ?? [])] }));
        setTasks((prev) => prev.map((t) => (t.id === selectedTask.id ? { ...t, status: nextStatus, needsRework: nextNeedsRework, updatedAt: comment.createdAt } : t)));
        setSelectedTask((prev) => (prev ? { ...prev, status: nextStatus, needsRework: nextNeedsRework, updatedAt: comment.createdAt } : prev));
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

    const confirmed = window.confirm("Hapus task ini dari Kanban? Task akan hilang dari antrian cron juga.");
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
    <main className="flex h-full w-full flex-col gap-[10px] overflow-hidden">
      <div className="flex flex-col gap-1 mb-2">
        <h1 className="text-2xl font-manrope font-medium text-white">Agent Tasks</h1>
        <p className="text-white/50 font-ibm-plex-mono text-sm uppercase tracking-widest">
          Manajemen antrian task untuk Agent
        </p>
      </div>
      <div className="flex w-full shrink-0 flex-col items-start overflow-hidden rounded-[14px] border border-white/10 bg-[#151618] p-1">
        <div className="flex w-full shrink-0 items-center justify-between px-4 py-[10px]">
          <h1 className="font-manrope text-base font-normal capitalize text-white">Tasks Status</h1>
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
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 21v-5h5" /></svg>
            </button>
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-wrap items-center gap-6 rounded-[10px] bg-[#111214] p-4 text-white lg:flex-nowrap lg:gap-[25px]">
          <div className="flex min-w-[120px] flex-col justify-center whitespace-nowrap lg:flex-1">
            <p className="font-manrope text-[10px] text-white/50">Active Queue</p>
            <p className="font-ibm-plex-mono text-[26px] text-[#00c950]">{String(summary.thisWeek).padStart(2, '0')}</p>
          </div>
          <div className="hidden h-14 w-px bg-white/10 lg:block" />
          <div className="flex min-w-[120px] flex-col justify-center whitespace-nowrap lg:flex-1">
            <p className="font-manrope text-[10px] text-white/50">In Progress</p>
            <p className="font-ibm-plex-mono text-[26px] text-[#00a6f4]">{String(summary.inProgress).padStart(2, '0')}</p>
          </div>
          <div className="hidden h-14 w-px bg-white/10 lg:block" />
          <div className="flex min-w-[120px] flex-col justify-center whitespace-nowrap lg:flex-1">
            <p className="font-manrope text-[10px] text-white/50">Total Tasks</p>
            <p className="font-ibm-plex-mono text-[26px] text-white">{String(summary.total).padStart(2, '0')}</p>
          </div>
          <div className="hidden h-14 w-px bg-white/10 lg:block" />
          <div className="flex min-w-[120px] flex-col justify-center whitespace-nowrap lg:flex-1">
            <p className="font-manrope text-[10px] text-white/50">Completion Tasks</p>
            <p className="font-ibm-plex-mono text-[26px] text-[#00c950]">{summary.completion}%</p>
          </div>
        </div>
      </div>

      {error && <div className="rounded-[14px] border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}

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
              <h2 className="font-manrope text-base font-normal capitalize text-white">{column.label}</h2>
              <div className={`flex h-4 items-center justify-center rounded-[20px] px-1.5 ${column.badgeBg}`}>
                <span className={`font-ibm-plex-mono text-[10px] uppercase leading-none ${column.badgeColor}`}>{String(grouped[column.key].length).padStart(2, '0')}</span>
              </div>
            </div>

            <div className="flex w-full flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden rounded-[10px] bg-[#111214] p-1">
              {loading ? (
                <div className="flex w-full shrink-0 items-center justify-center py-2">
                  <p className="font-ibm-plex-mono text-[10px] uppercase text-white/50">Loading tasks...</p>
                </div>
              ) : grouped[column.key].length === 0 ? (
                <div className="flex w-full shrink-0 items-center justify-center py-2">
                  <p className="font-ibm-plex-mono text-[10px] uppercase text-white/50">No tasks</p>
                </div>
              ) : (
                grouped[column.key].map((task) => {
                  let bgBorderCls = "bg-[#151618] border-transparent";
                  if (task.priority === "high") {
                    bgBorderCls = "bg-[rgba(251,44,54,0.05)] border-[rgba(251,44,54,0.15)]";
                  } else if (task.priority === "medium") {
                    bgBorderCls = "bg-[rgba(240,177,0,0.05)] border-[rgba(240,177,0,0.15)]";
                  } else if (task.priority === "low") {
                    bgBorderCls = "bg-[rgba(0,201,80,0.05)] border-[rgba(0,201,80,0.15)]";
                  }

                  return (
                    <article
                      key={task.id}
                      draggable
                      onClick={() => setSelectedTask(task)}
                      onDragStart={() => setDraggingTaskId(task.id)}
                      onDragEnd={() => setDraggingTaskId(null)}
                      className={`flex w-full cursor-grab active:cursor-grabbing flex-col gap-1 items-start justify-center rounded-lg border p-2 transition duration-200 hover:brightness-110 ${bgBorderCls}`}
                    >
                      <div className="flex w-full shrink-0 items-center justify-between">
                        <div className="flex items-center gap-1 font-ibm-plex-mono text-[10px] uppercase text-white/50">
                          <span>{task.ownerName}</span>
                          <span>·</span>
                          <span>{savingId === task.id ? "saving" : formatTaskTimestamp(task.updatedAt, clock)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {task.needsRework && <ReworkBadge />}
                          <PriorityBadge priority={task.priority} />
                        </div>
                      </div>
                      <p className="line-clamp-2 w-full shrink-0 overflow-hidden text-ellipsis font-manrope text-sm font-normal text-white">{task.title}</p>
                      <p className="w-full shrink-0 overflow-hidden text-ellipsis font-manrope text-[10px] font-normal text-white/50 line-clamp-2">{task.detail?.replace(/\n+/g, " ") || "No detail"}</p>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        ))}
      </div>

      {newTaskOpen && (
        <div className="fixed inset-0 z-50">
          <button className="absolute inset-0 bg-black/55" aria-label="close" onClick={() => setNewTaskOpen(false)} />
          <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-[#0b0f17] p-4 shadow-2xl">
            <h3 className="text-lg font-semibold text-white">Create New Task</h3>
            <div className="mt-4 space-y-3">
              <input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Task title" className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none" />
              <textarea value={newTaskDetail} onChange={(e) => setNewTaskDetail(e.target.value)} rows={4} placeholder="Detail / acceptance criteria" className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none" />
              <div className="grid grid-cols-2 gap-2">
                <select value={newTaskStatus} onChange={(e) => setNewTaskStatus(e.target.value as TaskStatus)} className="w-full rounded-lg border border-white/15 bg-transparent px-3 py-2 text-sm text-white outline-none">
                  <option className="bg-[#121824]" value="planning">Planning</option>
                  <option className="bg-[#121824]" value="backlog">Backlog</option>
                  <option className="bg-[#121824]" value="in-progress">In Progress</option>
                  <option className="bg-[#121824]" value="review">Review</option>
                  <option className="bg-[#121824]" value="done">Done</option>
                </select>
                <select value={newTaskPriority} onChange={(e) => setNewTaskPriority(e.target.value as Priority)} className="w-full rounded-lg border border-white/15 bg-transparent px-3 py-2 text-sm text-white outline-none">
                  {PRIORITY_OPTIONS.map((p) => <option key={p} className="bg-[#121824]" value={p}>{p.toUpperCase()}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setNewTaskOpen(false)} className="rounded-lg border border-white/15 px-3 py-2 text-xs text-white/80 hover:bg-white/5">Cancel</button>
              <button onClick={() => void createTask()} disabled={creatingTask} className="rounded-lg bg-violet-500 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-400 disabled:opacity-60">{creatingTask ? "Creating..." : "Create Task"}</button>
            </div>
          </div>
        </div>
      )}

      {selectedTask && (
        <div className="fixed inset-0 z-50">
          <button className="absolute inset-0 bg-black/45" aria-label="close" onClick={() => setSelectedTask(null)} />
          <aside className="absolute right-0 top-0 h-full w-full max-w-[50vw] min-w-[420px] border-l border-white/10 bg-[#0b0f17] p-5 shadow-2xl overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-white/50">Task Detail</p>
                <h3 className="mt-1 text-xl font-semibold text-white">{selectedTask.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                {selectedTask.source === "manual" && (
                  <button
                    className="rounded-md border border-red-300/40 px-3 py-1 text-xs text-red-200 hover:bg-red-500/15 disabled:opacity-60"
                    onClick={() => void deleteTask()}
                    disabled={deletingTask}
                  >
                    {deletingTask ? "Deleting..." : "Delete"}
                  </button>
                )}
                <button className="rounded-md border border-white/20 px-3 py-1 text-xs text-white/80 hover:bg-white/10" onClick={() => setSelectedTask(null)}>Close</button>
              </div>
            </div>

            <div className="mt-5 space-y-3 text-sm text-white/80">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
                <p><span className="text-white/50">Owner:</span> {selectedTask.ownerName}</p>
                <p><span className="text-white/50">Source:</span> {selectedTask.source ?? "-"}</p>
                <p><span className="text-white/50">Status:</span> {selectedTask.status}</p>
                {selectedTask.needsRework && <p><span className="text-white/50">Flag:</span> <span className="text-rose-300">Needs rework</span></p>}
                <p><span className="text-white/50">Last Update:</span> {formatTaskTimestamp(selectedTask.updatedAt, clock)}</p>
                <div className="flex items-center gap-2">
                  <span className="text-white/50">Priority:</span>
                  <select value={selectedTask.priority} onChange={(e) => void updatePriority(selectedTask.id, e.target.value as Priority)} className="rounded-md border border-white/20 bg-transparent px-2 py-1 text-xs text-white">
                    {PRIORITY_OPTIONS.map((p) => <option key={p} value={p} className="bg-[#121824]">{p.toUpperCase()}</option>)}
                  </select>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-xs uppercase tracking-wider text-white/50">Detail</p>
                <pre className="mt-2 whitespace-pre-wrap font-mono text-xs text-white/80">{selectedTask.detail ?? "No detail"}</pre>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-xs uppercase tracking-wider text-white/50">Review Thread / History</p>
                <div className="mt-2 space-y-2 max-h-[280px] overflow-auto pr-1">
                  {selectedComments.length === 0 ? <p className="text-xs text-white/50">Belum ada komentar.</p> : selectedComments.map((comment) => (
                    <div key={comment.id} className="rounded-lg border border-white/10 bg-white/5 p-2">
                      <p className="text-[11px] text-white/60">{comment.author} • {comment.authorType} • {formatTaskTimestamp(comment.createdAt, clock)}</p>
                      <p className="mt-1 text-xs text-white/85">{comment.text}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <input value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Tambah komentar review..." className="flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-white outline-none" />
                  <button onClick={() => void addComment()} className="rounded-lg bg-violet-500 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-400">Kirim</button>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-white/60">{definitions[selectedTask.status]?.description ?? "-"}</p>
              </div>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
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

  return date.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

function weightPriority(priority: Priority) {
  return priority === "high" ? 3 : priority === "medium" ? 2 : 1;
}

function PriorityBadge({ priority }: { priority: Priority }) {
  if (priority === "high") {
    return (
      <div className="flex h-4 items-center justify-center rounded-[20px] bg-[rgba(251,44,54,0.1)] px-1.5">
        <p className="font-ibm-plex-mono text-[10px] uppercase leading-none text-[#fb2c36]">{priority}</p>
      </div>
    );
  }
  if (priority === "medium") {
    return (
      <div className="flex h-4 items-center justify-center rounded-[20px] bg-[rgba(240,177,0,0.1)] px-1.5">
        <p className="font-ibm-plex-mono text-[10px] uppercase leading-none text-[#f0b100]">{priority}</p>
      </div>
    );
  }
  return (
    <div className="flex h-4 items-center justify-center rounded-[20px] bg-[rgba(0,201,80,0.1)] px-1.5">
      <p className="font-ibm-plex-mono text-[10px] uppercase leading-none text-[#00c950]">{priority}</p>
    </div>
  );
}

function ReworkBadge() {
  return (
    <div className="flex h-4 items-center justify-center rounded-[20px] bg-[rgba(251,44,54,0.1)] px-1.5">
      <p className="font-ibm-plex-mono text-[10px] uppercase leading-none text-[#fb2c36]">REWORK</p>
    </div>
  );
}
