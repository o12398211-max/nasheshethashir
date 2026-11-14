import { useEffect, useState } from 'react'

/** Re-renders every `ms` while active and returns Date.now(). */
export function useNow(active = true, ms = 100) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(id)
  }, [active, ms])
  return now
}
