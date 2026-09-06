<script setup lang="ts">
/**
 * La corrección de una mezcla: el mismo formulario que el alta, prellenado.
 *
 * Corregir alcanza a **todas** las especies que la recomiendan, porque la relación es por
 * referencia y no por copia. La cabecera lo dice antes de tocar nada.
 */
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'
import { useSoilMixes } from '@features/soil-mixes/composables/useSoilMixes'
import SoilMixForm from '@features/soil-mixes/components/SoilMixForm.vue'
import { isNotFound } from '@shared/services/errorNormalizer'
import type { SoilMixDetail, SoilMixInput } from '@features/soil-mixes/types/soilMix.types'
import type { DomainError } from '@shared/types/api.types'

const route = useRoute()
const id = String(route.params.id)

const { detail, update } = useSoilMixes()
const { set: setBreadcrumbs } = useBreadcrumbs()

const mix = ref<SoilMixDetail | null>(null)
const loading = ref(true)
const loadError = ref<DomainError | null>(null)

const submitting = ref(false)
const submitError = ref<string | null>(null)

useHead({ title: 'Cactify · Corregir mezcla' })
setBreadcrumbs([
  { label: 'Mezclas de sustrato', to: '/soil-mixes' },
  { label: 'Corregir mezcla' },
])

const notFound = computed(() => !loading.value && isNotFound(loadError.value))

const initial = computed<SoilMixInput | undefined>(() => (mix.value
  ? {
      name: mix.value.name,
      organicPercentage: mix.value.organicPercentage,
      mineralPercentage: mix.value.mineralPercentage,
      phMin: mix.value.phMin,
      phMax: mix.value.phMax,
      description: mix.value.description,
    }
  : undefined))

const reach = computed(() => {
  const count = mix.value?.speciesCount ?? 0
  if (count === 0) return 'Ninguna especie la recomienda todavía.'
  return count === 1
    ? 'Corregirla alcanza a 1 especie que la recomienda.'
    : `Corregirla alcanza a ${count} especies que la recomiendan.`
})

async function save(input: SoilMixInput) {
  submitting.value = true
  submitError.value = null

  const result = await update(id, input)
  submitting.value = false

  if (!result.success) {
    submitError.value = result.error!.message
    return
  }

  await navigateTo(`/soil-mixes/${id}`)
}

onMounted(async () => {
  const result = await detail(id)
  loading.value = false

  if (!result.success) {
    loadError.value = result.error
    return
  }
  mix.value = result.data!
  setBreadcrumbs([
    { label: 'Mezclas de sustrato', to: '/soil-mixes' },
    { label: result.data!.name, to: `/soil-mixes/${id}` },
    { label: 'Corregir' },
  ])
})
</script>

<template>
  <section>
    <p v-if="loading" data-test="loading" role="status">Cargando la mezcla…</p>

    <UiEmptyState v-else-if="notFound" title="Esta mezcla no existe" data-test="not-found" mark="◌">
      No se puede corregir algo que ya no está en el catálogo.
      <template #action>
        <UiButton to="/soil-mixes">Volver al catálogo</UiButton>
      </template>
    </UiEmptyState>

    <UiInlineError v-else-if="loadError" data-test="error">{{ loadError.message }}</UiInlineError>

    <template v-else-if="mix && initial">
      <UiPageHeader :title="`Corregir «${mix.name}»`" :context="reach" />
      <SoilMixForm
        :initial="initial"
        :submitting="submitting"
        :submit-error="submitError"
        submit-label="Guardar cambios"
        @submit="save"
      />
    </template>
  </section>
</template>
