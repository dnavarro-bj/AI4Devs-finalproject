import { describe, expect, it, vi } from 'vitest'
import { createApiClient } from '@shared/services/httpClient'

/**
 * Escenarios "Identificador conservado íntegro", "Error del API con cuerpo uniforme" y
 * "Error sin cuerpo interpretable".
 */
describe('cliente del API', () => {
  const baseUrl = 'http://api.test'

  it('conserva íntegro un identificador por encima del rango de enteros exactos', async () => {
    // Un TSID real. Como number se convertiría en 882687672222443500: los tres últimos dígitos
    // cambian en silencio.
    const id = '882687672222443468'
    const seen: string[] = []
    const fetcher = vi.fn(async (url: string) => {
      seen.push(url)
      return { id, nickname: 'Bola' }
    })

    const api = createApiClient(baseUrl, fetcher as never)
    const plant = await api.get<{ id: string }>(`/plants/${id}`)
    await api.get(`/plants/${plant.id}`)

    expect(plant.id).toBe(id)
    expect(typeof plant.id).toBe('string')
    expect(seen[1]).toBe(`${baseUrl}/plants/${id}`)
    expect(seen[1]).not.toContain('882687672222443500')
  })

  /**
   * `DELETE` no lleva cuerpo y responde `204` sin contenido: lo que importa es que llegue el
   * método, no lo que devuelva.
   */
  it('retira un recurso con DELETE, sin cuerpo', async () => {
    const seen: { url: string, options?: Record<string, unknown> }[] = []
    const fetcher = vi.fn(async (url: string, options?: Record<string, unknown>) => {
      seen.push({ url, options })
      return undefined
    })

    const api = createApiClient(baseUrl, fetcher as never)
    await api.delete('/soil-mixes/100001')

    expect(seen[0]!.url).toBe(`${baseUrl}/soil-mixes/100001`)
    expect(seen[0]!.options).toEqual({ method: 'DELETE' })
  })

  it('usa el mensaje del cuerpo de error uniforme cuando el API lo devuelve', async () => {
    const fetcher = vi.fn(async () => {
      throw {
        response: { status: 400 },
        data: {
          status: 400,
          error: 'Bad Request',
          message: "La especie '999999999' no existe",
          path: '/plants',
        },
      }
    })

    const api = createApiClient(baseUrl, fetcher as never)

    await expect(api.get('/plants')).rejects.toMatchObject({
      status: 400,
      message: "La especie '999999999' no existe",
    })
  })

  it('cae a un mensaje genérico cuando la respuesta no trae cuerpo interpretable', async () => {
    const fetcher = vi.fn(async () => {
      throw { response: { status: 500 }, data: undefined }
    })

    const api = createApiClient(baseUrl, fetcher as never)

    const error = await api.get('/plants').catch((e) => e)
    expect(error.status).toBe(500)
    expect(error.message).toBeTruthy()
    expect(error.message).not.toContain('undefined')
  })

  it('no deja pasar un fallo de red sin mensaje', async () => {
    const fetcher = vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    })

    const api = createApiClient(baseUrl, fetcher as never)

    const error = await api.get('/plants').catch((e) => e)
    expect(error.message).toBeTruthy()
  })
})

/**
 * Descarga de archivos: el cliente sigue siendo la única pieza que habla con el transporte. Entrega
 * el blob y el nombre que fija el servidor, y un fallo llega como `ApiError` con **su mensaje**, no
 * como un blob ilegible.
 */
