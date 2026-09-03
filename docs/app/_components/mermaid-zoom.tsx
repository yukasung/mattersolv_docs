'use client'

import { useEffect, useState } from 'react'

const ZOOMED_CLASS = 'mermaid-zoomed'

/**
 * Click any rendered mermaid diagram to view it full screen.
 *
 * Mounted once in the root layout. Mermaid injects its SVG asynchronously and
 * the compiled MDX imports the Mermaid component directly, so there is no
 * component seam to wrap. A delegated listener is therefore the only hook that
 * covers every diagram on every page, including pages added later. Every
 * mermaid root SVG carries aria-roledescription, which is what identifies a
 * diagram here.
 */
export function MermaidZoom() {
  const [zoomed, setZoomed] = useState<HTMLElement | null>(null)

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as Element | null
      const svg = target?.closest?.('svg[aria-roledescription]')

      if (!svg) {
        return
      }

      const container = svg.parentElement

      if (!(container instanceof HTMLElement)) {
        return
      }

      setZoomed((current) => (current === container ? null : container))
    }

    document.addEventListener('click', onClick)

    return () => {
      document.removeEventListener('click', onClick)
    }
  }, [])

  useEffect(() => {
    if (!zoomed) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setZoomed(null)
      }
    }

    const previousOverflow = document.body.style.overflow

    zoomed.classList.add(ZOOMED_CLASS)
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)

    return () => {
      zoomed.classList.remove(ZOOMED_CLASS)
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [zoomed])

  if (!zoomed) {
    return null
  }

  return (
    <button
      type="button"
      className="mermaid-zoom-close"
      onClick={() => setZoomed(null)}
    >
      ปิด
    </button>
  )
}
