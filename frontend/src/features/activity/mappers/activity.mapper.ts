import type { SignalListItem } from '@ui/UiSignalList.vue'
import { plural } from '@shared/utils/plural'
import { relativeDay } from '@shared/utils/relativeDay'
import { INTERVENTION_LABELS } from '@features/timeline/mappers/timeline.mapper'
import type { ActivityBatchAction, ActivityEntry } from '../types/activity.types'

/**
 * Del feed del API a lo que pinta el panel «Actividad reciente». Funciones puras: la fecha de
 * referencia entra por parámetro (ningún componente consulta el reloj).
 */

const BATCH_ACTION_LABELS: Record<ActivityBatchAction, string> = {
  lectura: 'Lectura',
  intervencion: 'Intervención',
  comentario: 'Comentario',
}

const plants = (count: number) => plural(count, 'planta', 'plantas')

/** Una línea del panel: un lote es **una** línea, no una por planta. */
export function activityLine(entry: ActivityEntry, today: string): SignalListItem {
  const trailing = relativeDay(entry.occurredAt, today)
  const plantTo = entry.plant ? `/plants/${entry.plant.id}` : undefined

  switch (entry.type) {
    case 'lote': {
      const batch = entry.batch
      const label = batch ? BATCH_ACTION_LABELS[batch.action] ?? batch.action : 'Lote'
      return { id: entry.id, title: batch ? `${label} en ${plants(batch.plantCount)}` : label, trailing }
    }
    case 'tarea': {
      const task = entry.task
      return {
        id: entry.id,
        title: task?.title ?? 'Tarea completada',
        detail: task ? `Tarea completada · ${plants(task.affectedPlants)}` : 'Tarea completada',
        trailing,
      }
    }
    case 'comentario': {
      const excerpt = entry.comment?.excerpt?.trim()
      return {
        id: entry.id,
        title: entry.plant?.code ?? 'Comentario',
        detail: excerpt ? `Comentario · ${excerpt}` : 'Comentario',
        to: plantTo,
        trailing,
      }
    }
    case 'intervencion': {
      const type = entry.intervention?.type
      const label = type ? INTERVENTION_LABELS[type as keyof typeof INTERVENTION_LABELS] ?? type : null
      return {
        id: entry.id,
        title: entry.plant?.code ?? 'Intervención',
        detail: label ? `Intervención · ${label}` : 'Intervención',
        to: plantTo,
        trailing,
      }
    }
    default:
      // Un tipo nuevo del API no se descarta: se enseña con su valor crudo.
      return { id: entry.id, title: entry.type, trailing }
  }
}
