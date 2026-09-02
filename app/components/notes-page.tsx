"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  PlusIcon,
  RupeeIcon,
  XIcon,
} from "./icons";
import { NoteCard } from "./note-card";
import { FinanceCard, cycleFinanceType } from "./finance-card";
import { TaskItem } from "./task-item";
import { NoteFormSheet } from "./note-form-sheet";
import { FinanceFormSheet } from "./finance-form-sheet";
import { CreateTaskSheet } from "./create-task-sheet";
import { categoryOrder } from "./category-colors";
import type {
  FinanceLog,
  FinanceType,
  InboxEntry,
  NoteCategory,
  Task,
} from "@/lib/types";

const PAGE_SIZE = 3;

function cycleCategory(current?: NoteCategory | null): NoteCategory | null {
  if (!current) return categoryOrder[0];
  const idx = categoryOrder.indexOf(current);
  return idx < categoryOrder.length - 1 ? categoryOrder[idx + 1] : null;
}

export function NotesPage() {
  const [mode, setMode] = useState<"notes" | "finance">("notes");

  const [notes, setNotes] = useState<InboxEntry[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [notesError, setNotesError] = useState<string | null>(null);

  const [financeLogs, setFinanceLogs] = useState<FinanceLog[]>([]);
  const [loadingFinance, setLoadingFinance] = useState(true);
  const [financeError, setFinanceError] = useState<string | null>(null);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [tasksError, setTasksError] = useState<string | null>(null);

  const [isNoteCreateOpen, setIsNoteCreateOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<InboxEntry | null>(null);
  const [isFinanceCreateOpen, setIsFinanceCreateOpen] = useState(false);
  const [editingFinance, setEditingFinance] = useState<FinanceLog | null>(null);
  const [isTaskSheetOpen, setIsTaskSheetOpen] = useState(false);
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [isSubmittingFinance, setIsSubmittingFinance] = useState(false);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [confirmDeleteNoteId, setConfirmDeleteNoteId] = useState<string | null>(
    null
  );
  const [deletingFinanceId, setDeletingFinanceId] = useState<string | null>(
    null
  );
  const [confirmDeleteFinanceId, setConfirmDeleteFinanceId] = useState<
    string | null
  >(null);
  const [togglingTaskId, setTogglingTaskId] = useState<string | null>(null);

  const [offset, setOffset] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);

  const confirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchNotes = useCallback(async () => {
    setLoadingNotes(true);
    setNotesError(null);
    try {
      const res = await fetch("/api/inbox?limit=50");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load notes");
      setNotes(data.entries || []);
    } catch (err) {
      setNotesError(
        err instanceof Error ? err.message : "Failed to load notes"
      );
    } finally {
      setLoadingNotes(false);
    }
  }, []);

  const fetchFinance = useCallback(async () => {
    setLoadingFinance(true);
    setFinanceError(null);
    try {
      const res = await fetch("/api/finance?limit=50");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load finance logs");
      setFinanceLogs(data.logs || []);
    } catch (err) {
      setFinanceError(
        err instanceof Error ? err.message : "Failed to load finance logs"
      );
    } finally {
      setLoadingFinance(false);
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    setLoadingTasks(true);
    setTasksError(null);
    try {
      const res = await fetch("/api/tasks?limit=50");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load tasks");
      setTasks(data.tasks || []);
    } catch (err) {
      setTasksError(
        err instanceof Error ? err.message : "Failed to load tasks"
      );
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchNotes();
    fetchFinance();
    fetchTasks();
  }, [fetchNotes, fetchFinance, fetchTasks]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOffset(0);
  }, [mode]);

  const handleNoteCreateSubmit = async (form: {
    title: string;
    content: string;
    category: NoteCategory | null;
  }) => {
    setActionError(null);
    setIsSubmittingNote(true);
    try {
      const res = await fetch("/api/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create note");
      setNotes((prev) => [data.entry, ...prev]);
      setIsNoteCreateOpen(false);
      setOffset(0);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to create note"
      );
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleNoteEditSubmit = async (form: {
    title: string;
    content: string;
    category: NoteCategory | null;
  }) => {
    if (!editingNote) return;
    setActionError(null);
    setIsSubmittingNote(true);
    try {
      const res = await fetch(
        `/api/inbox/${encodeURIComponent(editingNote.id)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update note");
      setNotes((prev) =>
        prev.map((n) => (n.id === data.entry.id ? data.entry : n))
      );
      setEditingNote(null);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to update note"
      );
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleNoteDelete = async (entry: InboxEntry) => {
    setActionError(null);
    if (confirmDeleteNoteId !== entry.id) {
      setConfirmDeleteNoteId(entry.id);
      if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
      confirmTimeoutRef.current = setTimeout(
        () => setConfirmDeleteNoteId(null),
        3000
      );
      return;
    }

    if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
    setConfirmDeleteNoteId(null);
    setDeletingNoteId(entry.id);
    try {
      const res = await fetch(`/api/inbox/${encodeURIComponent(entry.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete note");
      setNotes((prev) => prev.filter((n) => n.id !== entry.id));
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to delete note"
      );
    } finally {
      setDeletingNoteId(null);
    }
  };

  const handleCycleCategory = async (entry: InboxEntry) => {
    setActionError(null);
    const next = cycleCategory(entry.category);
    try {
      const res = await fetch(`/api/inbox/${encodeURIComponent(entry.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update category");
      setNotes((prev) =>
        prev.map((n) => (n.id === data.entry.id ? data.entry : n))
      );
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to update category"
      );
    }
  };

  const handleFinanceCreateSubmit = async (form: {
    amount: string;
    note: string;
    type: FinanceType;
  }) => {
    setActionError(null);
    setIsSubmittingFinance(true);
    try {
      const res = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create log");
      setFinanceLogs((prev) => [data.log, ...prev]);
      setIsFinanceCreateOpen(false);
      setOffset(0);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to create log"
      );
    } finally {
      setIsSubmittingFinance(false);
    }
  };

  const handleFinanceEditSubmit = async (form: {
    amount: string;
    note: string;
    type: FinanceType;
  }) => {
    if (!editingFinance) return;
    setActionError(null);
    setIsSubmittingFinance(true);
    try {
      const res = await fetch(
        `/api/finance/${encodeURIComponent(editingFinance.id)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update log");
      setFinanceLogs((prev) =>
        prev.map((l) => (l.id === data.log.id ? data.log : l))
      );
      setEditingFinance(null);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to update log"
      );
    } finally {
      setIsSubmittingFinance(false);
    }
  };

  const handleFinanceDelete = async (log: FinanceLog) => {
    setActionError(null);
    if (confirmDeleteFinanceId !== log.id) {
      setConfirmDeleteFinanceId(log.id);
      if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
      confirmTimeoutRef.current = setTimeout(
        () => setConfirmDeleteFinanceId(null),
        3000
      );
      return;
    }

    if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
    setConfirmDeleteFinanceId(null);
    setDeletingFinanceId(log.id);
    try {
      const res = await fetch(`/api/finance/${encodeURIComponent(log.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete log");
      setFinanceLogs((prev) => prev.filter((l) => l.id !== log.id));
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to delete log"
      );
    } finally {
      setDeletingFinanceId(null);
    }
  };

  const handleToggleFinanceType = async (log: FinanceLog) => {
    setActionError(null);
    const next = cycleFinanceType(log.type);
    try {
      const res = await fetch(`/api/finance/${encodeURIComponent(log.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update log type");
      setFinanceLogs((prev) =>
        prev.map((l) => (l.id === data.log.id ? data.log : l))
      );
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to update log type"
      );
    }
  };

  const handleToggleTask = async (task: Task) => {
    setActionError(null);
    setTogglingTaskId(task.id);
    const nextStatus = task.status === "completed" ? "pending" : "completed";
    try {
      const res = await fetch(`/api/tasks/${encodeURIComponent(task.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update task");
      setTasks((prev) =>
        prev.map((t) => (t.id === data.task.id ? data.task : t))
      );
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to update task"
      );
    } finally {
      setTogglingTaskId(null);
    }
  };

  const handleCreateTask = async (form: { title: string; details: string }) => {
    setActionError(null);
    setIsSubmittingTask(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add task");
      setTasks((prev) => [data.task, ...prev]);
      setIsTaskSheetOpen(false);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to add task"
      );
    } finally {
      setIsSubmittingTask(false);
    }
  };

  const isNotesMode = mode === "notes";

  const canGoUp = isNotesMode
    ? offset + PAGE_SIZE < notes.length
    : offset + PAGE_SIZE < financeLogs.length;
  const canGoDown = offset > 0;

  const noteStack = isNotesMode
    ? [...notes.slice(offset, offset + PAGE_SIZE)].reverse()
    : [];
  const financeStack = !isNotesMode
    ? [...financeLogs.slice(offset, offset + PAGE_SIZE)].reverse()
    : [];

  const loadingItems = isNotesMode ? loadingNotes : loadingFinance;
  const itemsError = isNotesMode ? notesError : financeError;

  return (
    <div className="flex h-dvh flex-col overflow-hidden px-4 pt-safe-top sm:px-6">
      <header className="flex shrink-0 items-center justify-between py-5">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white">
            {isNotesMode ? "Notes" : "Finance"}
          </h1>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setOffset((o) => (canGoUp ? o + 1 : o))}
              disabled={!canGoUp}
              className="flex h-7 w-7 items-center justify-center rounded-full text-cream transition hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-cream"
              aria-label="Previous"
              title="Previous"
            >
              <ChevronUpIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setOffset((o) => (canGoDown ? o - 1 : o))}
              disabled={!canGoDown}
              className="flex h-7 w-7 items-center justify-center rounded-full text-cream transition hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-cream"
              aria-label="Next"
              title="Next"
            >
              <ChevronDownIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMode((m) => (m === "notes" ? "finance" : "notes"))}
            className={`flex h-11 w-11 items-center justify-center rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
              isNotesMode
                ? "bg-cream text-black hover:bg-white"
                : "bg-green text-black hover:bg-white"
            }`}
            aria-label="Toggle finance"
            title="Toggle finance"
          >
            <RupeeIcon className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() =>
              isNotesMode ? setIsNoteCreateOpen(true) : setIsFinanceCreateOpen(true)
            }
            className="flex h-11 w-11 items-center justify-center rounded-full bg-cream text-black transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            aria-label={isNotesMode ? "Create note" : "Create log"}
            title={isNotesMode ? "Create note" : "Create log"}
          >
            <PlusIcon className="h-5 w-5" />
          </button>
        </div>
      </header>

      {actionError && (
        <div
          role="alert"
          className="mb-3 flex shrink-0 items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700"
        >
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-rose-600 hover:bg-rose-100"
            aria-label="Dismiss error"
          >
            <XIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <section className="relative flex shrink-0 flex-col justify-end overflow-hidden pb-4">
        {itemsError ? (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          >
            <div>
              <p className="font-medium">Couldn&apos;t load {isNotesMode ? "notes" : "logs"}</p>
              <p className="mt-0.5 text-rose-600">{itemsError}</p>
            </div>
            <button
              type="button"
              onClick={() =>
                isNotesMode ? setNotesError(null) : setFinanceError(null)
              }
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-rose-600 hover:bg-rose-100"
              aria-label="Dismiss error"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : loadingItems ? (
          <div className="flex flex-col justify-end space-y-[-3.5rem]">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-[120px] animate-pulse rounded-[2rem] bg-white/10"
                style={{ zIndex: 30 - i * 10 }}
              />
            ))}
          </div>
        ) : isNotesMode ? (
          noteStack.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-cream/20 bg-white/5 px-6 py-12 text-center">
              <p className="text-cream/60">No notes yet.</p>
              <p className="mt-1 text-sm text-cream/50">
                Tap + to capture a thought.
              </p>
            </div>
          ) : (
            noteStack.map((entry, index) => {
              const isExpanded = index === noteStack.length - 1;
              const dim = 1 - (noteStack.length - 1 - index) * 0.12;
              return (
                <div
                  key={entry.id}
                  className={`${index > 0 ? "-mt-14" : ""} relative`}
                  style={{ zIndex: (index + 1) * 10 }}
                >
                  <NoteCard
                    entry={entry}
                    isExpanded={isExpanded}
                    dim={dim}
                    deletingId={deletingNoteId}
                    confirmDeleteId={confirmDeleteNoteId}
                    onDelete={handleNoteDelete}
                    onEdit={setEditingNote}
                    onCycleCategory={handleCycleCategory}
                  />
                </div>
              );
            })
          )
        ) : financeStack.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-cream/20 bg-white/5 px-6 py-12 text-center">
            <p className="text-cream/60">No logs yet.</p>
            <p className="mt-1 text-sm text-cream/50">
              Tap + to add a log.
            </p>
          </div>
        ) : (
          financeStack.map((log, index) => {
            const isExpanded = index === financeStack.length - 1;
            const dim = 1 - (financeStack.length - 1 - index) * 0.12;
            return (
              <div
                key={log.id}
                className={`${index > 0 ? "-mt-14" : ""} relative`}
                style={{ zIndex: (index + 1) * 10 }}
              >
                <FinanceCard
                  log={log}
                  isExpanded={isExpanded}
                  dim={dim}
                  deletingId={deletingFinanceId}
                  confirmDeleteId={confirmDeleteFinanceId}
                  onDelete={handleFinanceDelete}
                  onEdit={setEditingFinance}
                  onToggleType={handleToggleFinanceType}
                />
              </div>
            );
          })
        )}
      </section>

      <section className="flex min-h-0 flex-1 flex-col rounded-t-[2.5rem] bg-cream p-5 text-black">
        <div className="mb-3 flex shrink-0 items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-[-0.04em]">Tasks</h2>
          <button
            type="button"
            onClick={() => setIsTaskSheetOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-cream transition hover:bg-black/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
            aria-label="Add task"
            title="Add task"
          >
            <PlusIcon className="h-5 w-5" />
          </button>
        </div>

        {tasksError ? (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          >
            <div>
              <p className="font-medium">Couldn&apos;t load tasks</p>
              <p className="mt-0.5 text-black/70">{tasksError}</p>
            </div>
            <button
              type="button"
              onClick={() => setTasksError(null)}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-rose-600 hover:bg-rose-100"
              aria-label="Dismiss error"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : loadingTasks ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-10 animate-pulse rounded-xl bg-black/10"
              />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-6">
            <p className="text-black/50">No tasks yet.</p>
            <p className="mt-1 text-sm text-black/40">Tap + to add a task.</p>
          </div>
        ) : (
          <ul className="overflow-hidden">
            {tasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                togglingId={togglingTaskId}
                onToggle={handleToggleTask}
              />
            ))}
          </ul>
        )}
      </section>

      <div className="shrink-0 bg-cream pb-safe-bottom" />

      <NoteFormSheet
        isOpen={isNoteCreateOpen}
        onClose={() => setIsNoteCreateOpen(false)}
        onSubmit={handleNoteCreateSubmit}
        isSubmitting={isSubmittingNote}
      />

      <NoteFormSheet
        isOpen={!!editingNote}
        onClose={() => setEditingNote(null)}
        initial={editingNote ?? undefined}
        onSubmit={handleNoteEditSubmit}
        isSubmitting={isSubmittingNote}
      />

      <FinanceFormSheet
        isOpen={isFinanceCreateOpen}
        onClose={() => setIsFinanceCreateOpen(false)}
        onSubmit={handleFinanceCreateSubmit}
        isSubmitting={isSubmittingFinance}
      />

      <FinanceFormSheet
        isOpen={!!editingFinance}
        onClose={() => setEditingFinance(null)}
        initial={editingFinance ?? undefined}
        onSubmit={handleFinanceEditSubmit}
        isSubmitting={isSubmittingFinance}
      />

      <CreateTaskSheet
        isOpen={isTaskSheetOpen}
        onClose={() => setIsTaskSheetOpen(false)}
        onSubmit={handleCreateTask}
        isSubmitting={isSubmittingTask}
      />
    </div>
  );
}
