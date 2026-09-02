import type { InboxEntry } from "@/lib/types";
import { CheckIcon, EditIcon, TagIcon, TrashIcon } from "./icons";
import { getCategoryMeta, getTitle } from "./category-colors";


interface NoteCardProps {
  entry: InboxEntry;
  isExpanded: boolean;
  dim?: number;
  deletingId: string | null;
  confirmDeleteId: string | null;
  onDelete: (entry: InboxEntry) => void;
  onEdit: (entry: InboxEntry) => void;
  onCycleCategory: (entry: InboxEntry) => void;
}

export function NoteCard({
  entry,
  isExpanded,
  dim,
  deletingId,
  confirmDeleteId,
  onDelete,
  onEdit,
  onCycleCategory,
}: NoteCardProps) {
  const meta = getCategoryMeta(entry.category);
  const isDeleting = deletingId === entry.id;
  const isConfirm = confirmDeleteId === entry.id;

  return (
    <article
      className={`relative rounded-[2rem] p-5 shadow-sm ${meta.bg} ${meta.text} ${
        isExpanded ? "min-h-[220px]" : "h-[120px]"
      }`}
      style={{ filter: dim !== undefined ? `brightness(${dim})` : undefined }}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="truncate text-2xl font-semibold leading-tight tracking-[-0.04em]">
          {getTitle(entry)}
        </h3>
        {entry.status === "processed" ? (
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/10 text-black"
            aria-label="Processed"
            title="Processed"
          >
            <CheckIcon className="h-3.5 w-3.5" />
          </span>
        ) : (
          <button
            type="button"
            onClick={() => onDelete(entry)}
            disabled={isDeleting}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-black/30 disabled:cursor-not-allowed disabled:opacity-40 ${
              isConfirm
                ? "bg-black text-white"
                : "bg-black/10 text-black hover:bg-black/20"
            }`}
            aria-label={
              isConfirm ? "Confirm delete capture" : "Delete capture"
            }
            title={
              isConfirm ? "Tap again to confirm delete" : "Delete capture"
            }
          >
            {isDeleting ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : isConfirm ? (
              <CheckIcon className="h-3.5 w-3.5" />
            ) : (
              <TrashIcon className="h-3.5 w-3.5" />
            )}
          </button>
        )}
      </div>

      {isExpanded && entry.content && (
        <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-base font-medium leading-relaxed tracking-normal opacity-90">
          {entry.content}
        </p>
      )}

      {isExpanded && (
        <div className="mt-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => onCycleCategory(entry)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white shadow-sm transition hover:bg-black/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 active:scale-95"
            aria-label="Change category"
            title="Change category"
          >
            <TagIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onEdit(entry)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white shadow-sm transition hover:bg-black/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 active:scale-95"
            aria-label="Edit note"
            title="Edit note"
          >
            <EditIcon className="h-4 w-4" />
          </button>
        </div>
      )}
    </article>
  );
}