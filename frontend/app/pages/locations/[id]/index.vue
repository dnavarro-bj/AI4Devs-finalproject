<script setup lang="ts">
/**
 * La ficha de una localización, con la composición de la pantalla `location-detail` del prototipo:
 * portada con la marca del espacio, su identidad y sus acciones; **fila de métricas**; columna
 * principal con lo que contiene y los ejemplares que alberga; y columna lateral con las
 * características, el próximo trabajo y los últimos movimientos.
 *
 * **Híbrida, y marcada.** Real: el nombre, cuántos ejemplares alberga y cuáles son —con el filtro
 * por localización que existe desde T-02—. Lo que el prototipo enseña y el API todavía no sirve
 * —la jerarquía y la ruta completa, las características del espacio, los movimientos y las tareas
 * del lugar— declara su ticket **en la pantalla**: un árbol de localizaciones inventado es
 * indistinguible de uno que funciona.
 *
 * La ficha muestra la primera página de ejemplares y enlaza al inventario filtrado para el resto,
 * que es donde viven la ordenación y las columnas.
 */
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'
import { useCatalogs } from '@features/catalogs/composables/useCatalogs'
import { usePlants } from '@features/plants/composables/usePlants'
import { isNotFound } from '@shared/services/errorNormalizer'
import type { LocationDetail } from '@features/catalogs/types/catalog.types'
import type { PlantSummary } from '@features/plants/types/plant.types'
import type { DomainError, PageResponse } from '@shared/types/api.types'

const route = useRoute()
const id = String(route.params.id)

const { locationDetail, renameLocation, removeLocation } = useCatalogs()
const { list: listPlants } = usePlants()
const { set: setBreadcrumbs } = useBreadcrumbs()

const location = ref<LocationDetail | null>(null)
const plants = ref<PageResponse<PlantSummary> | null>(null)
const loading = ref(true)
const error = ref<DomainError | null>(null)

const renaming = ref(false)
const newName = ref('')
const savingName = ref(false)
const renameError = ref<string | null>(null)

const confirming = ref(false)
const removing = ref(false)
const removeError = ref<string | null>(null)

setBreadcrumbs([
  { label: 'Localizaciones', to: '/locations' },
  { label: 'Ficha de localización' },
])

const notFound = computed(() => !loading.value && isNotFound(error.value))

const plantCount = computed(() => location.value?.plantCount ?? 0)
const isEmpty = computed(() => plantCount.value === 0)
const canRemove = computed(() => isEmpty.value)

/** El inventario filtrado por esta localización: el filtro existe desde T-02. */
const filteredInventory = computed(() => `/plants?location=${id}`)

const COLUMNS = [
  { key: 'plant', label: 'Planta' },
  { key: 'species', label: 'Especie' },
  { key: 'status', label: 'Estado' },
]

async function load() {
  loading.value = true
  error.value = null

  const [detail, page] = await Promise.all([locationDetail(id), listPlants({ location: id })])
  loading.value = false

  if (!detail.success) {
    error.value = detail.error
    return
  }
  location.value = detail.data!
  if (page.success) plants.value = page.data!

  setBreadcrumbs([
    { label: 'Localizaciones', to: '/locations' },
    { label: detail.data!.name },
  ])
  useHead({ title: `Cactify · ${detail.data!.name}` })
}

function openRename() {
  newName.value = location.value?.name ?? ''
  renameError.value = null
  renaming.value = true
}

/** El mensaje del API se prefiere al nuestro: lo escribe quien conoce la regla. */
async function submitRename() {
  savingName.value = true
  renameError.value = null

  const result = await renameLocation(id, newName.value)
  savingName.value = false

  if (!result.success) {
    renameError.value = result.error!.message || 'No se ha podido corregir el nombre.'
    return
  }

  renaming.value = false
  if (location.value) location.value = { ...location.value, name: result.data!.name }
  setBreadcrumbs([
    { label: 'Localizaciones', to: '/locations' },
    { label: result.data!.name },
  ])
}

/**
 * El `409` se traduce **aquí** y no en el service: el código es del transporte y el mensaje es del
 * dominio de esta pantalla. La carrera con un alta simultánea existe —de ahí que el conflicto se
 * muestre aunque la ficha diga cero—, y por eso el error del API tiene la última palabra.
 */
async function confirmRemoval() {
  removing.value = true
  removeError.value = null

  const result = await removeLocation(id)
  removing.value = false

  if (!result.success) {
    removeError.value = result.error!.message
      || 'No se puede retirar mientras albergue ejemplares.'
    confirming.value = false
    return
  }

  confirming.value = false
  await navigateTo('/locations')
}

// Ya montada, no en `setup`: la URL del API solo es válida en el navegador (ADR-013).
onMounted(load)

