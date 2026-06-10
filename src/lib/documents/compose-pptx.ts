import { Automizer } from 'pptx-automizer'
import { getSections, type DeliverableType } from '@/lib/documents/proposal-sections'
import type { PptxMapping } from '@/lib/schemas/pptx-deck-template'

/**
 * Compose the output deck (in section order) from an uploaded .potx and the app's
 * visual slides, preserving the .potx masters/theme. Runs fully in-memory:
 *  - root = the .potx (its theme becomes the package default; its own slides dropped)
 *  - each section maps to a .potx slide (token-filled later) or a spliced app visual
 *  - generic slides are interleaved by their configured position
 * Returns the composed (un-filled) pptx buffer.
 */
export async function composePptx(args: {
  type: DeliverableType
  potxBuffer: Buffer
  visualsBuffer: Buffer | null
  visualOrder: string[]
  mapping: PptxMapping
}): Promise<Buffer> {
  const { type, potxBuffer, visualsBuffer, visualOrder, mapping } = args

  const automizer = new Automizer({
    removeExistingSlides: true,
    cleanup: true,
    autoImportSlideMasters: true,
  })
  const pres = automizer.loadRoot(potxBuffer).load(potxBuffer, 'tpl')
  if (visualsBuffer) pres.load(visualsBuffer, 'vis')

  const spliceSet = new Set(mapping.visualSplice)
  const visualSlideOf = (sectionId: string) => visualOrder.indexOf(sectionId) + 1 // 1-based, 0 if absent

  // Base slides in section order: a spliced visual, or the mapped .potx slide.
  const ops: Array<() => void> = []
  for (const section of getSections(type)) {
    if (spliceSet.has(section.id)) {
      const vi = visualSlideOf(section.id)
      if (visualsBuffer && vi >= 1) ops.push(() => pres.addSlide('vis', vi))
      continue
    }
    const slideIdx = mapping.sectionMap[section.id]
    if (slideIdx) ops.push(() => pres.addSlide('tpl', slideIdx))
  }

  // Interleave generic slides at their configured output position.
  const generics = [...mapping.genericSlides].sort((a, b) => a.position - b.position)
  for (const g of generics) {
    const at = Math.min(Math.max(g.position, 0), ops.length)
    ops.splice(at, 0, () => pres.addSlide('tpl', g.slideIndex))
  }

  if (ops.length === 0) throw new Error('No slides mapped for this template — map sections to slides first')
  for (const op of ops) op()

  const zip = await pres.getJSZip()
  return (await zip.generateAsync({ type: 'nodebuffer' })) as Buffer
}
