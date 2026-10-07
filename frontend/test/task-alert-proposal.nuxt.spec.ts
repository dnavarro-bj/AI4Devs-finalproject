import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { settle } from './helpers/apiDouble'
import TaskDialogs from '../src/features/tasks/components/TaskDialogs.vue'
import { useTaskWorkflow } from '../src/features/tasks/composables/useTaskWorkflow'
import { tasksApiService } from '@features/tasks/services/tasks.api.service'
import { alertsApiService } from '@features/alerts/services/alerts.api.service'
import { locationsApiService } from '@features/locations/services/locations.api.service'
import { useReferenceDate } from '@shared/composables/useReferenceDate'
import { useToast } from '@shared/composables/useToast'
import { ok, fail, domainError, ErrorCodes } from '@shared/types/api.types'
import type { Task } from '@features/tasks/types/task.types'

/**
 * Escenarios de «Completar una tarea de alerta propone resolverla» (`plant-dashboard`) y «Una tarea
 * puede nacer de una alerta» (`tasks`): completar **propone**, nunca resuelve por su cuenta.
 */
enableAutoUnmount(afterEach)

const task = (over: Partial<Task> = {}): Task => ({
  id: '40', type: 'otra', title: 'Revisar temperatura de CAT-FEROC-08', priority: 'alta', status: 'pendiente',
  dueFrom: '2026-10-07', dueTo: '2026-10-07', origin: 'alerta', originAlertId: '1',
  target: { kind: 'plants', plantCount: 1 }, createdAt: '2026-10-06T00:00:00Z', updatedAt: '2026-10-06T00:00:00Z',
  ...over,
})

const scopePage = ok({
  content: [{
    id: '5', code: 'CAT-FEROC-08', nickname: 'Pelona',
    species: { id: '2', scientificName: 'Ferocactus gracilis' }, location: { id: '3', name: 'B1' },
  }],
  totalElements: 1, totalPages: 1, pageNumber: 0, pageSize: 50,
})

const onChanged = vi.fn()

beforeEach(() => {
  useReferenceDate().value = '2026-10-07'
  onChanged.mockReset()
  vi.spyOn(tasksApiService, 'scope').mockResolvedValue(scopePage as never)
  vi.spyOn(locationsApiService, 'list').mockResolvedValue(ok({ content: [], totalElements: 0, totalPages: 0, pageNumber: 0, pageSize: 500 }) as never)
})

afterEach(() => {
  vi.restoreAllMocks()
  useToast().clear()
})

async function complete(completed: Task) {
  vi.spyOn(tasksApiService, 'complete').mockResolvedValue(ok(completed) as never)
  const workflow = useTaskWorkflow(onChanged)
  const wrapper = await mountSuspended(TaskDialogs, { props: { workflow } })
  workflow.openComplete(task())
  await settle(); await settle()
  await wrapper.find('[data-test="complete-confirm"]').trigger('click')
  await settle(); await settle()
  return wrapper
}

const completed = (suggested: Task['suggestedAlertResolution']) =>
  task({ status: 'completada', suggestedAlertResolution: suggested, completion: { completedAt: '2026-10-07T09:00:00Z', affectedPlants: 1 } })

describe('completar una tarea que nació de una alerta', () => {
  it('propone resolver la alerta y deja claro que todavía no está resuelta', async () => {
    const resolve = vi.spyOn(alertsApiService, 'transition')
    const wrapper = await complete(completed({ alertId: '1', status: 'revisada' }))

    const proposal = wrapper.find('[data-test="alert-proposal"]')
    expect(proposal.exists()).toBe(true)
    expect(proposal.text()).toContain('no está resuelta')
    expect(resolve).not.toHaveBeenCalled()
  })

  it('aceptar resuelve la alerta con el comentario escrito', async () => {
    const resolve = vi.spyOn(alertsApiService, 'transition').mockResolvedValue(ok({ id: '1', status: 'resuelta' }) as never)
    const wrapper = await complete(completed({ alertId: '1', status: 'nueva' }))

    await wrapper.find('[data-test="alert-proposal-comment"]').setValue('Ya está corregida')
    await wrapper.find('[data-test="alert-proposal-accept"]').trigger('click')
    await settle(); await settle()

    expect(resolve).toHaveBeenCalledWith('1', 'resolve', 'Ya está corregida')
    expect(onChanged).toHaveBeenCalledTimes(1)
    expect(wrapper.find('[data-test="alert-proposal"]').exists()).toBe(false)
  })

  it('declinar deja la alerta abierta y visible, sin tocarla', async () => {
    const resolve = vi.spyOn(alertsApiService, 'transition')
    const wrapper = await complete(completed({ alertId: '1', status: 'revisada' }))

    await wrapper.find('[data-test="alert-proposal-decline"]').trigger('click')
    await settle()

    expect(resolve).not.toHaveBeenCalled()
    expect(onChanged).toHaveBeenCalledTimes(1)
    expect(wrapper.find('[data-test="alert-proposal"]').exists()).toBe(false)
  })

  it('un fallo al resolver se explica y la propuesta sigue abierta con su comentario', async () => {
    vi.spyOn(alertsApiService, 'transition').mockResolvedValue(fail(domainError(ErrorCodes.CONFLICT, 'La alerta ya está cerrada', 409)))
    const wrapper = await complete(completed({ alertId: '1', status: 'nueva' }))

    await wrapper.find('[data-test="alert-proposal-comment"]').setValue('Texto importante')
    await wrapper.find('[data-test="alert-proposal-accept"]').trigger('click')
    await settle(); await settle()

    expect(wrapper.find('[data-test="alert-proposal-error"]').text()).toContain('ya está cerrada')
    expect((wrapper.find('[data-test="alert-proposal-comment"]').element as HTMLTextAreaElement).value).toBe('Texto importante')
    expect(onChanged).not.toHaveBeenCalled()
  })

  it('sin alerta propuesta no se propone nada y se avisa del cambio', async () => {
    const wrapper = await complete(completed(null))

    expect(wrapper.find('[data-test="alert-proposal"]').exists()).toBe(false)
    expect(onChanged).toHaveBeenCalledTimes(1)
  })
})
