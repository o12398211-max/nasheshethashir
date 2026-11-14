let ctx = null
export function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    ctx = new AC()
  }
  return ctx
}
/** Must be called from a user gesture (click / key) to allow sound on all browsers. */
export function unlockAudio() {
  const c = getCtx()
  if (c.state === 'suspended') c.resume()
  return c
}
