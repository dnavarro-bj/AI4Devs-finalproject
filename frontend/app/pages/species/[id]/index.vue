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
      <!-- La portada del prototipo: identidad a la izquierda, fotografías a la derecha. -->
      <article class="hero">
        <div class="hero__identity">
          <p class="hero__eyebrow">
            <code data-mock="true">CAT · T-15</code>
            <span>Ficha completa</span>
          </p>
          <h1><em>{{ species.scientificName }}</em></h1>
          <p class="hero__common">{{ species.commonName }}</p>
          <p class="hero__description" data-mock="true" data-test="description">
            La descripción de la especie llega con <strong>T-17</strong>.
          </p>

          <div class="hero__actions">
            <UiButton :to="`/species/${species.id}/edit`" data-test="edit-species">Editar especie</UiButton>
            <UiButton variant="secondary" disabled data-mock="true">Ver ejemplares</UiButton>
            <UiButton variant="secondary" data-test="remove-species" @click="confirming = true">
              Retirar
            </UiButton>
          </div>
        </div>

        <div class="hero__media" data-mock="true" data-test="photos">
          <div class="hero__photo" role="img" aria-label="Sin fotografía">
            <span aria-hidden="true">✺</span>
            <small>Fotografías · T-19</small>
          </div>
          <div class="hero__thumbs" aria-hidden="true">
            <span v-for="n in 3" :key="n" />
          </div>
        </div>
      </article>

      <UiInlineError v-if="removeError" class="hero-error" data-test="remove-error">
        {{ removeError }}
      </UiInlineError>

      <UiTabs v-model="tab" :tabs="TABS" />

      <div class="species">
        <div class="species__main">
          <!-- La rejilla anual del prototipo, con su forma aunque no tenga periodos. -->
          <UiPanel title="Año de cultivo" data-mock="true" data-test="year-cycle">
            <p class="species__hint">
              Referencia anual de la especie. Los periodos de crecimiento, floración y riego llegan
              con <strong>T-17</strong>: la rejilla enseña su forma, todavía sin marcar ningún mes.
            </p>
            <UiYearGrid :rows="YEAR_ROWS" :legend="YEAR_LEGEND" />
          </UiPanel>

          <!-- Real salvo las dos primeras filas, que llevan su marca en la propia fila. -->
          <UiPanel title="Condiciones recomendadas" data-test="conditions">
            <p class="species__hint">Estos valores los heredan los ejemplares que no los personalicen.</p>

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
          </UiPanel>

          <!-- La floración del prototipo: su forma, con los cuatro valores marcados. -->
          <UiPanel title="Floración" data-mock="true" data-test="flowering">
            <p class="species__hint">
              Comportamiento habitual de la especie. Llega con <strong>T-17</strong>.
            </p>
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
            </div>
          </UiPanel>

          <!-- Las filas de ejemplares del prototipo, con su forma y sin datos inventados. -->
          <UiPanel title="Ejemplares de esta especie" data-mock="true" data-test="specimens">
            <p class="species__hint">
              El inventario todavía no filtra por especie, así que no se pueden listar ni contar
              aquí: llega con <strong>T-15</strong>.
            </p>
            <div class="specimens">
              <div v-for="n in 3" :key="n" class="specimens__row">
                <span class="specimens__thumb" aria-hidden="true">♧</span>
                <span class="specimens__name">— <small>T-15</small></span>
                <span class="specimens__where">—</span>
                <span class="specimens__state">—</span>
              </div>
            </div>
          </UiPanel>
        </div>

        <aside class="species__aside">
          <UiPanel title="Ficha de catálogo">
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
          <UiPanel title="Grupos de cultivo" data-mock="true" data-test="groups">
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

          <UiPanel title="Herencia activa">
            <p class="species__hint">
              Si corriges un valor, se actualizará en todos los ejemplares que no lo hayan
              personalizado. Las lecturas ya registradas no cambian.
            </p>
          </UiPanel>
        </aside>
      </div>

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
.hero {
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-lg);
  display: grid;
  gap: var(--space-5);
  grid-template-columns: 1fr 260px;
  margin-bottom: var(--space-4);
  padding: var(--space-5);
}

