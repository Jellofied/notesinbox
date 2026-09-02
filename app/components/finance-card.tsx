import type { FinanceLog } from "@/lib/types";
import { CheckIcon, EditIcon, TagIcon, TrashIcon } from "./icons";
import { financeOrder, getFinanceMeta } from "./finance-colors";

interface FinanceCardProps {
  log: FinanceLog;
  isExpanded: boolean;
  dim?: number;
  deletingId: string | null;
  confirmDeleteId: string | null;
  onDelete: (log: FinanceLog) => void;
  onEdit: (log: FinanceLog) => void;
  onToggleType: (log: FinanceLog) => void;
}

export function FinanceCard({
  log,
  isExpanded,
  dim,
  deletingId,
  confirmDeleteId,
  onDelete,
  onEdit,
  onToggleType,
}: FinanceCardProps) {
  const meta = getFinanceMeta(log.type);
  const isDeleting = deletingId === log.id;
  const isConfirm = confirmDeleteId === log.id;

  return (
    <article
      className={`relative flex flex-col rounded-[2rem] p-5 shadow-sm ${meta.bg} ${meta.text} ${
        isExpanded ? "min-h-[220px]" : "h-[120px]"
      }`}
      style={{ filter: dim !== undefined ? `brightness(${dim})` : undefined }}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="truncate text-2xl font-semibold leading-tight tracking-[-0.04em]">
          {log.amount}
        </h3>
        <button
          type="button"
          onClick={() => onDelete(log)}
          disabled={isDeleting}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-black/30 disabled:cursor-not-allowed disabled:opacity-40 ${
            isConfirm
              ? "bg-black text-white"
              : "bg-black/10 text-black hover:bg-black/20"
          }`}
          aria-label={isConfirm ? "Confirm delete log" : "Delete log"}
          title={isConfirm ? "Tap again to confirm delete" : "Delete log"}
        >
          {isDeleting ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : isConfirm ? (
            <CheckIcon className="h-3.5 w-3.5" />
          ) : (
            <TrashIcon className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {isExpanded && log.note && (
        <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-base font-medium leading-relaxed tracking-normal opacity-90">
          {log.note}
        </p>
      )}

      {isExpanded && (
        <div className="mt-auto flex items-center justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => onToggleType(log)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white shadow-sm transition hover:bg-black/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 active:scale-95"
            aria-label="Toggle expense or income"
            title="Toggle expense or income"
          >
            <TagIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onEdit(log)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white shadow-sm transition hover:bg-black/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 active:scale-95"
            aria-label="Edit log"
            title="Edit log"
          >
            <EditIcon className="h-4 w-4" />
          </button>
        </div>
      )}
    </article>
  );
}

export function cycleFinanceType(current: import("@/lib/types").FinanceType) {
  const idx = financeOrder.indexOf(current);
  return financeOrder[(idx + 1) % financeOrder.length];
}
