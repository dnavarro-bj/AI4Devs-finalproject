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
