<script setup lang="ts">
/**
 * La corrección de una especie: el mismo formulario que el alta, prellenado.
 *
 * Corregir alcanza a **todos** los ejemplares de la especie que no hayan personalizado el valor,
 * porque la pauta se hereda por referencia. La cabecera lo dice antes de tocar nada.
 */
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'
import { useSpecies } from '@features/species/composables/useSpecies'
import SpeciesForm, { type SpeciesSubmitError } from '@features/species/components/SpeciesForm.vue'
import { isNotFound } from '@shared/services/errorNormalizer'
import { speciesToInput } from '@features/species/mappers/speciesCultivation'
import { speciesSubmitError } from '@features/species/composables/speciesSubmitError'
import type { SpeciesDetail, SpeciesInput } from '@features/species/types/species.types'
import type { DomainError } from '@shared/types/api.types'

const route = useRoute()
const id = String(route.params.id)

const { detail, update } = useSpecies()
const { set: setBreadcrumbs } = useBreadcrumbs()

const species = ref<SpeciesDetail | null>(null)
const loading = ref(true)
const loadError = ref<DomainError | null>(null)

const submitting = ref(false)
const submitError = ref<SpeciesSubmitError | null>(null)

useHead({ title: 'Cactify · Editar especie' })
setBreadcrumbs([{ label: 'Especies', to: '/species' }, { label: 'Editar especie' }])

const notFound = computed(() => !loading.value && isNotFound(loadError.value))

/**
 * La ficha se convierte en cuerpo de la corrección tal cual, **mezcla incluida**: el `PUT` es
 * reemplazo completo, así que omitirla la cambiaría. Por eso el API la devuelve. Lo mismo vale para la
 * ficha de cultivo y el calendario: `speciesToInput` parte de todo lo guardado.
 */
const initial = computed<SpeciesInput | undefined>(() => (species.value ? speciesToInput(species.value) : undefined))

async function save(input: SpeciesInput) {
  submitting.value = true
  submitError.value = null

  const result = await update(id, input)
  submitting.value = false

  if (!result.success) {
    submitError.value = speciesSubmitError(result.error!)
    return
  }

  await navigateTo(`/species/${id}`)
}

onMounted(async () => {
  const result = await detail(id)
  loading.value = false

  if (!result.success) {
    loadError.value = result.error
    return
  }
  species.value = result.data!
  setBreadcrumbs([
    { label: 'Especies', to: '/species' },
    { label: result.data!.scientificName, to: `/species/${id}` },
    { label: 'Editar' },
  ])
})
</script>

<template>
  <section>
    <p v-if="loading" data-test="loading" role="status">Cargando la especie…</p>

    <UiEmptyState v-else-if="notFound" title="Esta especie no existe" data-test="not-found" mark="◌">
      No se puede corregir algo que ya no está en el catálogo.
      <template #action>
        <UiButton to="/species">Volver al catálogo</UiButton>
      </template>
    </UiEmptyState>

    <UiInlineError v-else-if="loadError" data-test="error">{{ loadError.message }}</UiInlineError>

    <template v-else-if="species && initial">
      <UiPageHeader
        :title="`Editar «${species.scientificName}»`"
        context="Los cambios los heredan los ejemplares que no hayan personalizado el valor."
      />
      <SpeciesForm
        :initial="initial"
        :plant-count="species.plantCount"
        :species-id="species.id"
        :species-name="species.scientificName"
        :submitting="submitting"
        :submit-error="submitError"
        submit-label="Guardar cambios"
        @submit="save"
      />
    </template>
  </section>
</template>
