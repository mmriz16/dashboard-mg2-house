"use client";

import { useEffect, useMemo, useState } from "react";

type TaskStatus = "planning" | "in-progress" | "review" | "done" | "inbox";
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

const MAIN_COLUMNS: Array<{ key: Exclude<TaskStatus, "inbox">; label: string; dot: string }> = [
  { key: "planning", label: "Planning", dot: "bg-slate-300" },
  { key: "in-progress", label: "In Progress", dot: "bg-violet-400" },
  { key: "review", label: "Review", dot: "bg-amber-400" },
  { key: "done", label: "Done", dot: "bg-emerald-400" },
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
  const [newComment, setNewComment] = useState("");

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
  }, []);

  const filteredTasks = useMemo(() => {
    const base = ownerFilter === "all" ? tasks : tasks.filter((task) => task.ownerType === ownerFilter);
    return [...base].sort((a, b) => {
      const p = weightPriority(b.priority) - weightPriority(a.priority);
      if (p !== 0) return p;
      return String(b.updatedAt).localeCompare(String(a.updatedAt));
    });
  }, [tasks, ownerFilter]);

  const grouped = useMemo(() => {
    const result: Record<TaskStatus, TaskItem[]> = {
      planning: [],
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
    const thisWeek = grouped.planning.length + grouped["in-progress"].length + grouped.review.length;
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
        body: JSON.stringify({ taskId, status: nextStatus, actorId: "618580430" }),
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
        body: JSON.stringify({ taskId, status: tasks.find((t) => t.id === taskId)?.status ?? "planning", priority, actorId: "618580430" }),
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
          text: newComment.trim(),
          author: "Main Agent",
          authorType: "main-agent",
        }),
      });
      if (!res.ok) throw new Error(`Failed to add comment: ${res.status}`);
      const data = await res.json();
      const comment = data?.comment as TaskComment | undefined;
      if (comment) {
        setCommentsMap((prev) => ({ ...prev, [selectedTask.id]: [comment, ...(prev[selectedTask.id] ?? [])] }));
        setNewComment("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add comment");
    }
  };

  return (
    <main className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-manrope font-medium text-white">Tasks</h1>
        <p className="text-white/50 font-ibm-plex-mono text-sm uppercase tracking-widest">Planning → In Progress → Review → Done (Inbox sebagai log)</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <StatCard value={summary.thisWeek} label="Active Queue" color="text-emerald-300" />
        <StatCard value={summary.inProgress} label="In Progress" color="text-violet-300" />
        <StatCard value={summary.total} label="Total" color="text-white" />
        <StatCard value={`${summary.completion}%`} label="Completion" color="text-fuchsia-300" />
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-2">
        <button onClick={() => setNewTaskOpen(true)} className="rounded-lg bg-violet-500 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-400">+ New Task</button>
        <button onClick={() => setOwnerFilter("all")} className={`rounded-lg px-3 py-2 text-xs ${ownerFilter === "all" ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5"}`}>All owners</button>
        <button onClick={() => setOwnerFilter("main-agent")} className={`rounded-lg px-3 py-2 text-xs ${ownerFilter === "main-agent" ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5"}`}>Main Agent</button>
        <button onClick={() => setOwnerFilter("sub-agent")} className={`rounded-lg px-3 py-2 text-xs ${ownerFilter === "sub-agent" ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5"}`}>Sub-Agent</button>
        <button onClick={() => void fetchTasks()} className="ml-auto rounded-lg border border-white/20 px-3 py-2 text-xs text-white/80 hover:bg-white/5">Refresh</button>
      </div>

      {error && <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
        <div className="xl:col-span-9 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {MAIN_COLUMNS.map((column) => (
            <section
              key={column.key}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (!draggingTaskId) return;
                void moveTask(draggingTaskId, column.key);
                setDraggingTaskId(null);
              }}
              className="min-h-[460px] rounded-2xl border border-border bg-surface-card p-3"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><span className={`h-2 w-2 rounded-full ${column.dot}`} />{column.label}</h2>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/70">{grouped[column.key].length}</span>
              </div>

              {loading ? <p className="text-xs text-white/50">Loading tasks...</p> : grouped[column.key].length === 0 ? <p className="text-xs text-white/35">No tasks</p> : (
                <div className="space-y-2">
                  {grouped[column.key].map((task) => (
                    <article key={task.id} draggable onClick={() => setSelectedTask(task)} onDragStart={() => setDraggingTaskId(task.id)} onDragEnd={() => setDraggingTaskId(null)} className="cursor-grab rounded-xl border border-white/10 bg-white/5 p-3 active:cursor-grabbing hover:bg-white/[0.08]">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-white leading-snug line-clamp-2">{task.title}</p>
                        <PriorityBadge priority={task.priority} />
                      </div>
                      {task.detail && <p className="mt-1 text-xs text-white/45 line-clamp-2">{task.detail.replace(/\n+/g, " ")}</p>}
                      <div className="mt-2 flex items-center justify-between text-[11px] text-white/60">
                        <span>{task.ownerName}</span>
                        <span>{savingId === task.id ? "saving..." : task.updatedAt}</span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>

        <aside className="xl:col-span-3 flex flex-col gap-3">
          <section onDragOver={(event) => event.preventDefault()} onDrop={() => { if (!draggingTaskId) return; void moveTask(draggingTaskId, "inbox"); setDraggingTaskId(null); }} className="rounded-2xl border border-dashed border-sky-400/30 bg-sky-500/5 p-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-sky-200">Inbox Log</h3>
              <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-[11px] text-sky-200">{grouped.inbox.length}</span>
            </div>
            <div className="space-y-2 max-h-[260px] overflow-auto pr-1">
              {grouped.inbox.length === 0 ? <p className="text-xs text-sky-100/50">No inbox logs</p> : grouped.inbox.map((task) => (
                <button key={task.id} onClick={() => setSelectedTask(task)} className="w-full rounded-lg border border-sky-300/20 bg-sky-500/10 p-2 text-left hover:bg-sky-500/15">
                  <p className="text-xs text-sky-100 line-clamp-2">{task.title}</p>
                  <p className="mt-1 text-[10px] text-sky-100/60">{task.updatedAt}</p>
                </button>
              ))}
            </div>
          </section>
        </aside>
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
                  <option className="bg-[#121824]" value="in-progress">In Progress</option>
                  <option className="bg-[#121824]" value="review">Review</option>
                  <option className="bg-[#121824]" value="done">Done</option>
                  <option className="bg-[#121824]" value="inbox">Inbox</option>
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
              <button className="rounded-md border border-white/20 px-3 py-1 text-xs text-white/80 hover:bg-white/10" onClick={() => setSelectedTask(null)}>Close</button>
            </div>

            <div className="mt-5 space-y-3 text-sm text-white/80">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
                <p><span className="text-white/50">Owner:</span> {selectedTask.ownerName}</p>
                <p><span className="text-white/50">Source:</span> {selectedTask.source ?? "-"}</p>
                <p><span className="text-white/50">Status:</span> {selectedTask.status}</p>
                <p><span className="text-white/50">Last Update:</span> {selectedTask.updatedAt}</p>
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
                      <p className="text-[11px] text-white/60">{comment.author} • {comment.authorType} • {comment.createdAt}</p>
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

function weightPriority(priority: Priority) {
  return priority === "high" ? 3 : priority === "medium" ? 2 : 1;
}

function PriorityBadge({ priority }: { priority: Priority }) {
  const cls = priority === "high" ? "bg-red-500/20 text-red-200" : priority === "medium" ? "bg-amber-500/20 text-amber-200" : "bg-slate-500/20 text-slate-200";
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cls}`}>{priority.toUpperCase()}</span>;
}

function StatCard({ value, label, color }: { value: string | number; label: string; color: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
      <p className={`text-2xl font-semibold ${color}`}>{value}</p>
      <p className="text-xs text-white/50">{label}</p>
    </div>
  );
}
