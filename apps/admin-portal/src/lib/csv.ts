/**
 * Client-side CSV export. Admin lists are already in memory and capped by
 * pagination, so there is no need to round-trip through the server.
 */
export function downloadCsv(
  filename: string,
  rows: Record<string, unknown>[],
  columns?: string[],
): void {
  if (rows.length === 0) return;

  const cols = columns ?? Object.keys(rows[0]);

  // Quote every field and double any embedded quotes — commas, newlines and
  // quotes inside venue names would otherwise break the row.
  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return '""';
    return `"${String(v).replace(/"/g, '""')}"`;
  };

  const csv = [
    cols.map(escape).join(','),
    ...rows.map(row => cols.map(c => escape(row[c])).join(',')),
  ].join('\n');

  // BOM so Excel opens UTF-8 (Lagos venue names) without mangling accents.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
