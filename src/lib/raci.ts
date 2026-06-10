import type { RaciColumn, RaciLetter, RaciMatrix, RaciRow, RaciValue } from '@/types'

/** The four RACI letters, in canonical display order. */
export const RACI_LETTERS: RaciLetter[] = ['R', 'A', 'C', 'I']

export const RACI_LETTER_LABEL: Record<RaciLetter, string> = {
  R: 'Responsible',
  A: 'Accountable',
  C: 'Consulted',
  I: 'Informed',
}

const LETTER_RANK: Record<RaciLetter, number> = { R: 0, A: 1, C: 2, I: 3 }

/** Coerce any stored cell value (array, single letter, "A/R", "AR", null) to a
 * de-duplicated letter array sorted in canonical RACI order. */
export function parseRaciCell(value: unknown): RaciValue {
  const raw: string[] = Array.isArray(value)
    ? value.map((v) => String(v))
    : typeof value === 'string'
      ? value.split(/[^A-Za-z]+/)
      : []
  const seen = new Set<RaciLetter>()
  for (const token of raw) {
    for (const ch of token.toUpperCase()) {
      if (ch === 'R' || ch === 'A' || ch === 'C' || ch === 'I') seen.add(ch)
    }
  }
  return RACI_LETTERS.filter((l) => seen.has(l))
}

/** Render a cell's letters for display, e.g. `['A','R']` → `"R/A"`. */
export function formatRaciCell(value: unknown): string {
  return parseRaciCell(value).slice().sort((a, b) => LETTER_RANK[a] - LETTER_RANK[b]).join('/')
}

/** Toggle a single letter in a cell, returning a new canonical-ordered array. */
export function toggleRaciLetter(value: RaciValue, letter: RaciLetter): RaciValue {
  const set = new Set(parseRaciCell(value))
  if (set.has(letter)) set.delete(letter)
  else set.add(letter)
  return RACI_LETTERS.filter((l) => set.has(l))
}

export const DEFAULT_RACI_COLUMNS: RaciColumn[] = [
  { id: 'execSponsor', label: 'Exec Sponsor' },
  { id: 'processOwner', label: 'Process Owner' },
  { id: 'sme', label: 'SME' },
  { id: 'arcwidePM', label: 'Arcwide PM' },
  { id: 'arcwideSA', label: 'Arcwide SA' },
  { id: 'arcwideConsultant', label: 'Arcwide Consultant' },
]

function row(activity: string, values: Array<RaciLetter | '' | RaciLetter[]>): RaciRow {
  const cells: Record<string, RaciValue> = {}
  DEFAULT_RACI_COLUMNS.forEach((c, i) => (cells[c.id] = parseRaciCell(values[i])))
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
      rows: (m.rows ?? []).map((r) => ({
        activity: r.activity ?? '',
        cells: Object.fromEntries(Object.entries(r.cells ?? {}).map(([k, v]) => [k, parseRaciCell(v)])),
      })),
    }
  }

  // Legacy array of fixed-key rows.
  if (Array.isArray(value)) {
    return {
      columns: DEFAULT_RACI_COLUMNS,
      rows: (value as LegacyRaciRow[]).map((r) => ({
        activity: typeof r.activity === 'string' ? r.activity : '',
        cells: Object.fromEntries(DEFAULT_RACI_COLUMNS.map((c) => [c.id, parseRaciCell(r[c.id])])),
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
