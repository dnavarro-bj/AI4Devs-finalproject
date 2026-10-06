/**
 * DATOS DE EJEMPLO — LOS REEMPLAZA T-22 BORRANDO ESTE FICHERO ENTERO.
 *
 * No hay entidad tarea ni endpoint. Estas tareas permiten fijar la composición de la agenda, el
 * calendario y las completadas sin esperar al backend, y están fechadas **respecto al día de la
 * fecha de referencia** (`shared/mocks/referenceDate.mock.ts`: 3 de septiembre de 2026).
 *
 * Los tipos y campos son provisionales: las preguntas 14 a 18 del §24 siguen abiertas.
 *
 * Nadie más debe importarlo: solo el service de `tasks`.
 */
import type { Task } from '../types/task.types'

export const USE_MOCK_TASKS = true

export const TASKS_MOCK: Task[] = [
  { id: 't1', type: 'root-pruning', title: 'Revisar raíces antes del trasplante', target: '4 plantas', location: 'Invernadero 1', due: '2026-08-31', time: null, priority: 'high', status: 'pending' },
  { id: 't2', type: 'other', title: 'Revisar CAT-GRUSS-01', target: 'Asiento de suegra · Bandeja A3', location: 'Invernadero 1', due: '2026-09-01', time: null, priority: 'normal', status: 'pending' },
  { id: 't3', type: 'watering', title: 'Regar bandejas A3 y A4', target: '31 plantas', location: 'Invernadero 1', due: '2026-09-03', time: '09:00', priority: 'high', status: 'pending' },
  { id: 't4', type: 'repotting', title: 'Revisar ejemplares marcados', target: '6 plantas · selección guardada', location: 'Invernadero 1', due: '2026-09-03', time: null, priority: 'normal', status: 'pending' },
  { id: 't5', type: 'sun-protection', title: 'Instalar sombreo temporal', target: 'Bancada sur', location: 'Invernadero 2', due: '2026-09-04', time: '08:30', priority: 'normal', status: 'pending' },
  { id: 't6', type: 'watering', title: 'Riego de la zona exterior', target: '407 plantas', location: 'Zona exterior', due: '2026-09-08', time: null, priority: 'normal', status: 'pending' },
  { id: 't7', type: 'other', title: 'Revisión de ejemplares nuevos', target: '8 plantas', location: 'Invernadero 1', due: '2026-09-10', time: null, priority: 'normal', status: 'pending' },
  { id: 't8', type: 'repotting', title: 'Cambio de maceta de los Mammillaria', target: '12 plantas', location: 'Invernadero 2', due: '2026-09-15', time: null, priority: 'normal', status: 'pending' },
  { id: 't9', type: 'watering', title: 'Riego de la bandeja A3', target: '24 plantas', location: 'Invernadero 1', due: '2026-09-23', time: null, priority: 'normal', status: 'pending' },
  { id: 't10', type: 'watering', title: 'Regar la bancada norte', target: '183 plantas', location: 'Invernadero 1', due: '2026-09-01', time: '09:00', priority: 'normal', status: 'completed' },
  { id: 't11', type: 'cold-protection', title: 'Cubrir las plantas sensibles al frío', target: '12 plantas', location: 'Invernadero 2', due: '2026-08-30', time: null, priority: 'high', status: 'completed' },
]
