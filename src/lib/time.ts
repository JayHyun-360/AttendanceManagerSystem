export function formatTime12Hour(value?: string | null): string {
  if (!value) return "";

  const normalized = value.trim();
  const match = normalized.match(
    /^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?\s*(AM|PM)?$/i,
  );

  if (!match) return value;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();

  if (minute > 59) return value;

  if (meridiem) {
    if (hour < 1 || hour > 12) return value;
  } else if (hour > 23) {
    return value;
  }

  if (meridiem === "AM" && hour === 12) hour = 0;
  if (meridiem === "PM" && hour !== 12) hour += 12;

  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export function formatTimeRange12Hour(
  value?: string | null,
  separator = " – ",
): string {
  if (!value) return "";

  const parts = value.trim().split(/\s*[-–—]\s*/);
  if (parts.length !== 2) return formatTime12Hour(value);

  const start = formatTime12Hour(parts[0]);
  const end = formatTime12Hour(parts[1]);
  return start && end ? `${start}${separator}${end}` : value;
}
