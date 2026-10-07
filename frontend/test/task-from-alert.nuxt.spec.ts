import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { settle } from './helpers/apiDouble'
import TaskForm from '../src/features/tasks/components/TaskForm.vue'
import type { Task } from '../src/features/tasks/types/task.types'

/** Escenario «Crear una tarea desde una alerta»: el formulario lleva `originAlertId` solo al crear. */
enableAutoUnmount(afterEach)

const base = {
  today: '2026-10-07',
  locationOptions: [], locationCount: () => null, plantResults: [], plantQuery: '',
}

const plant = { id: '5', code: 'CAT-FEROC-08', nickname: 'Pelona', detail: 'Ferocactus gracilis · B1' }

beforeEach(() => vi.clearAllMocks())

describe('formulario de tarea desde una alerta', () => {
  it('precarga tipo, título, prioridad y destino y envía el origen', async () => {
    const wrapper = await mountSuspended(TaskForm, {
      props: { ...base, initial: { type: 'otra', title: 'Revisar temperatura de CAT-FEROC-08', priority: 'alta', plants: [plant], originAlertId: '1' } },
    })
    await settle()

    expect((wrapper.find('[data-test="task-title"]').element as HTMLInputElement).value).toBe('Revisar temperatura de CAT-FEROC-08')
    expect((wrapper.find('[data-test="task-priority"]').element as HTMLSelectElement).value).toBe('alta')

    await wrapper.find('[data-test="task-form"]').trigger('submit')

    expect(wrapper.emitted('submit')![0]![0]).toMatchObject({
      type: 'otra', priority: 'alta', originAlertId: '1', plantIds: ['5'],
    })
  })

  it('una tarea manual no manda ningún origen', async () => {
    const wrapper = await mountSuspended(TaskForm, {
      props: { ...base, initial: { title: 'Regar', plants: [plant] } },
    })

    await wrapper.find('[data-test="task-form"]').trigger('submit')

    expect(wrapper.emitted('submit')![0]![0]).not.toHaveProperty('originAlertId')
  })

  it('editar una tarea no reescribe su origen', async () => {
    const task = {
      id: '9', type: 'otra', title: 'Revisar', priority: 'alta', status: 'pendiente', dueFrom: '2026-10-07', dueTo: '2026-10-07',
      origin: 'alerta', originAlertId: '1', target: { kind: 'plants', plantCount: 1, plants: [plant] },
      createdAt: '', updatedAt: '',
    } as Task
    const wrapper = await mountSuspended(TaskForm, {
      props: { ...base, task, initial: { originAlertId: '1' } },
    })

    await wrapper.find('[data-test="task-form"]').trigger('submit')

    expect(wrapper.emitted('submit')![0]![0]).not.toHaveProperty('originAlertId')
  })
})
