<script setup lang="ts">
/**
 * La ficha de una mezcla de sustrato, la pantalla `soil-mix-detail` del wireframe.
 *
 * **Todo es real**: receta, composición, rango de pH y cuántas especies la recomiendan. No hay
 * nada de maqueta que marcar, que es lo que la distingue de la ficha de planta.
 *
 * El recuento de especies no es adorno: decide si la mezcla se puede retirar, y avisa de a
 * cuántas especies alcanza corregirla.
 */
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'
import { useSoilMixes } from '@features/soil-mixes/composables/useSoilMixes'
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

const parts = computed(() => (mix.value
  ? [
      { label: 'Orgánico', value: mix.value.organicPercentage },
      { label: 'Mineral', value: mix.value.mineralPercentage },
    ]
  : []))

const speciesLabel = computed(() => {
  const count = mix.value?.speciesCount ?? 0
  return count === 1 ? '1 especie la recomienda' : `${count} especies la recomiendan`
})

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
      <UiPageHeader :title="mix.name" :context="speciesLabel">
        <template #actions>
          <UiButton variant="secondary" :to="`/soil-mixes/${mix.id}/edit`" data-test="edit-soil-mix">
            Corregir
          </UiButton>
          <UiButton variant="secondary" data-test="remove-soil-mix" @click="confirming = true">
            Retirar
          </UiButton>
        </template>
      </UiPageHeader>

      <UiInlineError v-if="removeError" data-test="remove-error">{{ removeError }}</UiInlineError>

      <div class="mix">
        <UiPanel title="Composición">
          <UiProportionBar :parts="parts" />
        </UiPanel>

        <UiPanel title="Propiedades de cultivo">
          <dl class="mix__facts">
            <div>
              <dt>Rango de pH</dt>
              <dd>{{ mix.phMin }} – {{ mix.phMax }}</dd>
            </div>
            <div>
              <dt>Receta de referencia</dt>
              <dd data-test="recipe">{{ mix.description ?? '—' }}</dd>
            </div>
            <div>
              <dt>Especies que la recomiendan</dt>
              <dd data-test="species-count">{{ mix.speciesCount }}</dd>
            </div>
          </dl>
        </UiPanel>
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
.mix {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.mix__facts {
  display: grid;
  gap: var(--space-3);
  margin: 0;
}

.mix__facts dt {
  color: var(--color-ink-muted);
  font-size: var(--font-size-11);
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.mix__facts dd {
  font-size: var(--font-size-15);
  margin: 0;
}
</style>
