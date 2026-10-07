<script setup lang="ts">
/**
 * La ficha de una especie, la pantalla `species-detail` del prototipo.
 *
 * **Criterio de esta pantalla, corregido tras la primera versión:** lo que no existe todavía
 * conserva **su composición** y marca **sus valores**, en vez de reemplazar la sección por un
 * párrafo. Una rejilla de doce meses vacía y marcada dice lo mismo —«esto llega con T-17»— y
 * además enseña la forma de la pantalla; un párrafo en su lugar la borra. La primera versión hizo
 * lo segundo y el resultado no se parecía al prototipo ni de lejos.
 *
 * Real: los dos nombres, la descripción, exposición, entorno, temperatura, humedad, luz, riego y la
 * mezcla de sustrato, el año de cultivo y la floración (T-17), las fotografías (T-19), más corregir y
 * retirar. Marcado: la lista de ejemplares y los grupos de cultivo (T-21).
 *
 * **Un dato sin definir se dice «Sin definir»**: ni un guion ni un valor inventado. Es una
 * respuesta, no un hueco.
 */
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'
import { useSpecies } from '@features/species/composables/useSpecies'
import {
  YEAR_LEGEND,
  SUN_EXPOSURE,
  environmentLabel,
  periodSpan,
  sunExposureLabel,
  yearRows,
} from '@features/species/mappers/speciesCultivation'
import SpeciesPhotosPanel from '@features/species/components/SpeciesPhotosPanel.vue'
import { useMediaGallery } from '@features/media/composables/useMediaGallery'
import { usePendingUploads } from '@features/media/composables/usePendingUploads'
import { toThumbImage } from '@features/media/mappers/media.mapper'
import SpeciesSpecimensPanel from '@features/species/components/SpeciesSpecimensPanel.vue'
import { isNotFound } from '@shared/services/errorNormalizer'
import type { SpeciesDetail } from '@features/species/types/species.types'
import type { DomainError } from '@shared/types/api.types'

const route = useRoute()
const id = String(route.params.id)

const { detail, remove } = useSpecies()
const { set: setBreadcrumbs } = useBreadcrumbs()

const species = ref<SpeciesDetail | null>(null)
const loading = ref(true)
const error = ref<DomainError | null>(null)

const confirming = ref(false)
const removing = ref(false)
const removeError = ref<string | null>(null)

setBreadcrumbs([{ label: 'Especies', to: '/species' }, { label: 'Ficha de especie' }])

const notFound = computed(() => !loading.value && isNotFound(error.value))

/**
 * La galería la crea la ficha y la comparten la cabecera y la pestaña: subir una foto actualiza la
 * portada y el recuento sin recargar. Hasta que llega la galería, valen los de la propia ficha.
 */
const gallery = useMediaGallery({ kind: 'species', id })
const galleryLoaded = ref(false)
/** Lo que se eligió al dar de alta o al corregir y no llegó a subirse: se avisa aquí y se reintenta en la pestaña. */
const pendingPhotos = usePendingUploads().pendingFor({ kind: 'species', id })
const apiBase = useRuntimeConfig().public.apiBaseUrl as string

const photoCount = computed(() => galleryLoaded.value ? gallery.total.value : (species.value?.photoCount ?? 0))

/** La portada: la principal de la galería, o la que trae la ficha mientras la galería llega. */
const cover = computed(() => {
  const primary = gallery.photos.value.find((photo) => photo.primary)
  if (galleryLoaded.value) return primary ? toThumbImage(primary, apiBase) : null
  return species.value?.primaryPhoto ? toThumbImage(species.value.primaryPhoto, apiBase) : null
})

/** Las dos siguientes, para la tira de la cabecera. */
const heroThumbs = computed(() => gallery.photos.value
  .filter((photo) => !photo.primary).slice(0, 2).map((photo) => toThumbImage(photo, apiBase)))

const TABS = computed(() => [
  { value: 'summary', label: 'Resumen' },
  { value: 'cultivation', label: 'Cultivo' },
  { value: 'photos', label: 'Fotografías', ...(photoCount.value > 0 ? { count: photoCount.value } : {}) },
  { value: 'specimens', label: 'Ejemplares' },
])
const tab = ref('summary')

