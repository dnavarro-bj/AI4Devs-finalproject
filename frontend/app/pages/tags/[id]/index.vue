<script setup lang="ts">
/**
 * La ficha de una etiqueta, con la composición de la pantalla `tag-detail` del prototipo: portada
 * con su marca, su nombre normalizado, su estado y sus tres acciones; columna principal con **la
 * distribución en la colección** y las plantas que la tienen; y lateral con la ficha, el impacto
 * de renombrarla y el panel de administrar.
 *
 * **El nombre normalizado va a la vista** porque es lo que decide si un renombrado choca con otra
 * etiqueta: sin verlo, un `409` entre «Semillero propio» y «SEMILLERO PROPIO » parece arbitrario.
 *
 * **Híbrida, y marcada.** Real: el nombre, su forma normalizada, cuántas plantas la tienen, qué
 * parte del inventario representan y cuáles son. Marcado con su ticket: el reparto por especies y
 * localizaciones (T-21), la descripción (T-17) y las fechas (T-20).
 */
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'
import { useCatalogs } from '@features/catalogs/composables/useCatalogs'
import { usePlants } from '@features/plants/composables/usePlants'
import { isNotFound } from '@shared/services/errorNormalizer'
import type { TagDetail, TagListItem } from '@features/catalogs/types/catalog.types'
import type { PlantSummary } from '@features/plants/types/plant.types'
import type { DomainError, PageResponse } from '@shared/types/api.types'

const route = useRoute()
const id = String(route.params.id)

const { tagDetail, renameTag, mergeTags, removeTag, listTags } = useCatalogs()
const { list: listPlants } = usePlants()
const { set: setBreadcrumbs } = useBreadcrumbs()

const tag = ref<TagDetail | null>(null)
const plants = ref<PageResponse<PlantSummary> | null>(null)
const collectionSize = ref(0)
/** Los candidatos a destino de una combinación: el catálogo menos ella misma. */
const candidates = ref<TagListItem[]>([])
const loading = ref(true)
const error = ref<DomainError | null>(null)

const renaming = ref(false)
const newName = ref('')
const savingName = ref(false)
const renameError = ref<string | null>(null)

const merging = ref(false)
const mergeTarget = ref('')
const mergingNow = ref(false)
const mergeError = ref<string | null>(null)

const confirming = ref(false)
const removing = ref(false)
const removeError = ref<string | null>(null)

setBreadcrumbs([{ label: 'Etiquetas', to: '/tags' }, { label: 'Ficha de etiqueta' }])

const notFound = computed(() => !loading.value && isNotFound(error.value))
const plantCount = computed(() => tag.value?.plantCount ?? 0)
const isUnused = computed(() => plantCount.value === 0)
const share = computed(() =>
  collectionSize.value > 0 ? Math.round((plantCount.value / collectionSize.value) * 100) : 0)

/** El inventario filtrado por esta etiqueta: el filtro existe desde T-02. */
const filteredInventory = computed(() => `/plants?tag=${id}`)

const COLUMNS = [
  { key: 'plant', label: 'Planta' },
  { key: 'species', label: 'Especie' },
  { key: 'location', label: 'Localización' },
]

async function load() {
  loading.value = true
  error.value = null

  const [detail, page, inventory, catalog] = await Promise.all([
    tagDetail(id),
    listPlants({ tag: [id] }),
    listPlants({ page: 0 }),
    listTags(0),
  ])
  loading.value = false

  if (!detail.success) {
    error.value = detail.error
    return
  }
  tag.value = detail.data!
  if (page.success) plants.value = page.data!
  if (inventory.success) collectionSize.value = inventory.data!.totalElements
  if (catalog.success) candidates.value = catalog.data!.content.filter((it) => it.id !== id)

  setBreadcrumbs([{ label: 'Etiquetas', to: '/tags' }, { label: detail.data!.name }])
  useHead({ title: `Cactify · ${detail.data!.name}` })
}

function openRename() {
  newName.value = tag.value?.name ?? ''
  renameError.value = null
  renaming.value = true
}

