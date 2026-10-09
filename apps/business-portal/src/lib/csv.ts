/**
 * CSV export for the portal's three Export buttons, which until now had no
 * onClick at all.
 *
 * Escaping is the whole job here, and it is easy to get wrong in a way that
 * only shows up on real data: a Lagos venue called `Bungalow, VI` or a review
 * body containing a newline will silently shift every following column if the
 * field is not quoted. RFC 4180 says wrap in double quotes and double any
 * embedded quote, which is what `cell` does — unconditionally, because
 * deciding per value is how one unquoted comma gets through.
 */

const cell = (value: unknown): string => {
  if (value === null || value === undefined) return '""';
  const s = value instanceof Date ? value.toISOString() : String(value);
  return `"${s.replace(/"/g, '""')}"`;
};

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => unknown;
}

export function toCsv<T>(columns: CsvColumn<T>[], rows: T[]): string {
  const head = columns.map(c => cell(c.header)).join(',');
  const body = rows.map(row => columns.map(c => cell(c.value(row))).join(','));
  return [head, ...body].join('\r\n');
}

/**
 * Trigger a download of `rows` as a CSV file.
 *
 * The BOM is deliberate: without it Excel on Windows reads the file as the
 * local ANSI codepage and mangles any non-ASCII character — which here means
 * the naira sign and every accented venue name.
 */
export function downloadCsv<T>(filename: string, columns: CsvColumn<T>[], rows: T[]): void {
  const blob = new Blob(['﻿' + toCsv(columns, rows)], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Without this the blob is held for the lifetime of the document; a few
  // exports of a large venue list is real memory.
  URL.revokeObjectURL(url);
}

/** `venues-2026-10-07.csv` — sortable, and no collisions across days. */
export const datedFilename = (stem: string): string =>
  `${stem}-${new Date().toISOString().slice(0, 10)}.csv`;