const UNDEFINED = 'Sin definir'

/** La pauta como una sola lectura: es lo que se consulta de una especie. */
const conditions = computed(() => {
  const current = species.value
  if (!current) return []
  const exposure = SUN_EXPOSURE.find((option) => option.value === current.sunExposure)

  return [
    { mark: '☼', label: 'Exposición', value: sunExposureLabel(current.sunExposure) ?? UNDEFINED, hint: exposure?.description ?? 'Cómo recibe la luz, no cuánta', test: 'exposure', pending: !exposure },
    { mark: '⌂', label: 'Entorno', value: environmentLabel(current.environment) ?? UNDEFINED, hint: 'Dónde se cultiva', test: 'environment', pending: !current.environment },
    { mark: '↕', label: 'Temperatura', value: `${current.minTemperature}–${current.maxTemperature} °C`, hint: 'Rango que tolera en cultivo' },
    { mark: '◌', label: 'Humedad', value: `${current.minHumidity}–${current.maxHumidity} %`, hint: 'Evitar humedad persistente' },
    { mark: '☀', label: 'Luz', value: `${current.minLightHours}–${current.maxLightHours} h`, hint: 'Horas de luz al día' },
    { mark: '◇', label: 'Riego', value: current.wateringGuideline, hint: 'Orientativo: depende del ejemplar' },
  ]
})

/**
 * El género es la primera palabra del binomio. **No es un dato inventado**, así que no se marca:
 * marcarlo sería mentir en la otra dirección.
 */
const genus = computed(() => species.value?.scientificName.trim().split(/\s+/)[0] ?? '')

/** Las cuatro filas del año, con los meses de cada periodo; un periodo que cruza diciembre se pinta seguido. */
const yearGrid = computed(() => yearRows(species.value?.periods ?? []))
const hasCalendar = computed(() => (species.value?.periods ?? []).length > 0)

/** Los meses de floración como texto, «Mayo–julio», o los varios periodos separados. */
const floweringSpan = computed(() => {
  const spans = (species.value?.periods ?? [])
    .filter((period) => period.type === 'floracion')
    .map((period) => periodSpan(period.startMonth, period.endMonth))
  return spans.length ? spans.join(' · ') : UNDEFINED
})

const floweringFacts = computed(() => [
  { label: 'Periodo', value: floweringSpan.value },
  { label: 'Color', value: species.value?.bloomColor ?? UNDEFINED },
  { label: 'Madurez', value: species.value?.bloomMaturity ?? UNDEFINED },
  { label: 'Duración', value: species.value?.bloomTypicalDuration ?? UNDEFINED },
])

/** Los grupos dinámicos del prototipo. Llegan con T-21. */
const GROUPS = [
  { mark: '☼', label: 'Pleno sol' },
  { mark: '◇', label: 'Riego espaciado' },
  { mark: '◒', label: 'Sustrato mineral' },
]

async function load() {
  loading.value = true
  error.value = null

  const result = await detail(id)
  loading.value = false

  if (!result.success) {
    error.value = result.error
    return
  }
  species.value = result.data!
  setBreadcrumbs([{ label: 'Especies', to: '/species' }, { label: result.data!.scientificName }])
  useHead({ title: `Cactify · ${result.data!.scientificName}` })

  await gallery.load()
  galleryLoaded.value = !gallery.error.value
}

/**
 * El `409` se traduce **aquí** y no en el service: el código es del transporte y el mensaje es del
 * dominio de esta pantalla. Se prefiere el mensaje del API, que lo escribe quien conoce la regla.
 */
async function confirmRemoval() {
  removing.value = true
  removeError.value = null

  const result = await remove(id)
  removing.value = false

  if (!result.success) {
    removeError.value = result.error!.message
      || 'No se puede retirar mientras tenga ejemplares registrados.'
    confirming.value = false
    return
  }

  confirming.value = false
  await navigateTo('/species')
}

onMounted(load)
</script>

