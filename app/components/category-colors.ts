import type { NoteCategory } from "@/lib/types";

export const categoryMeta: Record<
  NoteCategory | "default",
  { label: string; bg: string; text: string; ring: string }
> = {
  office: {
    label: "Office",
    bg: "bg-red",
    text: "text-black",
    ring: "ring-red",
  },
  personal: {
    label: "Personal",
    bg: "bg-purple",
    text: "text-black",
    ring: "ring-purple",
  },
  miscellaneous: {
    label: "Miscellaneous",
    bg: "bg-yellow",
    text: "text-black",
    ring: "ring-yellow",
  },
  default: {
    label: "Note",
    bg: "bg-yellow",
    text: "text-black",
    ring: "ring-yellow",
  },
};

export const categoryOrder: NoteCategory[] = [
  "office",
  "personal",
  "miscellaneous",
];

export function getCategoryMeta(category?: NoteCategory | null) {
  return category ? categoryMeta[category] : categoryMeta.default;
}

export function getTitle(entry: { title?: string; content: string }): string {
  const raw = entry.title?.trim() || entry.content.split("\n")[0].trim();
  if (!raw) return "Note";
  const words = raw.split(/\s+/);
  const limited = words.slice(0, 5).join(" ");
  return limited.length > 40 ? `${limited.slice(0, 40)}…` : limited;
}
