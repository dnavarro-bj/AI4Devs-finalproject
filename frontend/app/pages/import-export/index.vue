<script setup lang="ts">
/**
 * Importar y exportar (§19), con la composición de la pantalla `transfer` del prototipo: cabecera
 * con la **frescura de la última copia**, dos paneles lado a lado —**importar datos** y **preparar
 * exportación**— y debajo la **actividad reciente**.
 *
 * La importación es un asistente de tres pasos con el progreso visible. La validación enseña cuántas
 * filas están listas, con avisos y con errores, y **mientras haya errores no se puede aplicar**: la
 * regla vive en el composable, no en un botón deshabilitado. Ningún dato se descarta en silencio.
 *
 * **Simulación, y declarada.** No sube, no descarga y no toca el inventario. Ningún ticket del
 * backlog recoge esto, así que se marca «sin ticket»; lo que sí tiene dueño —exportar el filtro
 * (T-21), el código y el QR de las etiquetas (T-15)— lleva el suyo.
 */
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'
import { usePendingAction } from '@shared/composables/usePendingAction'
import { useTransfer } from '@features/transfer/composables/useTransfer'
import type { ExportContent } from '@features/transfer/types/transfer.types'

useHead({ title: 'Cactify · Importar / exportar' })
useBreadcrumbs().set([{ label: 'Importar / exportar' }])

const transfer = useTransfer()
const {
  step, review, errorCount, readyCount, rows, backup, activity,
  content, format, encoding, includeHistory, includePhotos, estimate, generated, fileName,
} = transfer

const pendingAction = usePendingAction()

onMounted(transfer.load)

const STEPS = ['Archivo', 'Validación', 'Aplicar']
const currentStep = computed(() => ({ file: 0, review: 1, complete: 2 })[step.value])

/** Lo que cada contenido espera de otro ticket va **en su opción**, no en una nota aparte. */
const contentOptions = [
  { value: 'full', label: 'Inventario completo', description: 'Todas las plantas y sus relaciones' },
  { value: 'filtered', label: 'Plantas filtradas', description: 'El último filtro guardado · lo habilita T-21' },
  { value: 'labels', label: 'Etiquetas físicas', description: 'Código y QR para las macetas · lo habilita T-15' },
]

const formatOptions = [
  { value: 'csv', label: 'CSV · datos tabulares' },
  { value: 'xlsx', label: 'XLSX · hoja de cálculo' },
  { value: 'pdf', label: 'PDF · etiquetas para imprimir' },
]

const encodingOptions = [
  { value: 'utf-8', label: 'UTF-8' },
  { value: 'utf-8-bom', label: 'UTF-8 con BOM' },
]

const resultTone = { valid: 'ok', warning: 'warning', error: 'danger' } as const
const resultLabel = { valid: 'Válida', warning: 'Aviso', error: 'Error' } as const

const columns = [
  { key: 'row', label: 'Fila' },
  { key: 'code', label: 'Código' },
  { key: 'species', label: 'Especie' },
  { key: 'location', label: 'Localización' },
  { key: 'result', label: 'Resultado' },
]
</script>

