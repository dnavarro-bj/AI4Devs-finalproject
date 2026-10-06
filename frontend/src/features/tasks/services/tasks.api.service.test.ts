import { describe, expect, it } from 'vitest'
import { tasksApiService } from './tasks.api.service'

describe('tasksApiService', () => {
  it('devuelve las tareas como ServiceResponse y no lanza', async () => {
    const result = await tasksApiService.list()

    expect(result.success).toBe(true)
    expect(result.error).toBeNull()
    expect(result.data!.length).toBeGreaterThan(0)
  })

  it('cada llamada devuelve copias: quien filtre o edite no altera el mock', async () => {
    const first = await tasksApiService.list()
    first.data![0]!.title = 'cambiada'

    const second = await tasksApiService.list()
    expect(second.data![0]!.title).not.toBe('cambiada')
  })

  it('«vencida» no se almacena: ninguna tarea trae ese estado', async () => {
    const result = await tasksApiService.list()

    expect(result.data!.every((task) => ['pending', 'completed'].includes(task.status))).toBe(true)
  })
})
