'use client'

import { useEffect, useRef, useState } from 'react'
import { BRAND } from '@/lib/documents/slides/shared/branding'

/** 1 inch = 72 px. The PPTX canvas is 10 x 5.625 in. */
export const PX = 72
export const STAGE_W = 10 * PX // 720
export const STAGE_H = 5.625 * PX // 405
export const inch = (n: number) => n * PX

function useScaleToWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.5)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width
      if (w > 0) setScale(w / STAGE_W)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return { ref, scale }
}

/** A scaled 16:9 slide stage that mirrors the PPTX coordinate system in HTML. */
export function SlideCanvas({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  const { ref, scale } = useScaleToWidth()
  return (
    <div
      ref={ref}
      className="relative w-full overflow-hidden rounded-md border border-border shadow-sm"
      style={{ aspectRatio: `${STAGE_W} / ${STAGE_H}` }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: STAGE_W,
          height: STAGE_H,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          background: dark ? `#${BRAND.black}` : '#fff',
          fontFamily: 'Arial, Helvetica, sans-serif',
          color: `#${BRAND.darkGray}`,
        }}
      >
        {children}
      </div>
    </div>
  )
}

/** Absolutely-positioned box using inch coordinates (matching the builders). */
export function Box({
  x,
  y,
  w,
  h,
  children,
  style,
}: {
  x: number
  y: number
  w?: number
  h?: number
  children?: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <div
      style={{
        position: 'absolute',
        left: inch(x),
        top: inch(y),
        width: w !== undefined ? inch(w) : undefined,
        height: h !== undefined ? inch(h) : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  )
}
