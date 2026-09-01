import type { InboxStatus } from "@/lib/types";

const statusStyles: Record<
  InboxStatus,
  { dot: string; label: string; text: string }
> = {
  unprocessed: {
    dot: "bg-amber-400",
    label: "Unprocessed",
    text: "text-stone-500",
  },
  processing: {
    dot: "bg-sky-400",
    label: "Processing",
    text: "text-stone-500",
  },
  processed: {
    dot: "bg-emerald-400",
    label: "Processed",
    text: "text-stone-500",
  },
  failed: {
    dot: "bg-rose-400",
    label: "Failed",
    text: "text-stone-500",
  },
};

export function StatusBadge({ status }: { status: InboxStatus }) {
  const style = statusStyles[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs ${style.text}`}
      title={style.label}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${style.dot}`}
        aria-hidden="true"
      />
      <span className="sr-only">Status:</span>
      {style.label}
    </span>
  );
}