.hero__eyebrow {
  align-items: center;
  color: var(--color-ink-faint);
  display: flex;
  font-size: var(--font-size-11);
  gap: var(--space-2);
  margin: 0 0 var(--space-2);
  text-transform: uppercase;
}

.hero__eyebrow code {
  border: 1px dashed var(--color-line-strong);
  font-family: var(--font-mono);
  padding: 0 2px;
}

.hero__identity h1 {
  font-size: var(--font-size-24);
  margin: 0;
}

.hero__common {
  color: var(--color-ink-muted);
  font-size: var(--font-size-15);
  margin: var(--space-1) 0 0;
}

.hero__description {
  border: 1px dashed var(--color-line-strong);
  border-radius: var(--radius-sm);
  color: var(--color-ink-faint);
  font-size: var(--font-size-12);
  margin: var(--space-3) 0 0;
  padding: var(--space-2) var(--space-3);
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-4);
}

.hero__media {
  display: grid;
  gap: var(--space-2);
}

.hero__photo {
  align-items: center;
  background: var(--color-surface-muted);
  border: 1px dashed var(--color-line-strong);
  border-radius: var(--radius-md);
  color: var(--color-ink-faint);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  justify-content: center;
  min-height: 150px;
}

.hero__photo span {
  font-size: var(--font-size-38);
}

.hero__photo small {
  font-size: var(--font-size-11);
}

.hero__thumbs {
  display: grid;
  gap: var(--space-2);
  grid-template-columns: repeat(3, 1fr);
}

.hero__thumbs span {
  background: var(--color-surface-muted);
  border: 1px dashed var(--color-line-strong);
  border-radius: var(--radius-sm);
  height: 44px;
}

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

.species__hint {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  margin: 0 0 var(--space-3);
}

/* Las condiciones se leen en rejilla: siete magnitudes de un vistazo, no una lista larga. */
.conditions {
  display: grid;
  gap: var(--space-3);
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  margin: 0;
}

.conditions > div {
  background: var(--color-surface-muted);
  border-radius: var(--radius-sm);
  padding: var(--space-3);
}

.conditions > div[data-mock] {
  background: transparent;
  border: 1px dashed var(--color-line-strong);
}

.conditions__mark {
  color: var(--color-brand);
  margin-right: var(--space-1);
}

.conditions small {
  color: var(--color-ink-faint);
  display: block;
  font-size: var(--font-size-11);
  margin-top: var(--space-1);
}

.flowering {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: 96px 1fr;
}

.flowering__figure {
  align-items: center;
  background: var(--color-surface-muted);
  border: 1px dashed var(--color-line-strong);
  border-radius: var(--radius-md);
  color: var(--color-ink-faint);
  display: flex;
  font-size: var(--font-size-24);
  justify-content: center;
  min-height: 96px;
}

.flowering__facts {
  display: grid;
  gap: var(--space-3);
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  margin: 0;
}

.specimens {
  display: grid;
  gap: var(--space-2);
}

.specimens__row {
  align-items: center;
  border: 1px dashed var(--color-line-strong);
  border-radius: var(--radius-sm);
  display: grid;
  gap: var(--space-3);
  grid-template-columns: 32px 1fr auto auto;
  padding: var(--space-2) var(--space-3);
}

.specimens__thumb {
  align-items: center;
  background: var(--color-surface-muted);
  border-radius: var(--radius-sm);
  color: var(--color-ink-faint);
  display: flex;
  height: 32px;
  justify-content: center;
  width: 32px;
}

.specimens__row span:not(.specimens__thumb) {
  color: var(--color-ink-faint);
  font-size: var(--font-size-12);
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
.flowering__facts dd small,
.specimens__name small {
  border: 1px dashed var(--color-line-strong);
  font-size: var(--font-size-11);
  padding: 0 2px;
}

@media (max-width: 900px) {
  .hero,
  .species {
    grid-template-columns: 1fr;
  }
}
</style>
