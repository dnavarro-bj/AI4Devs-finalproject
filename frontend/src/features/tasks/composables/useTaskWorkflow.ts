import { reactive } from 'vue'
import type { PickablePlant } from './useTaskDestination'
import type { Task, TaskPriority, TaskType } from '../types/task.types'

/** Lo que precarga el formulario al **crear** una tarea desde otro sitio: un día, una planta, una localización. */
export interface TaskInitial {
  type?: TaskType
  title?: string
  priority?: TaskPriority
  /** Si nace de una alerta, el formulario la lleva en el cuerpo; el alta no la resuelve. */
  originAlertId?: string
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
  /** La propuesta de resolver la alerta de una tarea recién completada: ya no hay tarea que mostrar. */
  const proposal = reactive({ open: false, alertId: null as string | null })

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

  /**
   * Una tarea se completó. Si nació de una alerta que sigue abierta, **se propone resolverla** antes de
   * dar el flujo por terminado; si no, el flujo termina como con cualquier otro cambio.
   */
  async function completed(task: Task) {
    const suggestion = task.suggestedAlertResolution
    if (!suggestion) return changed()
    completion.open = false
    proposal.alertId = suggestion.alertId
    proposal.open = true
  }

  /** La propuesta se respondió —aceptada o declinada—: se cierra y el flujo termina. */
  async function proposalAnswered() {
    proposal.open = false
    await changed()
  }

  function closeAll() {
    editor.open = false
    completion.open = false
    reschedule.open = false
    closing.open = false
    proposal.open = false
  }

  /** Algo cambió: se cierra todo y se avisa a quien montó el flujo. */
  async function changed() {
    closeAll()
    await onChanged()
  }

  return { editor, completion, reschedule, closing, proposal, openCreate, openEdit, openComplete, openReschedule, openClose, act, closeAll, changed, completed, proposalAnswered }
}

export type TaskWorkflow = ReturnType<typeof useTaskWorkflow>
