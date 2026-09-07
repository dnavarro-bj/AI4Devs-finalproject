<script setup lang="ts">
/**
 * La ficha de una mezcla de sustrato, con la composición de la pantalla `soil-mix-detail` del
 * prototipo: portada con la rueda, columna principal con receta, propiedades y uso, y lateral con
 * la ficha, el impacto de los cambios y la preparación.
 *
 * **La composición abre la pantalla porque es la identidad de la receta**, no un dato más. Y el
 * rango de pH va sobre su escala: 5,8 no dice nada a quien no la tenga memorizada.
 *
 * **Híbrida, y marcada.** Real: nombre, composición, rango de pH, receta y cuántas especies la
 * recomiendan. Lo que el prototipo enseña y el API no sirve —el desglose de componentes, el
 * drenaje y la retención, las especies concretas que la usan y las notas de preparación— declara
 * su ticket en la pantalla. Aquí la tentación de rellenarlo es mayor justamente porque el
 * prototipo enseña unos datos muy convincentes.
 */
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'
import { useSoilMixes } from '@features/soil-mixes/composables/useSoilMixes'
import { phQuality } from '@features/soil-mixes/composables/phQuality'
import { isNotFound } from '@shared/services/errorNormalizer'
import type { SoilMixDetail } from '@features/soil-mixes/types/soilMix.types'
import type { DomainError } from '@shared/types/api.types'

const route = useRoute()
const id = String(route.params.id)

const { detail, remove } = useSoilMixes()
const { set: setBreadcrumbs } = useBreadcrumbs()

const mix = ref<SoilMixDetail | null>(null)
const loading = ref(true)
const error = ref<DomainError | null>(null)

const confirming = ref(false)
const removing = ref(false)
const removeError = ref<string | null>(null)

setBreadcrumbs([
  { label: 'Mezclas de sustrato', to: '/soil-mixes' },
  { label: 'Ficha de mezcla' },
])

const notFound = computed(() => !loading.value && isNotFound(error.value))

/** El tono es de la pantalla, no del kit: el componente no sabe qué es «orgánico». */
const parts = computed(() => (mix.value
  ? [
      { label: 'Orgánico', value: mix.value.organicPercentage, tone: 'warning' as const },
      { label: 'Mineral', value: mix.value.mineralPercentage, tone: 'info' as const },
    ]
  : []))

/** El sujeto sin la cifra: la portada la destaca aparte, y así no hay que recortarla con una regex. */
const speciesPhrase = computed(
  () => ((mix.value?.speciesCount ?? 0) === 1 ? 'especie la recomienda' : 'especies la recomiendan'),
)

const speciesLabel = computed(() => `${mix.value?.speciesCount ?? 0} ${speciesPhrase.value}`)

const quality = computed(() => (mix.value ? phQuality(mix.value.phMin, mix.value.phMax) : ''))

const canRemove = computed(() => (mix.value?.speciesCount ?? 0) === 0)

async function load() {
  loading.value = true
  error.value = null

  const result = await detail(id)
  loading.value = false

  if (!result.success) {
    error.value = result.error
    return
  }
  mix.value = result.data!
  setBreadcrumbs([
    { label: 'Mezclas de sustrato', to: '/soil-mixes' },
    { label: result.data!.name },
  ])
  useHead({ title: `Cactify · ${result.data!.name}` })
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
      || 'No se puede retirar mientras alguna especie la recomiende.'
    confirming.value = false
    return
  }

  confirming.value = false
  await navigateTo('/soil-mixes')
}

onMounted(load)
</script>