<template>
  <section>
    <UiPageHeader
      title="Importar / exportar"
      context="Mueve datos de forma controlada y conserva una copia utilizable fuera de Cactify."
    >
      <template #actions>
        <div v-if="backup" class="freshness" data-test="backup-freshness">
          <strong>Última copia: {{ backup.when }}</strong>
          <small>{{ backup.scope }} · {{ backup.format }} · {{ backup.plants }} plantas</small>
          <UiButton variant="text" @click="pendingAction('Descargar la última copia', 'sin ticket')">Descargar</UiButton>
        </div>
      </template>
    </UiPageHeader>

    <MockNotice ticket="sin ticket" what="importación, exportación y actividad" />
    <UiNotice severity="info" title="Es una simulación" data-test="simulation-notice">
      No se sube, no se descarga y no se modifica nada del inventario.
    </UiNotice>

    <div class="layout">
      <UiPanel title="Importar datos" data-test="import-panel">
        <UiStepper :steps="STEPS" :current="currentStep" label="Progreso de importación" data-test="import-stepper" />

        <div v-if="step === 'file'" class="stage" data-test="stage-file">
          <UiUploadArea
            label="Elegir un CSV"
            accept=".csv"
            hint="UTF-8 · hasta 10 MB · una fila por registro"
            :multiple="false"
            @files="transfer.useSample"
          />
          <UiButton variant="secondary" data-test="use-sample" @click="transfer.useSample">
            Usar archivo de ejemplo
          </UiButton>
          <p class="note">El archivo que elijas no se lee: la revisión usa siempre el de ejemplo.</p>
        </div>

        <div v-else-if="step === 'review' && review" class="stage" data-test="stage-review">
          <UiFileItem
            :name="review.fileName"
            :size="`${review.rows} filas · ${review.size}`"
            kind="CSV"
          />
          <UiButton variant="text" data-test="reset-import" @click="transfer.reset">Cambiar archivo</UiButton>

          <div class="validation" data-test="validation-summary">
            <div><strong>{{ readyCount }}</strong><span>Listas para importar</span></div>
            <div><strong>{{ review.warnings }}</strong><span>Con avisos</span></div>
            <div><strong>{{ errorCount }}</strong><span>Con errores</span></div>
          </div>

          <UiNotice
            v-if="errorCount > 0"
            severity="danger"
            :title="`Corrige ${errorCount} filas antes de continuar`"
            data-test="import-blocker"
          >
            Ninguna fila se descarta: puedes descargar solo los errores y volver a cargar el archivo corregido.
            <template #action>
              <UiButton variant="secondary" data-test="fix-import" @click="transfer.fixErrors">Simular corrección</UiButton>
            </template>
          </UiNotice>

          <div data-test="import-preview">
            <UiTable :columns="columns" :rows="rows" row-key="row">
              <template #cell-code="{ row }"><code>{{ row.code }}</code></template>
              <template #cell-result="{ row }">
                <UiStatus :tone="resultTone[row.result as keyof typeof resultTone]">
                  {{ row.reason || resultLabel[row.result as keyof typeof resultLabel] }}
                </UiStatus>
              </template>
            </UiTable>
            <p class="note">Se muestran las filas con errores y las primeras con avisos.</p>
          </div>

          <div class="actions">
            <UiButton variant="text" data-test="download-errors" @click="pendingAction('Descargar errores.csv', 'sin ticket')">
              Descargar errores.csv
            </UiButton>
            <span>{{ errorCount > 0 ? `${errorCount} errores bloquean la importación.` : 'Sin errores: ya se puede importar.' }}</span>
            <UiButton data-test="apply-import" :disabled="errorCount > 0" @click="transfer.apply">
              Importar {{ review.rows }} filas
            </UiButton>
          </div>
        </div>

        <div v-else class="stage" data-test="import-complete">
          <h3>Importación completada</h3>
          <p>Simulación terminada: no se ha creado ninguna planta ni se ha sobrescrito ningún registro.</p>
          <UiButton variant="secondary" @click="transfer.reset">Importar otro archivo</UiButton>
        </div>
      </UiPanel>

      <UiPanel title="Preparar exportación" data-test="export-panel">
        <form class="export" @submit.prevent>
          <UiChoiceCards
            :model-value="content"
            label="Contenido"
            :options="contentOptions"
            :columns="1"
            @update:model-value="transfer.selectContent($event as ExportContent)"
          />
          <UiField v-model="format" label="Formato" as="select" :options="formatOptions" />
          <UiField v-model="encoding" label="Codificación" as="select" :options="encodingOptions" />
          <UiSwitch v-model="includeHistory" label="Incluir historial de cuidados y movimientos" />
          <UiSwitch v-model="includePhotos" label="Incluir enlaces a las fotografías" />

          <p class="estimate"><span>Archivo estimado</span> <strong>{{ estimate }}</strong></p>

          <UiButton data-test="generate-export" @click="transfer.generate">Generar exportación</UiButton>

          <div v-if="generated" class="result" data-test="export-result">
            <strong>{{ fileName }}</strong>
            <small>Simulación: no se ha generado ningún archivo.</small>
          </div>
        </form>
      </UiPanel>
    </div>

    <UiPanel title="Actividad reciente" data-test="recent-activity">
      <ul class="activity">
        <li v-for="entry in activity" :key="entry.id">
          <span><strong>{{ entry.title }}</strong><small>{{ entry.detail }}</small></span>
          <time>{{ entry.when }}</time>
          <UiStatus :tone="entry.tone">{{ entry.status }}</UiStatus>
        </li>
      </ul>
    </UiPanel>
  </section>
</template>

<style scoped>
.layout {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  margin: var(--space-4) 0;
}

.stage,
.export {
  display: grid;
  gap: var(--space-3);
  margin-top: var(--space-3);
}

.freshness {
  display: grid;
  font-size: var(--font-size-12);
}

.freshness small,
.note {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  margin: 0;
}

.validation {
  display: grid;
  gap: var(--space-3);
  grid-template-columns: repeat(3, 1fr);
}

.validation div {
  display: grid;
}

.validation strong {
  font-size: var(--font-size-24);
}

.actions {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  justify-content: space-between;
}

.estimate {
  display: flex;
  gap: var(--space-2);
  margin: 0;
}

.result {
  display: grid;
}

.activity {
  display: grid;
  gap: var(--space-3);
  list-style: none;
  margin: 0;
  padding: 0;
}

.activity li {
  align-items: center;
  display: grid;
  gap: var(--space-3);
  grid-template-columns: 1fr auto auto;
}

.activity small {
  color: var(--color-ink-muted);
  display: block;
}
</style>
