import type { Task } from "@/lib/types";

interface TaskItemProps {
  task: Task;
  togglingId: string | null;
  onToggle: (task: Task) => void;
}

export function TaskItem({ task, togglingId, onToggle }: TaskItemProps) {
  const isToggling = togglingId === task.id;
  const isCompleted = task.status === "completed";

  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <span className="min-w-0">
        <span
          className={`block text-base font-medium tracking-normal ${
            isCompleted
              ? "text-black/50 line-through decoration-black/30"
              : "text-black"
          }`}
        >
          {task.title}
        </span>
        {task.details && (
          <span className="block truncate text-sm font-medium tracking-normal text-black/50">
            {task.details}
          </span>
        )}
      </span>
      <button
        type="button"
        onClick={() => onToggle(task)}
        disabled={isToggling}
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-black/30 disabled:cursor-not-allowed disabled:opacity-50 ${
          isCompleted
            ? "border-black bg-black text-cream"
            : "border-black/40 bg-transparent text-transparent hover:border-black"
        }`}
        aria-label={isCompleted ? "Mark task pending" : "Mark task completed"}
      >
        {isToggling ? (
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <svg
            className="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        )}
      </button>
    </li>
  );
}