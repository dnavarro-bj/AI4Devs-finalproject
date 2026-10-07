import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { downloadBlob } from './downloadBlob'

/** La descarga de un archivo generado en el cliente: un enlace temporal que se pulsa y se retira. */
describe('downloadBlob', () => {
  const created = vi.fn((_blob: Blob) => 'blob:http://app.test/abc')
  const revoked = vi.fn()
  let clicked: HTMLAnchorElement[] = []

  beforeEach(() => {
    clicked = []
    created.mockClear()
    revoked.mockClear()
    URL.createObjectURL = created as never
    URL.revokeObjectURL = revoked
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push(this)
    })
  })

  afterEach(() => vi.restoreAllMocks())

  it('pulsa un enlace con el nombre del archivo y la dirección del blob', () => {
    const blob = new Blob(['a,b'], { type: 'text/csv' })

    downloadBlob(blob, 'cactify-plantas-2026-10-07.csv')

    expect(created).toHaveBeenCalledWith(blob)
    expect(clicked).toHaveLength(1)
    expect(clicked[0]!.download).toBe('cactify-plantas-2026-10-07.csv')
    expect(clicked[0]!.href).toBe('blob:http://app.test/abc')
  })

  it('no deja el enlace en la página ni la dirección del blob sin liberar', () => {
    downloadBlob(new Blob(['x']), 'x.csv')

    expect(document.querySelector('a[download]')).toBeNull()
    expect(revoked).toHaveBeenCalledWith('blob:http://app.test/abc')
  })
})