<template>
  <section>
    <p v-if="loading" data-test="loading" role="status">Cargando la especie…</p>

    <UiEmptyState v-else-if="notFound" title="Esta especie no existe" data-test="not-found" mark="◌">
      Puede que se haya retirado del catálogo.
      <template #action>
        <UiButton to="/species">Volver al catálogo</UiButton>
      </template>
    </UiEmptyState>

    <UiInlineError v-else-if="error" data-test="error">{{ error.message }}</UiInlineError>

    <template v-else-if="species">
      <!-- La portada usa el patrón visual común; sus datos pendientes siguen marcados. -->
      <UiEntityHero
        class="species-hero"
        :title="species.scientificName"
        :subtitle="species.commonName"
        visual-position="end"
      >
        <template #identity>
          <UiIdentityCode :value="species.code" data-test="species-code" />
          <UiStatus tone="ok">Ficha completa</UiStatus>
        </template>
        <template #context>
          <p v-if="species.description" class="hero__description" data-test="description">
            {{ species.description }}
          </p>
          <p v-else class="hero__description is-undefined" data-test="description">Sin descripción todavía.</p>
        </template>
        <template #visual>
          <div class="hero__media" data-test="photos">
            <UiCoverPhoto
              class="hero__cover"
              data-test="cover"
              :src="cover?.src"
              :alt="cover?.alt"
              :count="photoCount"
              count-action
              @count="tab = 'photos'"
            />
            <div class="hero__thumbs">
              <button
                v-for="thumb in heroThumbs"
                :key="thumb.id"
                type="button"
                class="hero__thumb"
                data-test="hero-thumb"
                :aria-label="`Ver ${thumb.alt}`"
                @click="tab = 'photos'"
              >
                <img :src="thumb.thumbSrc" :alt="thumb.alt">
              </button>
              <button type="button" class="hero__add" data-test="hero-add-photo" @click="tab = 'photos'">
                <b aria-hidden="true">＋</b>
                <small>Añadir</small>
              </button>
            </div>
          </div>
        </template>
        <template #actions>
          <UiButton :to="`/species/${species.id}/edit`" data-test="edit-species">Editar especie</UiButton>
          <UiButton variant="secondary" disabled data-mock="true">Ver plantas</UiButton>
          <UiButton variant="secondary" data-test="remove-species" @click="confirming = true">Retirar</UiButton>
        </template>
      </UiEntityHero>

      <UiInlineError v-if="removeError" class="hero-error" data-test="remove-error">
        {{ removeError }}
      </UiInlineError>

      <UiNotice
        v-if="pendingPhotos.length && tab !== 'photos'"
        severity="warning"
        title="Hay fotografías sin subir"
        data-test="pending-photos"
      >
        La especie se guardó, pero {{ pendingPhotos.length }}
        {{ pendingPhotos.length === 1 ? 'fotografía no se subió' : 'fotografías no se subieron' }}.
        <UiButton variant="secondary" data-test="review-pending" @click="tab = 'photos'">Revisar</UiButton>
      </UiNotice>

      <UiTabs v-model="tab" :tabs="TABS" />

      <div v-if="tab === 'summary' || tab === 'cultivation'" class="species" data-test="cultivation-view">
        <div class="species__main">
          <section class="detail-section" data-test="year-cycle">
            <UiSectionHeader
              title="Año de cultivo"
              description="Referencia para clima mediterráneo y cultivo exterior."
            >
              <template #actions><NuxtLink :to="`/species/${species.id}/edit#species-editor-seasons`">Editar periodos</NuxtLink></template>
            </UiSectionHeader>
            <div class="year-card">
              <UiYearGrid :rows="yearGrid" :legend="YEAR_LEGEND" />
              <p v-if="!hasCalendar" class="section-ticket" data-test="no-calendar">
                El calendario de esta especie no está definido.
              </p>
            </div>
          </section>

          <section class="detail-section" data-test="conditions">
            <UiSectionHeader
              title="Condiciones recomendadas"
              description="Estos valores los heredan los ejemplares que no los personalicen."
            >
              <template #actions><NuxtLink :to="`/species/${species.id}/edit#species-editor-care`">Editar cuidados</NuxtLink></template>
            </UiSectionHeader>
            <dl class="conditions">
              <div
                v-for="item in conditions"
                :key="item.label"
                data-role="condition"
                :data-test="item.test"
              >
                <dt>
                  <span class="conditions__mark" aria-hidden="true">{{ item.mark }}</span>
                  {{ item.label }}
                </dt>
                <dd :class="{ 'is-pending': item.pending }">{{ item.value }}</dd>
                <small>{{ item.hint }}</small>
              </div>

              <div data-role="condition">
                <dt>
                  <span class="conditions__mark" aria-hidden="true">◒</span>
                  Sustrato
                </dt>
                <dd>
                  <NuxtLink :to="`/soil-mixes/${species.soilMix.id}`" data-test="soil-mix-link">
                    {{ species.soilMix.name }}
                  </NuxtLink>
                </dd>
                <small>La mezcla que recomienda el catálogo</small>
              </div>
            </dl>
          </section>

          <section class="detail-section" data-test="flowering">
            <UiSectionHeader title="Floración" description="Comportamiento habitual de la especie.">
              <template #actions><NuxtLink :to="`/species/${species.id}/edit#species-editor-seasons`">Editar</NuxtLink></template>
            </UiSectionHeader>
            <div class="flowering">
              <div class="flowering__figure" role="img" aria-label="Sin fotografía de floración">
                <span aria-hidden="true">✣</span>
              </div>
              <dl class="flowering__facts">
                <div v-for="fact in floweringFacts" :key="fact.label">
                  <dt>{{ fact.label }}</dt>
                  <dd :class="{ 'is-pending': fact.value === UNDEFINED }">{{ fact.value }}</dd>
                </div>
              </dl>
              <p v-if="species.bloomDescription" class="flowering__note" data-test="bloom-notes">
                {{ species.bloomDescription }}
              </p>
            </div>
          </section>

          <SpeciesSpecimensPanel v-if="tab === 'summary'" />
        </div>

        <aside v-if="tab === 'summary'" class="species__aside">
          <UiPanel class="catalog-card" title="Ficha de catálogo">
            <dl class="facts">
              <div>
                <dt>Código</dt>
                <dd><code data-test="catalog-code">{{ species.code }}</code></dd>
              </div>
              <div>
                <dt>Género</dt>
                <dd data-test="genus"><em>{{ genus }}</em></dd>
              </div>
              <div>
                <dt>Nombre común</dt>
                <dd>{{ species.commonName }}</dd>
              </div>
              <div>
                <dt>Sustrato recomendado</dt>
                <dd>{{ species.soilMix.name }}</dd>
              </div>
              <div>
                <dt>Ejemplares</dt>
                <dd data-test="plant-count"><strong>{{ species.plantCount }}</strong></dd>
              </div>
            </dl>
          </UiPanel>

          <!-- Los grupos del prototipo, con su forma de tarjeta y sin recuentos inventados. -->
          <UiPanel class="groups-card" title="Grupos de cultivo" data-mock="true" data-test="groups">
            <p class="species__hint">
              La especie entrará automáticamente en estos grupos. Llegan con <strong>T-21</strong>.
            </p>
            <div class="groups">
              <span v-for="group in GROUPS" :key="group.label" class="groups__item">
                <span class="groups__mark" aria-hidden="true">{{ group.mark }}</span>
                <span>
                  <strong>{{ group.label }}</strong>
                  <small>— especies</small>
                </span>
              </span>
            </div>
          </UiPanel>

          <UiPanel class="inheritance-note" title="Herencia activa">
            <p class="species__hint">
              Si corriges un valor, se actualizará en todos los ejemplares que no lo hayan
              personalizado. Las lecturas ya registradas no cambian.
            </p>
          </UiPanel>
        </aside>
      </div>

      <SpeciesPhotosPanel
        v-else-if="tab === 'photos'"
        :species-id="species.id"
        :species-name="species.scientificName"
        :gallery="gallery"
      />
      <SpeciesSpecimensPanel v-else-if="tab === 'specimens'" standalone />

      <UiDialog
        :open="confirming"
        title="Retirar la especie del catálogo"
        data-test="remove-dialog"
        @close="confirming = false"
      >
        <p>
          «{{ species.scientificName }}» dejará de estar disponible para nuevas plantas. Si tiene
          ejemplares registrados, el catálogo lo impedirá.
        </p>
        <template #footer>
          <UiButton variant="secondary" data-test="cancel-remove" @click="confirming = false">
            Cancelar
          </UiButton>
          <UiButton :busy="removing" data-test="confirm-remove" @click="confirmRemoval">
            {{ removing ? 'Retirando…' : 'Retirar' }}
          </UiButton>
        </template>
      </UiDialog>
    </template>
  </section>
