/**
 * DATOS DE EJEMPLO — LOS REEMPLAZA T-23 BORRANDO ESTE FICHERO ENTERO.
 *
 * No hay entidad alerta con ciclo de vida ni endpoint. Estas alertas permiten fijar la composición
 * de la bandeja y del panel del Dashboard sin esperar al backend. Los identificadores de planta
 * son inventados: la ficha a la que llevan puede no existir en la base de datos real.
 *
 * Nadie más debe importarlo: solo el service de `alerts`.
 */
import type { Alert } from '../types/alert.types'

export const USE_MOCK_ALERTS = true

export const ALERTS_MOCK: Alert[] = [
  { id: 'a1', kind: 'Temperatura', severity: 'critical', state: 'new', title: 'Temperatura por debajo del mínimo', plantId: '882687672222443001', plantCode: 'CAT-FEROC-08', speciesName: 'Ferocactus gracilis', location: 'Invernadero 2 / B1', detected: 'Hace 32 min' },
  { id: 'a2', kind: 'Seguimiento', severity: 'medium', state: 'new', title: 'Sin observaciones durante 43 días', plantId: '882687672222443002', plantCode: 'CAT-GRUSS-01', speciesName: 'Echinocactus grusonii', location: 'Invernadero 1 / A3', detected: 'Ayer' },
  { id: 'a3', kind: 'Humedad', severity: 'medium', state: 'reviewed', title: 'Humedad fuera del rango efectivo', plantId: '882687672222443003', plantCode: 'CAT-ASTRO-12', speciesName: 'Astrophytum asterias', location: 'Invernadero 1 / A3', detected: 'Ayer' },
  { id: 'a4', kind: 'Riego', severity: 'low', state: 'new', title: 'Riego retrasado respecto a la pauta', plantId: '882687672222443004', plantCode: 'CAT-MAMMI-07', speciesName: 'Mammillaria bocasana', location: 'Zona exterior', detected: 'Hace 3 días' },
  { id: 'a5', kind: 'Temperatura', severity: 'critical', state: 'resolved', title: 'Temperatura por encima del máximo', plantId: '882687672222443005', plantCode: 'CAT-ARIO-02', speciesName: 'Ariocarpus fissuratus', location: 'Invernadero 2 / B2', detected: 'Hace 9 días' },
  { id: 'a6', kind: 'Seguimiento', severity: 'low', state: 'dismissed', title: 'Sin observaciones durante 31 días', plantId: '882687672222443006', plantCode: 'CAT-SCHLUM-03', speciesName: 'Schlumbergera truncata', location: 'Invernadero 1 / A1', detected: 'Hace 12 días' },
]