<template>
  <section>
    <p v-if="loading" data-test="loading" role="status">Cargando la mezcla…</p>

    <UiEmptyState
      v-else-if="notFound"
      title="Esta mezcla no existe"
      data-test="not-found"
      mark="◌"
    >
      Puede que se haya retirado del catálogo.
      <template #action>
        <UiButton to="/soil-mixes">Volver al catálogo</UiButton>
      </template>
    </UiEmptyState>

    <UiInlineError v-else-if="error" data-test="error">{{ error.message }}</UiInlineError>

    <template v-else-if="mix">
      <!-- La portada: la composición manda, porque es lo que la mezcla es. -->
      <article class="hero">
        <UiProportionWheel :parts="parts" data-test="composition-wheel" />

        <div class="hero__identity">
          <p class="hero__eyebrow">
            <UiStatus :tone="canRemove ? 'neutral' : 'ok'">
              {{ canRemove ? 'Sin uso' : 'En uso' }}
            </UiStatus>
          </p>
          <h1>{{ mix.name }}</h1>
          <p class="hero__recipe" data-test="recipe">{{ mix.description ?? '—' }}</p>
          <p class="hero__use">
            <span data-test="species-count">
              <strong>{{ mix.speciesCount }}</strong> {{ speciesPhrase }}
            </span>
          </p>
        </div>

        <div class="hero__actions">
          <UiButton :to="`/soil-mixes/${mix.id}/edit`" data-test="edit-soil-mix">Editar mezcla</UiButton>
          <UiButton variant="secondary" data-test="remove-soil-mix" @click="confirming = true">
            Retirar
          </UiButton>
        </div>
      </article>

      <UiInlineError v-if="removeError" class="hero-error" data-test="remove-error">
        {{ removeError }}
      </UiInlineError>

      <div class="layout">
        <div class="layout__main">
          <UiPanel title="Receta de referencia">
            <p class="hint">Las proporciones se expresan sobre el volumen total preparado.</p>
            <div data-test="recipe-bar">
              <UiProportionBar :parts="parts" labels="inside" />
            </div>

            <div class="components" data-mock="true" data-test="components">
              <p class="pending">
                El desglose de cada parte —qué componentes la forman y en qué medida— llega con
                <strong>T-27</strong>: el API guarda la receta como un texto libre, no como una
                lista de componentes.
              </p>
            </div>
          </UiPanel>

          <UiPanel title="Propiedades de cultivo">
            <p class="hint">Referencia para elegir y revisar la mezcla.</p>

            <div class="ph">
              <div class="ph__value">
                <span>Rango de pH</span>
                <strong>{{ mix.phMin }}–{{ mix.phMax }}</strong>
                <small data-test="ph-quality">{{ quality }}</small>
              </div>
              <UiScale
                :min="0"
                :max="14"
                :from="mix.phMin"
                :to="mix.phMax"
                low-label="Ácido"
                high-label="Alcalino"
                label="Rango de pH"
                data-test="ph-scale"
              />
            </div>

            <div data-mock="true" data-test="properties">
              <p class="pending">
                El drenaje y la retención esperados llegan con <strong>T-27</strong>: hoy no se
                derivan de la composición ni se guardan.
              </p>
            </div>
          </UiPanel>

          <UiPanel title="Especies que la recomiendan" data-mock="true" data-test="species-usage">
            <p class="hint">{{ speciesLabel }}.</p>
            <p class="pending">
              El catálogo de especies todavía no se puede filtrar por mezcla, así que no se pueden
              listar aquí: llega con <strong>T-21</strong>. El recuento sí es real.
            </p>
          </UiPanel>
        </div>

        <aside class="layout__side">
          <UiPanel title="Ficha de la mezcla">
            <dl class="facts">
              <div>
                <dt>Orgánico</dt>
                <dd>{{ mix.organicPercentage }} %</dd>
              </div>
              <div>
                <dt>Mineral</dt>
                <dd>{{ mix.mineralPercentage }} %</dd>
              </div>
              <div>
                <dt>pH mínimo</dt>
                <dd>{{ mix.phMin }}</dd>
              </div>
              <div>
                <dt>pH máximo</dt>
                <dd>{{ mix.phMax }}</dd>
              </div>
            </dl>
          </UiPanel>

          <UiPanel title="Impacto de los cambios">
            <p class="hint">
              Corregir esta receta actualizará la recomendación de {{ mix.speciesCount }}
              {{ mix.speciesCount === 1 ? 'especie' : 'especies' }}. Las mediciones y los
              trasplantes ya registrados no cambian.
            </p>
          </UiPanel>

          <UiPanel title="Preparación" data-mock="true" data-test="preparation">
            <p class="pending">
              Las notas de preparación —tamizado, lavado, pH del agua— llegan con
              <strong>T-27</strong>.
            </p>
          </UiPanel>
        </aside>
      </div>

      <UiDialog
        :open="confirming"
        title="Retirar la mezcla del catálogo"
        data-test="remove-dialog"
        @close="confirming = false"
      >
        <p v-if="canRemove">
          «{{ mix.name }}» dejará de estar disponible para nuevas especies. No la recomienda
          ninguna, así que no afecta a ninguna ficha.
        </p>
        <p v-else>
          «{{ mix.name }}» la recomiendan {{ mix.speciesCount }} especies. Cámbiales la mezcla
          antes de retirarla.
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
  align-items: center;
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-lg);
  display: flex;
  gap: var(--space-5);
  margin-bottom: var(--space-4);
  padding: var(--space-5);
}

.hero__identity {
  flex: 1;
  min-width: 0;
}

.hero__eyebrow {
  margin: 0 0 var(--space-2);
}

.hero__identity h1 {
  font-size: var(--font-size-24);
  margin: 0;
}

.hero__recipe {
  color: var(--color-ink-muted);
  font-size: var(--font-size-13);
  margin: var(--space-1) 0 0;
}

.hero__use {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  margin: var(--space-3) 0 0;
}

.hero__use strong {
  color: var(--color-ink);
  font-size: var(--font-size-15);
}

.hero__actions {
  display: flex;
  flex-shrink: 0;
  gap: var(--space-2);
}

.hero-error {
  margin-bottom: var(--space-4);
}

.layout {
  align-items: start;
  display: grid;
  gap: var(--space-4);
  grid-template-columns: 2fr 1fr;
}

.layout__main,
.layout__side {
  align-content: start;
  display: grid;
  gap: var(--space-4);
}

.hint {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  margin: 0 0 var(--space-3);
}

/* Lo pendiente se lee como pendiente: no compite con el dato real. */
.pending {
  border: 1px dashed var(--color-line-strong);
  border-radius: var(--radius-sm);
  color: var(--color-ink-faint);
  font-size: var(--font-size-12);
  margin: 0;
  padding: var(--space-3);
}

.components {
  margin-top: var(--space-4);
}

.ph {
  display: grid;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.ph__value span {
  color: var(--color-ink-muted);
  display: block;
  font-size: var(--font-size-11);
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.ph__value strong {
  font-size: var(--font-size-17);
}

.ph__value small {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  margin-left: var(--space-2);
}

.facts {
  display: grid;
  gap: var(--space-2);
  margin: 0;
}

.facts > div {
  display: flex;
  justify-content: space-between;
}

.facts dt {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
}

.facts dd {
  font-size: var(--font-size-13);
  font-weight: 700;
  margin: 0;
}

@media (max-width: 900px) {
  .layout {
    grid-template-columns: 1fr;
  }

  .hero {
    flex-wrap: wrap;
  }
}
</style>
