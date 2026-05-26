import { useEffect, useRef } from 'react'

export interface StreamLine {
  html?: string
  text?: string
  cls?: string
  parts?: Array<{ text: string; cls?: string }>
}

interface StreamOptions {
  charDelay?: number
  lineDelay?: number
  loop?: boolean
}

export function useStreamLines(
  target: React.RefObject<HTMLElement | null>,
  lines: StreamLine[],
  opts: StreamOptions = {},
) {
  const activeRef = useRef(false)

  useEffect(() => {
    activeRef.current = true
    const el = target.current
    if (!el) return

    const { charDelay = 14, lineDelay = 60, loop = false } = opts
    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

    const renderOnce = async () => {
      el.innerHTML = ''

      for (const line of lines) {
        if (!activeRef.current) return

        if (line.html) {
          el.insertAdjacentHTML('beforeend', line.html)
          await delay(lineDelay)
          continue
        }

        const span = document.createElement('span')
        span.className = 'lm-term-line'
        el.appendChild(span)

        if (line.parts) {
          for (const part of line.parts) {
            if (!activeRef.current) return
            const partSpan = document.createElement('span')
            if (part.cls) partSpan.className = part.cls
            span.appendChild(partSpan)
            for (const ch of part.text) {
              if (!activeRef.current) return
              partSpan.textContent += ch
              await delay(charDelay)
            }
          }
        } else if (line.text) {
          const textSpan = document.createElement('span')
          if (line.cls) textSpan.className = line.cls
          span.appendChild(textSpan)
          for (const ch of line.text) {
            if (!activeRef.current) return
            textSpan.textContent += ch
            await delay(charDelay)
          }
        }

        const cursor = document.createElement('span')
        cursor.className = 'lm-cursor'
        span.appendChild(cursor)
        await delay(lineDelay)
        cursor.remove()

        el.insertAdjacentHTML('beforeend', '\n')
      }

      const finalCursor = document.createElement('span')
      finalCursor.className = 'lm-cursor'
      el.appendChild(finalCursor)
    }

    const run = async () => {
      if (loop) {
        while (activeRef.current) {
          await renderOnce()
          if (activeRef.current) await delay(2000)
        }
      } else {
        await renderOnce()
      }
    }

    run()

    return () => {
      activeRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