/** El mensaje del API se prefiere al nuestro: es quien conoce la unicidad normalizada. */
async function submitRename() {
  savingName.value = true
  renameError.value = null

  const result = await renameTag(id, newName.value)
  savingName.value = false

  if (!result.success) {
    renameError.value = result.error!.message || 'No se ha podido renombrar la etiqueta.'
    return
  }

  renaming.value = false
  if (tag.value) tag.value = { ...tag.value, name: result.data!.name }
  setBreadcrumbs([{ label: 'Etiquetas', to: '/tags' }, { label: result.data!.name }])
}

function openMerge() {
  mergeTarget.value = candidates.value[0]?.id ?? ''
  mergeError.value = null
  confirming.value = false
  merging.value = true
}

/**
 * Combinar es destructivo y no hay deshacer: el diálogo declara el alcance **antes** con la cifra
 * exacta, y al terminar se va a la etiqueta que queda, que es donde ahora están esas plantas.
 */
async function submitMerge() {
  mergingNow.value = true
  mergeError.value = null

  const result = await mergeTags(id, mergeTarget.value)
  mergingNow.value = false

  if (!result.success) {
    mergeError.value = result.error!.message || 'No se han podido combinar las etiquetas.'
    return
  }

  merging.value = false
  await navigateTo(`/tags/${result.data!.target.id}`)
}

async function confirmRemoval() {
  removing.value = true
  removeError.value = null

  const result = await removeTag(id)
  removing.value = false

  if (!result.success) {
    removeError.value = result.error!.message || 'No se puede retirar mientras alguna planta la tenga.'
    confirming.value = false
    return
  }

  confirming.value = false
  await navigateTo('/tags')
}

// Ya montada, no en `setup`: la URL del API solo es válida en el navegador (ADR-013).
onMounted(load)

const asPlant = (row: unknown) => row as PlantSummary
</script>

