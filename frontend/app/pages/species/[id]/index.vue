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
 * Real: los dos nombres, temperatura, humedad, luz, riego y la mezcla de sustrato, más corregir y
 * retirar. Marcado: código y ejemplares (T-15), exposición, entorno, año de cultivo y floración
 * (T-17), fotografías (T-19) y grupos de cultivo (T-21).
 */
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'
import { useSpecies } from '@features/species/composables/useSpecies'
import SpeciesPhotosPanel from '@features/species/components/SpeciesPhotosPanel.vue'
import SpeciesSpecimensPanel from '@features/species/components/SpeciesSpecimensPanel.vue'
import { isNotFound } from '@shared/services/errorNormalizer'
import type { SpeciesCare } from '@features/species/types/species.types'
import type { DomainError } from '@shared/types/api.types'

const route = useRoute()
const id = String(route.params.id)

const { detail, remove } = useSpecies()
const { set: setBreadcrumbs } = useBreadcrumbs()

const species = ref<SpeciesCare | null>(null)
const loading = ref(true)
const error = ref<DomainError | null>(null)

const confirming = ref(false)
const removing = ref(false)
const removeError = ref<string | null>(null)

setBreadcrumbs([{ label: 'Especies', to: '/species' }, { label: 'Ficha de especie' }])

const notFound = computed(() => !loading.value && isNotFound(error.value))

const TABS = [
  { value: 'summary', label: 'Resumen' },
  { value: 'cultivation', label: 'Cultivo' },
  { value: 'photos', label: 'Fotografías' },
  { value: 'specimens', label: 'Ejemplares' },
]
const tab = ref('summary')

/**
 * La pauta como una sola lectura: es lo que se consulta de una especie. Las dos primeras filas no
 * existen todavía y llevan su marca; las cinco siguientes son reales.
 */
const conditions = computed(() => (species.value
  ? [
      { mark: '☼', label: 'Exposición', value: null, hint: 'Pleno sol, semisombra…', ticket: 'T-17', test: 'exposure' },
      { mark: '⌂', label: 'Entorno', value: null, hint: 'Interior o exterior', ticket: 'T-17', test: 'environment' },
      { mark: '↕', label: 'Temperatura', value: `${species.value.minTemperature}–${species.value.maxTemperature} °C`, hint: 'Rango que tolera en cultivo' },
      { mark: '◌', label: 'Humedad', value: `${species.value.minHumidity}–${species.value.maxHumidity} %`, hint: 'Evitar humedad persistente' },
      { mark: '☀', label: 'Luz', value: `${species.value.minLightHours}–${species.value.maxLightHours} h`, hint: 'Horas de luz al día' },
      { mark: '◇', label: 'Riego', value: species.value.wateringGuideline, hint: 'Orientativo: depende del ejemplar' },
    ]
  : []))

/**
 * El género es la primera palabra del binomio. **No es un dato inventado**, así que no se marca:
 * marcarlo sería mentir en la otra dirección.
 */
const genus = computed(() => species.value?.scientificName.trim().split(/\s+/)[0] ?? '')

/**
 * Las tres pautas anuales del prototipo, **sin actividad**: los periodos los trae T-17. La rejilla
 * se muestra igual, que es justo para lo que `UiYearGrid` admite filas vacías —ocultarla
 * convertiría «todavía no lo sé» en «esto no existe»—.
 */
const YEAR_ROWS = [
  { label: 'Crecimiento', levels: Array(12).fill(0), tone: 'brand' as const },
  { label: 'Floración', levels: Array(12).fill(0), tone: 'warning' as const },
  { label: 'Riego', levels: Array(12).fill(0), tone: 'info' as const },
]

const YEAR_LEGEND = [
  { tone: 'brand' as const, label: 'Crecimiento' },
  { tone: 'warning' as const, label: 'Floración habitual' },
  { tone: 'info' as const, label: 'Intensidad orientativa de riego' },
]

