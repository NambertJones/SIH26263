/** Dates are always shown in IST with an explicit format, e.g. "27 Oct 2026, 10:15 IST". */
export function formatIST(value?: string | number | Date | null): string {
  if (!value) return '—';
  // Backend timestamps are naive UTC; mark them as UTC before converting
  const d = typeof value === 'string' && !/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? new Date(value + 'Z') : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return (
    d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }) + ' IST'
  );
}

export function nowIST(): string {
  return formatIST(new Date());
}
