import { describe, expect, it } from 'vitest'
import type { Alert } from '../types/alert.types'
import {
  alertSubject,
  closedText,
  detectedText,
  severityLevel,
  severityMarkLevel,
  taskInitialFromAlert,
} from './alert.mapper'

const TODAY = '2026-10-07'

const plantAlert = (over: Partial<Alert> = {}): Alert => ({
  id: '1', source: 'medicion', category: 'temperatura', severity: 'critica', status: 'nueva',
  reason: 'Temperatura 4 °C por debajo del mínimo de 10 °C',
  detectedAt: '2026-10-07T08:00:00Z', lastDetectedAt: '2026-10-07T08:00:00Z', occurrences: 1,
  plant: {
    id: '5', code: 'CAT-FEROC-08', nickname: 'Pelona', speciesName: 'Ferocactus gracilis',
    locationName: 'B1', locationPath: 'Invernadero 2 / B1',
  },
  ...over,
})

describe('alertSubject', () => {
  it('una planta se muestra con su código y su especie, y lleva a su ficha', () => {
    expect(alertSubject(plantAlert())).toEqual({
      kind: 'plant', label: 'CAT-FEROC-08', detail: 'Ferocactus gracilis', to: '/plants/5', where: 'Invernadero 2 / B1',
    })
  })

  it('una localización se muestra con su nombre y su ruta, y lleva a su ficha', () => {
    const alert = plantAlert({ plant: null, location: { id: '9', name: 'Bancada norte', path: 'Invernadero 1 / Bancada norte' } })

    expect(alertSubject(alert)).toEqual({
      kind: 'location', label: 'Bancada norte', detail: '', to: '/locations/9', where: 'Invernadero 1 / Bancada norte',
    })
  })
})

describe('detectedText', () => {
  it('dice la última detección con la fecha de referencia recibida', () => {
    expect(detectedText(plantAlert(), TODAY)).toBe('Detectada hoy')
    expect(detectedText(plantAlert({ lastDetectedAt: '2026-10-06T22:00:00Z' }), TODAY)).toBe('Detectada ayer')
    expect(detectedText(plantAlert({ lastDetectedAt: '2026-10-02T10:00:00Z' }), TODAY)).toBe('Detectada hace 5 días')
  })

  it('cuando se repitió, dice cuántas veces y cuándo fue la última', () => {
    const alert = plantAlert({ occurrences: 4, lastDetectedAt: '2026-10-05T10:00:00Z' })

    expect(detectedText(alert, TODAY)).toBe('Detectada 4 veces · última hace 2 días')
  })
})

describe('closedText', () => {
  it('una abierta no dice nada', () => {
    expect(closedText(plantAlert())).toBeNull()
  })

  it('una resuelta dice cuándo y con qué comentario', () => {
    const alert = plantAlert({ status: 'resuelta', closedAt: '2026-10-06T10:00:00Z', resolutionComment: 'Cambiada de sitio' })

    expect(closedText(alert)).toEqual({ headline: 'Resuelta el 6 oct', comment: 'Cambiada de sitio' })
  })

  it('una descartada se distingue de una resuelta por su texto', () => {
    const alert = plantAlert({ status: 'descartada', closedAt: '2026-10-06T10:00:00Z' })

    expect(closedText(alert)).toEqual({ headline: 'Descartada el 6 oct', comment: null })
  })
})

describe('severidad', () => {
  it('cada nivel tiene su marca y la crítica no comparte la de las demás', () => {
    expect(new Set([severityMarkLevel('critica'), severityMarkLevel('media'), severityMarkLevel('baja')]).size).toBe(3)
  })

  it('se traduce al nivel de prioridad del kit', () => {
    expect(severityLevel('critica')).toBe('immediate')
    expect(severityLevel('media')).toBe('soon')
    expect(severityLevel('baja')).toBe('routine')
  })
})

describe('taskInitialFromAlert', () => {
  it('una alerta de temperatura de una planta precompleta una tarea «otra» sobre esa planta', () => {
    const initial = taskInitialFromAlert(plantAlert())

    expect(initial).toMatchObject({
      type: 'otra',
      title: 'Revisar temperatura de CAT-FEROC-08',
      priority: 'alta',
      originAlertId: '1',
      plants: [{ id: '5', code: 'CAT-FEROC-08', nickname: 'Pelona' }],
    })
    expect(initial.locationId).toBeUndefined()
  })

  it('el riego se convierte en una tarea de riego', () => {
    const initial = taskInitialFromAlert(plantAlert({ category: 'riego', severity: 'baja' }))

    expect(initial).toMatchObject({ type: 'riego', title: 'Regar CAT-FEROC-08', priority: 'baja' })
  })

  it('el seguimiento es una revisión', () => {
    expect(taskInitialFromAlert(plantAlert({ category: 'seguimiento', severity: 'media' }))).toMatchObject({
      type: 'otra', title: 'Revisar CAT-FEROC-08', priority: 'normal',
    })
  })

  it('una incidencia de otra categoría usa su motivo como título, recortado', () => {
    const reason = 'x'.repeat(200)
    const initial = taskInitialFromAlert(plantAlert({ category: 'otra', reason }))

    expect(initial.title!.length).toBeLessThanOrEqual(80)
    expect(initial.title!.startsWith('Atender: ')).toBe(true)
  })

  it('una alerta de localización dirige la tarea a la localización', () => {
    const alert = plantAlert({ plant: null, location: { id: '9', name: 'Bancada norte', path: 'Invernadero 1 / Bancada norte' } })

    const initial = taskInitialFromAlert(alert)

    expect(initial.locationId).toBe('9')
    expect(initial.plants).toBeUndefined()
  })
})
