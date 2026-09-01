const INDIA_TIMEZONE = "Asia/Kolkata";
const INDIA_OFFSET = "+05:30";

function getParts(date: Date): Record<string, string> {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: INDIA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts: Record<string, string> = {};
  for (const part of fmt.formatToParts(date)) {
    if (part.type !== "literal") {
      parts[part.type] = part.value;
    }
  }
  return parts;
}

export function getIndiaParts(date: Date) {
  const parts = getParts(date);
  return {
    y: parts.year,
    m: parts.month,
    d: parts.day,
    h: parts.hour,
    min: parts.minute,
    s: parts.second,
  };
}

export function formatIndiaISO(date: Date): string {
  const { y, m, d, h, min, s } = getIndiaParts(date);
  return `${y}-${m}-${d}T${h}:${min}:${s}${INDIA_OFFSET}`;
}

export function formatDisplayTime(iso: string | Date): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  const time = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  if (isToday) return `Today · ${time}`;
  if (isYesterday) return `Yesterday · ${time}`;

  const dateStr = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  return `${dateStr} · ${time}`;
}