const asPlant = (row: unknown) => row as PlantSummary
</script>

<template>
  <section>
    <p v-if="loading" data-test="loading" role="status">Cargando la localización…</p>

    <UiEmptyState
      v-else-if="notFound"
      title="Esta localización no existe"
      data-test="not-found"
      mark="◌"
    >
      Puede que se haya retirado del catálogo.
      <template #action>
        <UiButton to="/locations">Volver al catálogo</UiButton>
      </template>
    </UiEmptyState>

    <UiInlineError v-else-if="error" data-test="error">{{ error.message }}</UiInlineError>

    <template v-else-if="location">
      <UiEntityHero
        :title="location.name"
        subtitle="Localización de la colección"
        data-test="location-hero"
      >
        <template #visual>
          <span class="hero-mark" aria-hidden="true">⌖</span>
        </template>
        <template #identity>
          <UiStatus :tone="isEmpty ? 'neutral' : 'ok'">
            {{ isEmpty ? 'Vacía' : 'En uso' }}
          </UiStatus>
          <!-- El código estable del espacio (LOC-I1-BN en el prototipo) es T-15. -->
          <code class="hero-code" data-mock="true" data-test="space-code">LOC-··· <small>T-15</small></code>
        </template>
        <template #context>
          <p class="hero-path" data-mock="true" data-test="location-path">
            La ruta completa dentro del vivero —zona, bancada, bandeja— llega con
            <strong>T-18</strong>: hoy la localización no tiene padre.
          </p>
        </template>
        <template #actions>
          <UiButton data-test="rename-location" @click="openRename">Corregir nombre</UiButton>
          <UiButton variant="secondary" data-test="remove-location" @click="confirming = true">
            Retirar
          </UiButton>
        </template>
      </UiEntityHero>

      <UiInlineError v-if="removeError" class="hero-error" data-test="remove-error">
        {{ removeError }}
      </UiInlineError>

      <!--
        La fila de métricas del prototipo. Solo la primera tiene dato; las otras tres se muestran
        marcadas y en su sitio, para que su ticket rellene un hueco previsto en vez de rehacer
        el layout.
      -->
      <div class="metrics" data-test="location-metrics">
        <UiStatTile
          :value="plantCount"
          label="Plantas"
          :context="isEmpty ? 'Ninguna aquí todavía' : 'En esta localización'"
          :to="filteredInventory"
          data-test="plant-count"
        />
        <UiStatTile value="—" label="Sublocalizaciones" context="Jerarquía · T-18" data-mock="true" data-test="metric-children" />
        <UiStatTile value="—" label="Tareas" context="Trabajo del lugar · T-22" data-mock="true" data-test="metric-tasks" />
        <UiStatTile value="—" label="Alertas" context="Incidencias · T-23" data-mock="true" data-test="metric-alerts" />
      </div>

      <UiDetailLayout>
        <UiPanel>
          <UiSectionHeader
            title="Plantas en esta ubicación"
            :description="isEmpty
              ? 'Ningún ejemplar vive aquí todavía.'
              : `${plantCount} ${plantCount === 1 ? 'ejemplar' : 'ejemplares'} en esta localización.`"
          >
            <template #actions>
              <UiButton variant="ghost" :to="filteredInventory" data-test="filtered-inventory">
                Ver inventario filtrado
              </UiButton>
            </template>
          </UiSectionHeader>

          <UiEmptyState
            v-if="isEmpty"
            title="Esta localización está vacía"
            data-test="no-plants"
            mark="⌖"
          >
            No alberga ningún ejemplar, así que puedes retirarla del catálogo si ya no la usas.
            <template #action>
              <UiButton variant="secondary" @click="confirming = true">Retirar localización</UiButton>
            </template>
          </UiEmptyState>

          <UiTable
            v-else-if="plants?.content.length"
            data-test="location-plants"
            :columns="COLUMNS"
            :rows="plants.content"
            row-key="id"
          >
            <template #cell-plant="{ row }">
              <UiEntityCell
                :title="asPlant(row).nickname"
                :to="`/plants/${asPlant(row).id}`"
                :detail="asPlant(row).species.commonName"
                data-test="plant-link"
              />
            </template>

            <template #cell-species="{ row }">
              <em>{{ asPlant(row).species.scientificName }}</em>
            </template>

            <!-- El estado del ejemplar todavía no existe como dato: es T-16. -->
            <template #cell-status>
              <span data-mock="true" class="cell-mock">— <small>T-16</small></span>
            </template>
          </UiTable>

          <p v-if="!isEmpty && plants && plants.totalElements > plants.content.length" class="hint">
            Se muestran los {{ plants.content.length }} primeros de {{ plants.totalElements }}.
            El resto está en el inventario filtrado.
          </p>
        </UiPanel>

        <UiPanel title="Dentro de esta localización" data-mock="true" data-test="children">
          <p class="pending">
            El prototipo recorre el vivero de la zona a la bancada y de la bancada a la bandeja.
            La jerarquía —el padre, las sublocalizaciones y la ruta completa— llega con
            <strong>T-18</strong>: el esquema es plano hoy y no se dibuja un árbol inventado.
          </p>
        </UiPanel>

        <template #aside>
          <UiPanel title="Características del espacio" data-mock="true" data-test="facts">
            <p class="pending">
              El tipo, el entorno, la exposición y la capacidad orientativa llegan con
              <strong>T-18</strong>: la tabla `location` solo guarda el nombre.
            </p>
          </UiPanel>

          <UiPanel title="Últimos movimientos" data-mock="true" data-test="movements">
            <p class="pending">
              Mover un ejemplar es un evento de la cronología, y todavía no se registra: llega con
              <strong>T-18</strong> y se muestra con <strong>T-20</strong>.
            </p>
          </UiPanel>

          <UiPanel title="Próximo trabajo" data-mock="true" data-test="tasks">
            <p class="pending">
              Las tareas del lugar llegan con <strong>T-22</strong>. Una tarea es trabajo
              pendiente, no un cuidado ya ocurrido.
            </p>
          </UiPanel>
        </template>
      </UiDetailLayout>

      <UiDialog
        :open="renaming"
        title="Corregir el nombre"
        subtitle="Los ejemplares que alberga no cambian: siguen siendo los mismos y conservan su ficha."
        data-test="rename-dialog"
        @close="renaming = false"
      >
        <form id="rename-location-form" data-test="rename-submit" @submit.prevent="submitRename">
          <UiField v-model="newName" label="Nombre" data-test="rename-name" />
        </form>

        <UiInlineError v-if="renameError" data-test="rename-error">{{ renameError }}</UiInlineError>

        <template #footer>
          <UiButton variant="secondary" @click="renaming = false">Cancelar</UiButton>
          <UiButton type="submit" form="rename-location-form" :disabled="savingName">
            {{ savingName ? 'Guardando…' : 'Guardar nombre' }}
          </UiButton>
        </template>
      </UiDialog>

      <UiDialog
        :open="confirming"
        title="Retirar la localización"
        data-test="remove-dialog"
        @close="confirming = false"
      >
        <p v-if="canRemove">
          «{{ location.name }}» dejará de estar disponible para nuevos ejemplares. No alberga
          ninguno, así que no afecta a ninguna ficha.
        </p>
        <p v-else>
          «{{ location.name }}» alberga {{ plantCount }}
          {{ plantCount === 1 ? 'ejemplar' : 'ejemplares' }}. Una planta no puede quedarse sin
          sitio, así que hay que moverlos antes de retirarla.
        </p>

        <template #footer>
          <UiButton variant="secondary" @click="confirming = false">Cancelar</UiButton>
          <UiButton v-if="canRemove" :disabled="removing" data-test="confirm-removal" @click="confirmRemoval">
            {{ removing ? 'Retirando…' : 'Retirar localización' }}
          </UiButton>
          <UiButton v-else :to="filteredInventory" data-test="see-plants">
            Ver esos ejemplares
          </UiButton>
        </template>
      </UiDialog>
    </template>
  </section>
