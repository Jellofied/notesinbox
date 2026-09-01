import crypto from "crypto";

export function createEntryId(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  const rand = crypto.randomBytes(4).toString("hex");
  return `${y}-${m}-${d}-${h}${min}${s}-${rand}`;
}

export function idToDate(id: string): Date | null {
  const match = id.match(
    /^(\d{4})-(\d{2})-(\d{2})-(\d{2})(\d{2})(\d{2})-/
  );
  if (!match) return null;
  const [, y, m, d, h, min, s] = match;
  return new Date(
    Number(y),
    Number(m) - 1,
    Number(d),
    Number(h),
    Number(min),
    Number(s)
  );
}
