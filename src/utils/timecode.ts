export function formatDisplayTime(seconds = 0): string {
  const safeSeconds = Math.max(0, seconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const wholeSeconds = Math.floor(safeSeconds % 60);
  const millis = Math.floor((safeSeconds - Math.floor(safeSeconds)) * 1000);
  return `${pad(hours)}:${pad(minutes)}:${pad(wholeSeconds)}.${String(millis).padStart(3, "0")}`;
}

export function formatShortTime(seconds = 0): string {
  const safeSeconds = Math.max(0, seconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const wholeSeconds = Math.floor(safeSeconds % 60);
  return hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(wholeSeconds)}`
    : `${pad(minutes)}:${pad(wholeSeconds)}`;
}

export function formatSrtTime(seconds = 0): string {
  return formatDisplayTime(seconds).replace(".", ",");
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