</template>

<style scoped>
.hero-mark {
  align-items: center;
  background: var(--color-brand-soft);
  border-radius: var(--radius-md);
  color: var(--color-brand);
  display: flex;
  font-size: var(--font-size-24);
  height: 64px;
  justify-content: center;
  width: 64px;
}

/* El código del espacio y la ruta: marcados como maqueta, con el trazo discontinuo del resto. */
.hero-code {
  border: 1px dashed var(--color-line-strong);
  color: var(--color-ink-faint);
  font-size: var(--font-size-11);
  padding: 0 4px;
}

.hero-path {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  margin: 0;
}

/* La fila de métricas del prototipo: cifras destacadas en línea, no tarjetas sueltas. */
.metrics {
  display: grid;
  gap: var(--space-3);
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  margin-bottom: var(--space-4);
}

/* `UiInlineError` no trae margen propio: el hueco lo pone quien lo coloca. */
.hero-error {
  margin-bottom: var(--space-4);
}

.hint {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  margin: var(--space-3) 0 0;
}

.pending {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  margin: 0;
}

.cell-mock {
  color: var(--color-ink-faint);
}

.cell-mock small {
  border: 1px dashed var(--color-line-strong);
  font-size: var(--font-size-11);
  padding: 0 2px;
}
</style>
