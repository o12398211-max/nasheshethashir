import { useCallback, useEffect, useRef, useState } from 'react'

const SR = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null
export const speechSupported = !!SR

/** Hebrew speech-to-text via the browser's Web Speech API. */
export function useSpeechRecognition({ onFinal }) {
  const recRef = useRef(null)
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState(null)
  const onFinalRef = useRef(onFinal)
  onFinalRef.current = onFinal

  const stop = useCallback(() => {
    try {
      recRef.current?.abort()
    } catch {
      /* ignore */
    }
    setListening(false)
  }, [])

  const start = useCallback(() => {
    if (!SR) return
    stop()
    const rec = new SR()
    rec.lang = 'he-IL'
    rec.interimResults = true
    rec.maxAlternatives = 5
    rec.continuous = false
    rec.onresult = (e) => {
      const res = e.results[e.results.length - 1]
      const alts = Array.from(res).map((r) => r.transcript.trim())
      setInterim(alts[0] || '')
      if (res.isFinal) {
        setListening(false)
        onFinalRef.current?.(alts)
      }
    }
    rec.onerror = (e) => {
      setError(e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'אין הרשאה למיקרופון' : e.error === 'no-speech' ? 'לא שמעתי כלום, נסו שוב' : 'שגיאה בזיהוי הקול')
      setListening(false)
    }
    rec.onend = () => setListening(false)
    recRef.current = rec
    setError(null)
    setInterim('')
    try {
      rec.start()
      setListening(true)
    } catch {
      setError('לא ניתן להפעיל מיקרופון')
    }
  }, [stop])

  useEffect(() => stop, [stop])
  return { start, stop, listening, interim, error, supported: speechSupported }
}