</template>

<style scoped>
.hero__description {
  color: var(--color-ink-muted);
  font-size: var(--font-size-13);
  line-height: 1.65;
  margin: var(--space-3) 0 0;
  max-width: 58ch;
}

.hero__description.is-undefined {
  color: var(--color-ink-muted);
  font-style: italic;
}

.hero__description span,
.section-ticket strong {
  border: 1px dashed var(--color-line-strong);
  color: var(--color-ink-faint);
  font-size: var(--font-size-11);
  padding: 0 2px;
}

.hero__media {
  display: grid;
  gap: var(--space-2);
  height: 100%;
  min-height: 244px;
  min-width: 0;
  width: min(380px, 34vw);
}

.hero__cover {
  width: 100%;
}

.hero__thumbs {
  display: grid;
  gap: var(--space-2);
  grid-template-columns: repeat(3, 1fr);
}

.hero__thumb,
.hero__add {
  align-items: center;
  border: 0;
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: flex;
  height: 58px;
  justify-content: center;
  overflow: hidden;
  padding: 0;
}

.hero__thumb img {
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.hero__add {
  background: var(--color-canvas);
  border: 1px dashed var(--color-line-strong);
  color: var(--color-brand);
  flex-direction: column;
}

.hero__add b { font-size: var(--font-size-17); }
.hero__add small { font-size: var(--font-size-11); }

.species-hero { overflow: hidden; }

.hero-error {
  margin-bottom: var(--space-4);
}

.species {
  align-items: start;
  display: grid;
  gap: var(--space-4);
  grid-template-columns: 2fr 1fr;
  margin-top: var(--space-4);
}

.species__main,
.species__aside {
  align-content: start;
  display: grid;
  gap: var(--space-4);
}

.species__aside { align-items: start; }

.detail-section { min-width: 0; }

.detail-section > :first-child { margin-bottom: var(--space-3); }

.detail-section :deep(.section-header a) {
  color: var(--color-brand);
  font-size: var(--font-size-12);
  font-weight: 700;
}

.year-card { overflow-x: auto; }

.year-card > :first-child { min-width: 680px; }

.section-ticket {
  color: var(--color-ink-faint);
  font-size: var(--font-size-11);
  margin: var(--space-2) 0 0;
}

.species__hint {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  margin: 0 0 var(--space-3);
}

/* Las condiciones se leen en rejilla: siete magnitudes de un vistazo, no una lista larga. */
.conditions {
  display: grid;
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  grid-template-columns: repeat(3, 1fr);
  margin: 0;
  overflow: hidden;
}

.conditions > div {
  min-height: 112px;
  padding: var(--space-4);
}

.conditions > div:nth-child(n+4) {
  border-top: 1px solid var(--color-line);
}

.conditions > div:not(:nth-child(3n+1)) {
  border-left: 1px solid var(--color-line);
}

.conditions > div:last-child:nth-child(3n+1) {
  grid-column: 1 / -1;
}

.conditions > div[data-mock] {
  background: color-mix(in srgb, var(--color-surface-muted) 42%, var(--color-surface));
}

.conditions__mark {
  align-items: center;
  background: var(--color-brand-soft);
  border-radius: var(--radius-pill);
  color: var(--color-brand);
  display: inline-flex;
  height: 26px;
  justify-content: center;
  margin-right: var(--space-1);
  width: 26px;
}

.conditions small {
  color: var(--color-ink-faint);
  display: block;
  font-size: var(--font-size-11);
  margin-top: var(--space-1);
}

.flowering {
  align-items: center;
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  display: grid;
  gap: var(--space-4);
  grid-template-columns: 108px 1fr 1fr;
  padding: var(--space-4);
}

.flowering__figure {
  align-items: center;
  background: var(--color-warning-soft);
  border-radius: var(--radius-pill);
  color: var(--color-warning);
  display: flex;
  font-size: var(--font-size-24);
  height: 102px;
  justify-content: center;
  width: 102px;
}

.flowering__facts {
  display: grid;
  gap: var(--space-3);
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  margin: 0;
}

.flowering__note {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  line-height: 1.6;
  margin: 0;
}

.groups {
  display: grid;
  gap: var(--space-2);
}

.groups__item {
  align-items: center;
  border: 1px dashed var(--color-line-strong);
  border-radius: var(--radius-sm);
  color: var(--color-ink-faint);
  display: flex;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
}

.catalog-card .facts > div {
  align-items: baseline;
  border-top: 1px solid var(--color-line);
  display: flex;
  gap: var(--space-2);
  justify-content: space-between;
  padding: var(--space-2) 0;
}

.catalog-card .facts > div:first-child { border-top: 0; }
.catalog-card .facts dd { max-width: 62%; text-align: right; }

.groups-card .groups__item {
  border: 0;
  border-radius: 0;
  border-top: 1px solid var(--color-line);
  padding-left: 0;
  padding-right: 0;
}

.groups-card .groups__mark {
  align-items: center;
  background: var(--color-brand-soft);
  border-radius: var(--radius-pill);
  color: var(--color-brand);
  display: inline-flex;
  height: 30px;
  justify-content: center;
  width: 30px;
}

.inheritance-note {
  background: var(--color-brand-soft);
  border-left: 4px solid var(--color-brand);
}

.groups__mark {
  font-size: var(--font-size-15);
}

.groups__item strong {
  display: block;
  font-size: var(--font-size-12);
}

.groups__item small {
  font-size: var(--font-size-11);
}

.facts {
  display: grid;
  gap: var(--space-3);
  margin: 0;
}

.facts code {
  border: 1px dashed var(--color-line-strong);
  color: var(--color-ink-faint);
  font-family: var(--font-mono);
  font-size: var(--font-size-11);
  padding: 0 2px;
}

.conditions dt,
.facts dt {
  color: var(--color-ink-muted);
  font-size: var(--font-size-11);
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.conditions dd,
.facts dd,
.flowering__facts dd {
  font-size: var(--font-size-15);
  margin: 0;
}

.flowering__facts dt {
  color: var(--color-ink-muted);
  font-size: var(--font-size-11);
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

/* Un valor que todavía no existe se lee como pendiente, no como un dato en blanco. */
.is-pending {
  color: var(--color-ink-faint);
}

.is-pending small,
.flowering__facts dd small {
  border: 1px dashed var(--color-line-strong);
  font-size: var(--font-size-11);
  padding: 0 2px;
}

@media (max-width: 1100px) {
  .species {
    grid-template-columns: 1fr;
  }

  .species__aside { grid-template-columns: repeat(3, 1fr); }

  .hero__media { width: 100%; }
}

@media (max-width: 900px) {
  .conditions { grid-template-columns: repeat(2, 1fr); }
  .conditions > div { border-left: 0; border-top: 1px solid var(--color-line); }
  .conditions > div:nth-child(odd) { border-right: 1px solid var(--color-line); }
  .conditions > div:nth-child(-n+2) { border-top: 0; }
}

@media (max-width: 620px) {
  .species__aside { grid-template-columns: 1fr; }
  .conditions { grid-template-columns: 1fr; }
  .conditions > div,
  .conditions > div:nth-child(odd) { border-left: 0; border-right: 0; border-top: 1px solid var(--color-line); }
  .conditions > div:first-child { border-top: 0; }
  .flowering { grid-template-columns: 1fr; }
}
</style>
