import { computed, ref } from 'vue'
import { SETTINGS_MOCK } from '../mocks/settings.mock'
import type { SettingsScope, SettingsValues } from '../types/settings.types'

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

/** Ejemplo de código con una especie de muestra; el número es el primero de la serie. */
const SAMPLE_SPECIES = 'GRUSS'

/**
 * El caso de uso de la configuración: un estado por ámbito y «sucio» **calculado**.
 *
 * Un solo estado para los cinco ámbitos, y el panel visible es solo una vista: cambiar de ámbito
 * no pierde lo editado en otro. «Hay cambios sin guardar» se calcula comparando con lo último
 * guardado, no se marca a mano al editar: si el usuario devuelve un campo a su valor, deja de haber
 * cambio.
 *
 * **No persiste.** Guardar solo actualiza la referencia en memoria: no hay ticket ni endpoint, y la
 * pantalla lo dice.
 */
export function useSettings() {
  const values = ref<SettingsValues>(clone(SETTINGS_MOCK))
  const saved = ref<SettingsValues>(clone(SETTINGS_MOCK))
  const scope = ref<SettingsScope>('collection')

  const dirty = computed(() => JSON.stringify(values.value) !== JSON.stringify(saved.value))

  function save() {
    saved.value = clone(values.value)
  }

  /** La vista previa del código: prefijo + código de especie + número correlativo. */
  const codePreview = computed(() => {
    const { prefix, digits, separator } = values.value.codes
    return [prefix, SAMPLE_SPECIES, '1'.padStart(Number(digits), '0')].join(separator)
  })

  return { values, scope, dirty, save, codePreview }
}
