/** Distinct colours for charting cost/role mix (Arcwide magenta first). */
export const CHART_PALETTE = [
  '#E6007E', // magenta
  '#2196F3', // blue
  '#E87722', // orange
  '#2EB872', // green
  '#9C27B0', // purple
  '#F59E0B', // amber
  '#0EA5E9', // sky
  '#EF4444', // red
  '#14B8A6', // teal
  '#6366F1', // indigo
  '#84CC16', // lime
  '#EC4899', // pink
] as const

/** Named colours for the analysis charts. */
export const CHART_COLORS = {
  staffingBar: '#2196F3',
  peakLine: '#E6007E',
  marginCost: '#D9D9D9', // delivery-cost portion (Arcwide gray-mid)
  marginMargin: '#E6007E', // margin portion (magenta)
} as const
