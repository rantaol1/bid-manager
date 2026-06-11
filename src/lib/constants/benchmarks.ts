/**
 * Firm-wide KPI benchmarks for project-performance analysis. Tune the thresholds
 * here in one place; the Analysis tab and estimation monitoring cards colour-code
 * KPIs against them (Red / Amber / Green).
 */

export type RagStatus = 'green' | 'amber' | 'red'

export const BENCHMARKS = {
  /** Target gross margin as a fraction of fees. ≥30% green · 20–30% amber · <20% red. */
  grossMarginPct: { target: 0.3, warn: 0.2 },
  /** Healthy average allocation/utilisation band (%). ≥70 green · 50–70 amber · <50 red. */
  utilisation: { target: 70, warn: 50 },
} as const

/** RAG for gross margin %. Input is a fraction (0..1). Returns undefined when margin is unknown. */
export function ragForMargin(marginFraction: number | null): RagStatus | undefined {
  if (marginFraction === null) return undefined
  if (marginFraction >= BENCHMARKS.grossMarginPct.target) return 'green'
  if (marginFraction >= BENCHMARKS.grossMarginPct.warn) return 'amber'
  return 'red'
}

/** RAG for average utilisation/allocation. Input is a percentage (0..100). */
export function ragForUtilisation(utilisationPct: number): RagStatus {
  if (utilisationPct >= BENCHMARKS.utilisation.target) return 'green'
  if (utilisationPct >= BENCHMARKS.utilisation.warn) return 'amber'
  return 'red'
}
