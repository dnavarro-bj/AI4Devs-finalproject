<script setup lang="ts">
/** El alta de una especie: el formulario compartido, más a dónde va al guardar. */
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'
import { useSpecies } from '@features/species/composables/useSpecies'
import SpeciesForm, { type SpeciesSubmitError } from '@features/species/components/SpeciesForm.vue'
import type { SpeciesInput } from '@features/species/types/species.types'
import { ErrorCodes } from '@shared/types/api.types'

useHead({ title: 'Cactify · Registrar especie' })
useBreadcrumbs().set([{ label: 'Especies', to: '/species' }, { label: 'Registrar especie' }])

const { create } = useSpecies()

const submitting = ref(false)
const submitError = ref<SpeciesSubmitError | null>(null)

async function save(input: SpeciesInput) {
  submitting.value = true
  submitError.value = null

  const result = await create(input)
  submitting.value = false

  if (!result.success) {
    // Un `409` en el alta solo puede ser el nombre científico: se ata a ese campo, no a la pantalla.
    submitError.value = {
      field: result.error!.code === ErrorCodes.CONFLICT ? 'scientificName' : null,
      message: result.error!.message,
    }
    return
  }

  await navigateTo(`/species/${result.data!.id}`)
}
</script>

<template>
  <section>
    <UiPageHeader
      title="Registrar especie"
      context="Define la información que heredarán sus ejemplares."
    />
    <SpeciesForm
      :submitting="submitting"
      :submit-error="submitError"
      submit-label="Registrar especie"
      @submit="save"
    />
  </section>
</template>
