import { reactive } from 'vue'
import type { PickablePlant } from './useTaskDestination'
import type { Task, TaskType } from '../types/task.types'

/** Lo que precarga el formulario al **crear** una tarea desde otro sitio: un día, una planta, una localización. */
export interface TaskInitial {
  type?: TaskType
  title?: string
  dueFrom?: string
  locationId?: string
  plants?: PickablePlant[]
}

export type CloseMode = 'skip' | 'cancel'

/**
 * Qué diálogo de tarea está abierto y para qué tarea. Lo comparten la pantalla de tareas, las fichas
 * y el Dashboard: cada uno abre lo que necesita y avisa a quien lo montó cuando algo **cambió**, para
 * que recargue lo suyo.
 *
 * Es solo estado: los diálogos hacen su trabajo con sus propios composables.
 */
export function useTaskWorkflow(onChanged: () => void | Promise<void> = () => {}) {
  const editor = reactive({ open: false, task: null as Task | null, initial: null as TaskInitial | null })
  const completion = reactive({ open: false, task: null as Task | null })
  const reschedule = reactive({ open: false, task: null as Task | null })
  const closing = reactive({ open: false, task: null as Task | null, mode: 'skip' as CloseMode })

  const openCreate = (initial: TaskInitial | null = null) => {
    editor.task = null
    editor.initial = initial
    editor.open = true
  }

  const openEdit = (task: Task) => {
    editor.task = task
    editor.initial = null
    editor.open = true
  }

  const openComplete = (task: Task) => {
    completion.task = task
    completion.open = true
  }

  const openReschedule = (task: Task) => {
    reschedule.task = task
    reschedule.open = true
  }

  const openClose = (task: Task, mode: CloseMode) => {
    closing.task = task
    closing.mode = mode
    closing.open = true
  }

  /** El menú de acciones de la fila: su `id` decide el diálogo. */
  function act(task: Task, action: string) {
    if (action === 'edit') openEdit(task)
    else if (action === 'reschedule') openReschedule(task)
    else if (action === 'skip') openClose(task, 'skip')
    else if (action === 'cancel') openClose(task, 'cancel')
  }

  function closeAll() {
    editor.open = false
    completion.open = false
    reschedule.open = false
    closing.open = false
  }

  /** Algo cambió: se cierra todo y se avisa a quien montó el flujo. */
  async function changed() {
    closeAll()
    await onChanged()
  }

  return { editor, completion, reschedule, closing, openCreate, openEdit, openComplete, openReschedule, openClose, act, closeAll, changed }
}

export type TaskWorkflow = ReturnType<typeof useTaskWorkflow>