describe('cliente del API: descargas', () => {
  const baseUrl = 'http://api.test'
  const csv = () => new Blob(['﻿código\r\nCAT-GRUSS-01\r\n'], { type: 'text/csv' })

  const raw = (headers: Record<string, string>, data: Blob = csv()) =>
    vi.fn(async (_url: string, _options?: Record<string, unknown>) => ({ _data: data, headers: new Headers(headers), status: 200 }))

  it('pide el archivo como blob, con la consulta, y devuelve el nombre que fija el servidor', async () => {
    const fetchRaw = raw({
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="cactify-plantas-2026-10-07.csv"',
    })
    const api = createApiClient(baseUrl, vi.fn() as never, fetchRaw as never)

    const file = await api.getBlob('/plants/export', { q: 'gruss', status: ['activa', 'cuarentena'] })

    expect(fetchRaw).toHaveBeenCalledWith(
      `${baseUrl}/plants/export`,
      { method: 'GET', query: { q: 'gruss', status: ['activa', 'cuarentena'] }, responseType: 'blob' },
    )
    expect(file.filename).toBe('cactify-plantas-2026-10-07.csv')
    expect(file.blob).toBeInstanceOf(Blob)
  })

  it('lee también el nombre sin comillas y el codificado en UTF-8', async () => {
    const plain = createApiClient(baseUrl, vi.fn() as never, raw({ 'content-disposition': 'attachment; filename=plantas.csv' }) as never)
    const encoded = createApiClient(
      baseUrl,
      vi.fn() as never,
      raw({ 'content-disposition': "attachment; filename*=UTF-8''cactify-esp%C3%A9cies.csv" }) as never,
    )

    expect((await plain.getBlob('/plants/export')).filename).toBe('plantas.csv')
    expect((await encoded.getBlob('/plants/export')).filename).toBe('cactify-especies.csv'.replace('especies', 'espécies'))
  })

  it('sin la cabecera, el nombre es nulo y quien descarga pone el suyo', async () => {
    const api = createApiClient(baseUrl, vi.fn() as never, raw({}) as never)

    expect((await api.getBlob('/plants/export')).filename).toBeNull()
  })

  it('un 422 con cuerpo JSON llega con su mensaje, no como un blob', async () => {
    const body = {
      status: 422, error: 'Unprocessable Entity', path: '/plants/export',
      message: '1200 filas superan el máximo de 1000: afina los filtros',
    }
    // Con `responseType: 'blob'`, el cuerpo del error también llega como blob.
    const failing = vi.fn(async () => {
      throw { response: { status: 422 }, data: new Blob([JSON.stringify(body)], { type: 'application/json' }) }
    })
    const api = createApiClient(baseUrl, vi.fn() as never, failing as never)

    await expect(api.getBlob('/plants/export')).rejects.toMatchObject({
      name: 'ApiError',
      status: 422,
      message: '1200 filas superan el máximo de 1000: afina los filtros',
    })
  })

  it('un error cuyo cuerpo no es interpretable se queda con el mensaje genérico', async () => {
    const failing = vi.fn(async () => {
      throw { response: { status: 500 }, data: new Blob(['<html>caído</html>'], { type: 'text/html' }) }
    })
    const api = createApiClient(baseUrl, vi.fn() as never, failing as never)

    await expect(api.getBlob('/plants/export')).rejects.toMatchObject({
      status: 500,
      message: 'No se ha podido completar la operación. Inténtalo de nuevo.',
    })
  })

  it('un fallo de red es un ApiError con estado 0', async () => {
    const failing = vi.fn(async () => { throw new TypeError('Failed to fetch') })
    const api = createApiClient(baseUrl, vi.fn() as never, failing as never)

    await expect(api.getBlob('/plants/export')).rejects.toMatchObject({ name: 'ApiError', status: 0 })
  })
  /**
   * Un multipart lleva el `FormData` tal cual y **no** fija el `Content-Type`: lo pone el navegador
   * con el `boundary`, y fijarlo a mano rompería la subida.
   */
  describe('postForm', () => {
    it('envía el FormData sin fijar el Content-Type', async () => {
      const seen: { url: string, options?: Record<string, unknown> }[] = []
      const fetcher = vi.fn(async (url: string, options?: Record<string, unknown>) => {
        seen.push({ url, options })
        return [{ id: '1' }]
      })
      const form = new FormData()
      form.append('files', new File(['x'], 'a.jpg', { type: 'image/jpeg' }))

      const api = createApiClient(baseUrl, fetcher as never)
      const result = await api.postForm<{ id: string }[]>('/plants/1/photos', form)

      expect(result).toEqual([{ id: '1' }])
      expect(seen[0]!.url).toBe(`${baseUrl}/plants/1/photos`)
      expect(seen[0]!.options!.method).toBe('POST')
      expect(seen[0]!.options!.body).toBe(form)
      expect(seen[0]!.options!.headers).toBeUndefined()
    })

    it('normaliza el error del servidor', async () => {
      const fetcher = vi.fn(async () => {
        throw { response: { status: 413 }, data: { status: 413, error: 'Payload Too Large', message: 'El archivo supera 10 MB', path: '/x' } }
      })
      const api = createApiClient(baseUrl, fetcher as never)

      await expect(api.postForm('/plants/1/photos', new FormData())).rejects.toMatchObject({
        name: 'ApiError', status: 413, message: 'El archivo supera 10 MB',
      })
    })
  })
})
