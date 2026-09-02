import { getIndiaParts } from "./time";

export function createEntryId(date = new Date()): string {
  const { y, m, d, h, min, s } = getIndiaParts(date);
  return `Note_${h}${min}${s}_${d}_${m}_${y}`;
}

export function createTaskId(date = new Date()): string {
  const { y, m, d, h, min, s } = getIndiaParts(date);
  return `Task_${h}${min}${s}_${d}_${m}_${y}`;
}

export function createFinanceId(date = new Date()): string {
  const { y, m, d, h, min, s } = getIndiaParts(date);
  return `Finance_${h}${min}${s}_${d}_${m}_${y}`;
}

export function idToDate(id: string): Date | null {
  const match = id.match(
    /^Note_(\d{2})(\d{2})(\d{2})_(\d{2})_(\d{2})_(\d{4})$/
  );
  if (!match) return null;
  const [, h, min, s, d, m, y] = match;
  return new Date(
    Number(y),
    Number(m) - 1,
    Number(d),
    Number(h),
    Number(min),
    Number(s)
  );
}
