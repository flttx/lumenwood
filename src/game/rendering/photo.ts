// One-click clean scenery photo capture (`P` key or HUD camera icon).
// Captures synchronously right after PostFX's final screen grade pass so `preserveDrawingBuffer` is never needed.

export const photoCapture = {
  requested: false,
  onResult: null as ((ok: boolean) => void) | null,
}

export function requestPhoto(onResult?: (ok: boolean) => void) {
  photoCapture.requested = true
  photoCapture.onResult = onResult ?? null
}

/** Formats a local timestamp suitable for downloaded screenshot filenames. */
export function formatPhotoFilename(date = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `lumenwood-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}.png`
}

/** Exports the WebGL canvas immediately after final render to a clean PNG download (zero HUD overlay). */
export function captureCanvasPhoto(canvas: HTMLCanvasElement): boolean {
  try {
    const url = canvas.toDataURL('image/png')
    if (!url || !url.startsWith('data:image/png')) return false
    const link = document.createElement('a')
    link.href = url
    link.download = formatPhotoFilename()
    link.rel = 'noopener'
    document.body.appendChild(link)
    link.click()
    link.remove()
    return true
  } catch {
    return false
  }
}