/** Los cuatro datos de floración del prototipo. Ninguno existe todavía. */
const FLOWERING = ['Periodo', 'Color', 'Madurez', 'Duración']

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
          <UiIdentityCode value="CAT · T-15" pending data-mock="true" />
          <UiStatus tone="ok">Ficha completa</UiStatus>
        </template>
        <template #context>
          <p class="hero__description" data-mock="true" data-test="description">
            La descripción botánica completará esta portada con rasgos, origen y comportamiento.
            <span>T-17</span>
          </p>
        </template>
        <template #visual>
          <div class="hero__media" data-mock="true" data-test="photos">
            <div class="hero__photo" role="img" aria-label="Sin fotografía principal">
              <span aria-hidden="true">✺</span>
              <small>Imagen principal · T-19</small>
            </div>
            <div class="hero__thumbs">
              <span v-for="n in 2" :key="n" aria-hidden="true">✺</span>
              <button type="button" disabled aria-label="Añadir fotografías con T-19">
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

      <UiTabs v-model="tab" :tabs="TABS" />

      <div v-if="tab === 'summary' || tab === 'cultivation'" class="species" data-test="cultivation-view">
        <div class="species__main">
          <!-- La rejilla anual del prototipo, con su forma aunque no tenga periodos. -->
          <section class="detail-section" data-mock="true" data-test="year-cycle">
            <UiSectionHeader
              title="Año de cultivo"
              description="Referencia para clima mediterráneo y cultivo exterior."
            >
              <template #actions><NuxtLink :to="`/species/${species.id}/edit#species-editor-seasons`">Editar periodos</NuxtLink></template>
            </UiSectionHeader>
            <div class="year-card">
              <UiYearGrid :rows="YEAR_ROWS" :legend="YEAR_LEGEND" />
              <p class="section-ticket">Los periodos se incorporarán con <strong>T-17</strong>.</p>
            </div>
          </section>

          <!-- Real salvo las dos primeras filas, que llevan su marca en la propia fila. -->
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
                :data-mock="item.ticket ? 'true' : undefined"
                :data-test="item.test"
              >
                <dt>
                  <span class="conditions__mark" aria-hidden="true">{{ item.mark }}</span>
                  {{ item.label }}
                </dt>
                <dd v-if="item.value">{{ item.value }}</dd>
                <dd v-else class="is-pending">— <small>{{ item.ticket }}</small></dd>
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

          <!-- La floración del prototipo: su forma, con los cuatro valores marcados. -->
          <section class="detail-section" data-mock="true" data-test="flowering">
            <UiSectionHeader title="Floración" description="Comportamiento habitual de la especie.">
              <template #actions><NuxtLink :to="`/species/${species.id}/edit#species-editor-seasons`">Editar</NuxtLink></template>
            </UiSectionHeader>
            <div class="flowering">
              <div class="flowering__figure" role="img" aria-label="Sin fotografía de floración">
                <span aria-hidden="true">✣</span>
              </div>
              <dl class="flowering__facts">
                <div v-for="fact in FLOWERING" :key="fact">
                  <dt>{{ fact }}</dt>
                  <dd>— <small>T-17</small></dd>
                </div>
              </dl>
              <p class="flowering__note">
                Las condiciones, el color y la duración se documentarán con <strong>T-17</strong>.
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
                <dd><code data-mock="true">CAT · T-15</code></dd>
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
                <dt>Mezcla recomendada</dt>
                <dd>{{ species.soilMix.name }}</dd>
              </div>
              <div>
                <dt>Ejemplares</dt>
                <dd class="is-pending">— <small>T-15</small></dd>
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

      <SpeciesPhotosPanel v-else-if="tab === 'photos'" :species-name="species.scientificName" />
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

.hero__photo {
  align-items: center;
  background:
    radial-gradient(circle at 50% 48%, var(--color-brand-soft) 0 19%, transparent 20% 34%),
    radial-gradient(circle at 50% 48%, var(--color-brand) 0 34%, var(--color-warning-soft) 35% 100%);
  border-radius: var(--radius-md);
  color: color-mix(in srgb, var(--color-surface) 72%, transparent);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  justify-content: center;
  min-height: 172px;
  overflow: hidden;
  position: relative;
}

.hero__photo span {
  font-size: var(--font-size-38);
}

.hero__photo small {
  background: color-mix(in srgb, var(--color-ink) 80%, transparent);
  border-radius: var(--radius-sm);
  bottom: var(--space-2);
  color: var(--color-surface);
  font-size: var(--font-size-11);
  padding: var(--space-1) var(--space-2);
  position: absolute;
  right: var(--space-2);
}

.hero__thumbs {
  display: grid;
  gap: var(--space-2);
  grid-template-columns: repeat(3, 1fr);
}

.hero__thumbs span,
.hero__thumbs button {
  align-items: center;
  background: var(--color-brand-soft);
  border: 0;
  border-radius: var(--radius-sm);
  color: color-mix(in srgb, var(--color-brand) 58%, transparent);
  display: flex;
  height: 58px;
  justify-content: center;
}

.hero__thumbs span:nth-child(2) {
  background: color-mix(in srgb, var(--color-info-soft) 72%, var(--color-brand-soft));
}

.hero__thumbs button {
  background: var(--color-canvas);
  border: 1px dashed var(--color-line-strong);
  color: var(--color-brand);
  flex-direction: column;
  opacity: 1;
}

.hero__thumbs button b { font-size: var(--font-size-17); }
.hero__thumbs button small { font-size: var(--font-size-11); }

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
