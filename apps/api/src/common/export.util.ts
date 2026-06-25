/** CSV export — Excel uyumlu (UTF-8 BOM) */
export function toCsv(rows: Record<string, unknown>[], columns: { key: string; label: string }[]) {
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  const header = columns.map((c) => escape(c.label)).join(',');
  const body = rows.map((row) => columns.map((c) => escape(row[c.key])).join(',')).join('\n');
  return `\uFEFF${header}\n${body}`;
}
