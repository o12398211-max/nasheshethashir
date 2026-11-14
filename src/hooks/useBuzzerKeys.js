import { useEffect, useRef } from 'react'

/** Calls onBuzz(index) when a player's key (KeyboardEvent.code, layout independent) is pressed. */
export function useBuzzerKeys(codes, onBuzz, enabled = true) {
  const cb = useRef(onBuzz)
  cb.current = onBuzz
  useEffect(() => {
    if (!enabled) return
    const h = (e) => {
      if (e.repeat) return
      const t = e.target
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      const i = codes.indexOf(e.code)
      if (i >= 0) {
        e.preventDefault()
        cb.current(i)
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [codes, enabled])
}
