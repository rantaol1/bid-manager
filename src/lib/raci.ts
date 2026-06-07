import type { RaciColumn, RaciMatrix, RaciValue } from '@/types'

export const DEFAULT_RACI_COLUMNS: RaciColumn[] = [
  { id: 'execSponsor', label: 'Exec Sponsor' },
  { id: 'processOwner', label: 'Process Owner' },
  { id: 'sme', label: 'SME' },
  { id: 'arcwidePM', label: 'Arcwide PM' },
  { id: 'arcwideSA', label: 'Arcwide SA' },
  { id: 'arcwideConsultant', label: 'Arcwide Consultant' },
]

function row(activity: string, values: RaciValue[]): { activity: string; cells: Record<string, RaciValue> } {
  const cells: Record<string, RaciValue> = {}
  DEFAULT_RACI_COLUMNS.forEach((c, i) => (cells[c.id] = values[i] ?? ''))
  return { activity, cells }
}

export const DEFAULT_RACI: RaciMatrix = {
  columns: DEFAULT_RACI_COLUMNS,
  rows: [
    row('Scope & charter', ['A', 'C', 'I', 'R', 'C', 'I']),
    row('Solution design decisions', ['I', 'A', 'C', 'C', 'R', 'C']),
    row('Configuration & build', ['I', 'I', 'C', 'C', 'C', 'R']),
    row('CRIM specification & build', ['I', 'C', 'C', 'A', 'C', 'R']),
    row('Data migration & validation', ['I', 'A', 'R', 'C', 'C', 'R']),
    row('Testing (SIT / UAT)', ['I', 'A', 'R', 'C', 'C', 'R']),
    row('Training & adoption', ['I', 'A', 'R', 'C', 'I', 'R']),
    row('Go-live decision', ['A', 'C', 'I', 'R', 'C', 'I']),
  ],
}

interface LegacyRaciRow {
  activity?: string
  [key: string]: unknown
}

/**
 * Coerce any stored RACI value into the current `{ columns, rows }` matrix shape.
 * Handles the legacy fixed-column array shape and null/undefined.
 */
export function normalizeRaci(value: unknown): RaciMatrix {
  if (!value) return DEFAULT_RACI

  // Already the matrix shape.
  if (typeof value === 'object' && !Array.isArray(value) && Array.isArray((value as RaciMatrix).columns)) {
    const m = value as RaciMatrix
    return {
      columns: m.columns ?? DEFAULT_RACI_COLUMNS,
      rows: (m.rows ?? []).map((r) => ({ activity: r.activity ?? '', cells: r.cells ?? {} })),
    }
  }

  // Legacy array of fixed-key rows.
  if (Array.isArray(value)) {
    return {
      columns: DEFAULT_RACI_COLUMNS,
      rows: (value as LegacyRaciRow[]).map((r) => ({
        activity: typeof r.activity === 'string' ? r.activity : '',
        cells: Object.fromEntries(
          DEFAULT_RACI_COLUMNS.map((c) => [c.id, (r[c.id] as RaciValue) ?? ''])
        ),
      })),
    }
  }

  return DEFAULT_RACI
}

/** Generate a column id from a label (stable-ish for new columns). */
export function raciColumnId(label: string, index: number): string {
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return slug ? `${slug}-${index}` : `col-${index}`
}
