import { describe, expect, it } from 'vitest'
import { formatPhotoFilename, photoCapture, requestPhoto } from './photo'

describe('scenic photo capture helpers', () => {
  it('formats a readable timestamped PNG filename', () => {
    const name = formatPhotoFilename(new Date(2026, 10, 25, 9, 5, 7))
    expect(name).toBe('lumenwood-20261125-090507.png')
  })

  it('queues a capture request with its result callback', () => {
    let called = false
    requestPhoto(() => { called = true })
    expect(photoCapture.requested).toBe(true)
    photoCapture.onResult?.(true)
    expect(called).toBe(true)
    photoCapture.requested = false
    photoCapture.onResult = null
  })
})