<template>
  <section>
    <p v-if="loading" data-test="loading" role="status">Cargando la etiqueta…</p>

    <UiEmptyState
      v-else-if="notFound"
      title="Esta etiqueta no existe"
      data-test="not-found"
      mark="◌"
    >
      Puede que se haya retirado o combinado con otra.
      <template #action>
        <UiButton to="/tags">Volver al catálogo</UiButton>
      </template>
    </UiEmptyState>

    <UiInlineError v-else-if="error" data-test="error">{{ error.message }}</UiInlineError>

    <template v-else-if="tag">
      <UiEntityHero :title="tag.name" subtitle="Etiqueta del catálogo" data-test="tag-hero">
        <template #visual>
          <span class="hero-mark" aria-hidden="true">◇</span>
        </template>
        <template #identity>
          <UiStatus :tone="isUnused ? 'neutral' : 'ok'">
            {{ isUnused ? 'Sin uso' : 'En uso' }}
          </UiStatus>
          <span class="normalized" data-test="normalized-name">
            Nombre normalizado: <code>{{ tag.normalizedName }}</code>
          </span>
        </template>
        <template #context>
          <p class="hero-description" data-mock="true" data-test="description">
            La descripción de la etiqueta —para qué se usa y cuándo aplicarla— llega con
            <strong>T-17</strong>: hoy el catálogo solo guarda el nombre.
          </p>
        </template>
        <template #actions>
          <UiButton :to="filteredInventory" data-test="filtered-inventory">
            Ver {{ plantCount }} {{ plantCount === 1 ? 'planta' : 'plantas' }}
          </UiButton>
          <UiButton variant="secondary" data-test="rename-tag" @click="openRename">Renombrar</UiButton>
          <UiButton variant="secondary" data-test="merge-tag" @click="openMerge">Combinar</UiButton>
          <UiButton variant="secondary" data-test="remove-tag" @click="confirming = true">
            Retirar
          </UiButton>
        </template>
      </UiEntityHero>

      <UiInlineError v-if="removeError" class="hero-error" data-test="remove-error">
        {{ removeError }}
      </UiInlineError>

      <UiDetailLayout>
        <UiPanel data-test="distribution">
          <UiSectionHeader
            title="Distribución en la colección"
            description="Ayuda a comprobar si la etiqueta sigue siendo útil y consistente."
          />

          <div class="metrics">
            <UiStatTile
              :value="plantCount"
              label="Plantas"
              :context="`${share} % del inventario`"
              :to="filteredInventory"
              data-test="plant-count"
            />
            <UiStatTile value="—" label="Especies" context="Reparto · T-21" data-mock="true" data-test="metric-species" />
            <UiStatTile value="—" label="Localizaciones" context="Reparto · T-21" data-mock="true" data-test="metric-locations" />
          </div>

          <p class="pending" data-mock="true" data-test="location-breakdown">
            El prototipo desglosa aquí cuántas plantas hay en cada localización. Agrupar el
            inventario por localización dentro de un filtro llega con <strong>T-21</strong>.
          </p>
        </UiPanel>

        <UiPanel>
          <UiSectionHeader
            title="Plantas con esta etiqueta"
            :description="isUnused
              ? 'Ninguna planta la tiene todavía.'
              : `${plantCount} ${plantCount === 1 ? 'ejemplar la tiene' : 'ejemplares la tienen'}.`"
          >
            <template #actions>
              <UiButton variant="ghost" :to="filteredInventory">Ver inventario filtrado</UiButton>
            </template>
          </UiSectionHeader>

          <UiEmptyState
            v-if="isUnused"
            title="Ninguna planta tiene esta etiqueta"
            data-test="no-plants"
            mark="◇"
          >
            Puedes asignarla desde la ficha de un ejemplar, o retirarla si ya no la necesitas.
            <template #action>
              <UiButton variant="secondary" @click="confirming = true">Retirar etiqueta</UiButton>
            </template>
          </UiEmptyState>

          <UiTable
            v-else-if="plants?.content.length"
            data-test="tag-plants"
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
            <template #cell-location="{ row }">
              {{ asPlant(row).location.name }}
            </template>
          </UiTable>

          <p v-if="!isUnused && plants && plants.totalElements > plants.content.length" class="hint">
            Se muestran los {{ plants.content.length }} primeros de {{ plants.totalElements }}.
          </p>
        </UiPanel>

        <template #aside>
          <UiPanel title="Ficha de la etiqueta">
            <UiDefinitionList
              :items="[
                { key: 'name', label: 'Nombre', value: tag.name },
                { key: 'normalized', label: 'Nombre normalizado', value: tag.normalizedName },
                { key: 'plants', label: 'Plantas', value: plantCount },
              ]"
            />
            <p class="pending" data-mock="true" data-test="dates">
              Las fechas de creación y de última modificación llegan con <strong>T-20</strong>.
            </p>
          </UiPanel>

          <UiPanel title="Impacto de renombrar">
            <p class="hint">
              Cambiar el nombre alcanza a las {{ plantCount }}
              {{ plantCount === 1 ? 'planta que la tiene' : 'plantas que la tienen' }}, sin
              modificar su historial: la relación es por referencia, no por texto.
            </p>
          </UiPanel>

          <UiPanel title="Administrar">
            <div class="admin">
              <button type="button" @click="openMerge">
                <span aria-hidden="true">⇄</span>
                <span>
                  <strong>Combinar etiqueta</strong>
                  <small>Unifica duplicados conservando las plantas</small>
                </span>
              </button>
              <button type="button" @click="confirming = true">
                <span aria-hidden="true">⌫</span>
                <span>
                  <strong>Retirar etiqueta</strong>
                  <small>Solo si ninguna planta la tiene</small>
                </span>
              </button>
            </div>
          </UiPanel>
        </template>
      </UiDetailLayout>

      <UiDialog
        :open="renaming"
        title="Renombrar la etiqueta"
        subtitle="Las plantas que la tienen la conservan: la relación es por referencia."
        data-test="rename-dialog"
        @close="renaming = false"
      >
        <form id="rename-tag-form" data-test="rename-submit" @submit.prevent="submitRename">
          <UiField
            v-model="newName"
            label="Nombre"
            help="No distingue mayúsculas ni espacios sobrantes."
            data-test="rename-name"
          />
        </form>

        <UiInlineError v-if="renameError" data-test="rename-error">{{ renameError }}</UiInlineError>

        <template #footer>
          <UiButton variant="secondary" @click="renaming = false">Cancelar</UiButton>
          <UiButton type="submit" form="rename-tag-form" :disabled="savingName">
            {{ savingName ? 'Guardando…' : 'Guardar nombre' }}
          </UiButton>
        </template>
      </UiDialog>

      <UiDialog
        :open="merging"
        title="Combinar la etiqueta"
        data-test="merge-dialog"
        @close="merging = false"
      >
        <UiNotice severity="warning" title="Esta acción no se puede deshacer">
          Las {{ plantCount }} {{ plantCount === 1 ? 'planta' : 'plantas' }} de «{{ tag.name }}»
          pasarán a la etiqueta elegida, y «{{ tag.name }}» desaparecerá del catálogo. Una planta
          que ya tuviera las dos la conservará una sola vez.
        </UiNotice>

        <form id="merge-tag-form" data-test="merge-submit" @submit.prevent="submitMerge">
          <UiField
            v-model="mergeTarget"
            label="Etiqueta de destino"
            as="select"
            :options="candidates.map((it) => ({ value: it.id, label: `${it.name} (${it.plantCount})` }))"
            data-test="merge-target"
          />
        </form>

        <UiInlineError v-if="mergeError" data-test="merge-error">{{ mergeError }}</UiInlineError>

        <template #footer>
          <UiButton variant="secondary" data-test="cancel-merge" @click="merging = false">
            Cancelar
          </UiButton>
          <UiButton
            type="submit"
            form="merge-tag-form"
            :disabled="mergingNow || !mergeTarget"
          >
            {{ mergingNow ? 'Combinando…' : `Combinar ${plantCount} plantas` }}
          </UiButton>
        </template>
      </UiDialog>

      <UiDialog
        :open="confirming"
        title="Retirar la etiqueta"
        data-test="remove-dialog"
        @close="confirming = false"
      >
        <p v-if="isUnused">
          «{{ tag.name }}» no la tiene ninguna planta, así que retirarla no afecta a ningún
          ejemplar.
        </p>
        <p v-else>
          «{{ tag.name }}» la tienen {{ plantCount }}
          {{ plantCount === 1 ? 'planta' : 'plantas' }}. Para no perder esa clasificación, lo
          habitual es combinarla con la etiqueta que la sustituye.
        </p>

        <template #footer>
          <UiButton variant="secondary" @click="confirming = false">Cancelar</UiButton>
          <UiButton
            v-if="isUnused"
            :disabled="removing"
            data-test="confirm-removal"
            @click="confirmRemoval"
          >
            {{ removing ? 'Retirando…' : 'Retirar etiqueta' }}
          </UiButton>
          <UiButton v-else data-test="merge-instead" @click="openMerge">
            Combinarla con otra
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

.normalized {
  color: var(--color-ink-muted);
  font-size: var(--font-size-11);
}

.normalized code {
  color: var(--color-ink);
}

.hero-description {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  margin: 0;
}

/* `UiInlineError` no trae margen propio: el hueco lo pone quien lo coloca. */
.hero-error {
  margin-bottom: var(--space-4);
}

.metrics {
  display: grid;
  gap: var(--space-3);
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  margin-top: var(--space-4);
}

.hint {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  margin: var(--space-3) 0 0;
}

.pending {
  border-top: 1px solid var(--color-line);
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  margin: var(--space-4) 0 0;
  padding-top: var(--space-3);
}

.admin {
  display: grid;
  gap: var(--space-2);
}

.admin button {
  align-items: center;
  background: transparent;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-sm);
  color: inherit;
  cursor: pointer;
  display: flex;
  gap: var(--space-2);
  padding: var(--space-2);
  text-align: left;
  width: 100%;
}

.admin button:hover {
  border-color: var(--color-brand);
}

.admin strong {
  display: block;
  font-size: var(--font-size-12);
}

.admin small {
  color: var(--color-ink-muted);
  font-size: var(--font-size-11);
}
</style>
