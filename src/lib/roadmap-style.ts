/**
 * Shared roadmap styling helpers used by the interactive builder, the slide
 * preview, and the PPTX generator so all three render identically.
 *
 * Colours are returned as `#RRGGBB`. For pptxgenjs (which wants bare hex) strip
 * the leading `#` at the call site.
 */

export const DEFAULT_ROADMAP_BG = '#FFFFFF'

const clampByte = (n: number) => Math.max(0, Math.min(255, Math.round(n)))

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.padEnd(6, '0').slice(0, 6)
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)]
}

function toHex(rgb: number[]): string {
  return '#' + rgb.map((x) => clampByte(x).toString(16).padStart(2, '0')).join('')
}

/** Linearly interpolate between two hex colours (t = 0 → a, 1 → b). */
export function mix(a: string, b: string, t: number): string {
  const A = parseHex(a)
  const B = parseHex(b)
  return toHex([0, 1, 2].map((i) => A[i] + (B[i] - A[i]) * t))
}

export const lighten = (hex: string, t: number) => mix(hex, '#ffffff', t)
export const darken = (hex: string, t: number) => mix(hex, '#000000', t)

/** Relative luminance (0 = black, 1 = white) per WCAG. */
export function luminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export const isLight = (hex: string) => luminance(hex) > 0.5

/**
 * Gridline colour that stays visible on any background: a darker tone of the
 * background on light backgrounds, a lighter tone on dark ones — so it reads as
 * black/grey on light cards and white/grey on dark cards.
 */
export function gridColor(bg: string): string {
  return isLight(bg) ? mix(bg, '#000000', 0.34) : mix(bg, '#ffffff', 0.42)
}

/** Stronger divider (between year groups) than a normal month gridline. */
export function dividerColor(bg: string): string {
  return isLight(bg) ? mix(bg, '#000000', 0.5) : mix(bg, '#ffffff', 0.6)
}

/** Primary axis/legend text colour with good contrast against the background. */
export const axisTextColor = (bg: string) => (isLight(bg) ? '#1A1A1A' : '#FFFFFF')

/** Secondary (month label) text colour. */
export const axisSubTextColor = (bg: string) => (isLight(bg) ? '#555555' : '#E2E2E2')

/** Subtle border for the roadmap card. */
export const cardBorderColor = (bg: string) => (isLight(bg) ? mix(bg, '#000000', 0.12) : mix(bg, '#ffffff', 0.18))

/**
 * Opaque, glossy CSS background derived from a single base colour: a soft
 * top-left sheen over a vertical light→base→dark gradient. The radial sheen sits
 * on top of the opaque linear gradient, so the result is fully opaque.
 */
export function glossyGradientCss(bg: string): string {
  const top = lighten(bg, 0.1)
  const bottom = darken(bg, 0.06)
  const sheen = lighten(bg, 0.18)
  return [
    `radial-gradient(130% 90% at 22% -10%, ${sheen} 0%, rgba(255,255,255,0) 52%)`,
    `linear-gradient(160deg, ${top} 0%, ${bg} 44%, ${bottom} 100%)`,
  ].join(', ')
}

/** Group an ordered list of month dates into contiguous year spans. */
export function yearGroups(months: Date[]): Array<{ year: number; count: number }> {
  const groups: Array<{ year: number; count: number }> = []
  for (const m of months) {
    const year = m.getFullYear()
    const last = groups[groups.length - 1]
    if (last && last.year === year) last.count++
    else groups.push({ year, count: 1 })
  }
  return groups
}
