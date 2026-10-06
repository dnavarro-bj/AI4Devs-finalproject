<script setup lang="ts">
/** El alta de una mezcla de sustrato: el formulario compartido, más a dónde va al guardar. */
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'
import { useSoilMixes } from '@features/soil-mixes/composables/useSoilMixes'
import SoilMixForm from '@features/soil-mixes/components/SoilMixForm.vue'
import type { SoilMixInput } from '@features/soil-mixes/types/soilMix.types'

useHead({ title: 'Cactify · Nuevo sustrato' })
useBreadcrumbs().set([
  { label: 'Sustratos', to: '/soil-mixes' },
  { label: 'Nuevo sustrato' },
])

const { create } = useSoilMixes()

const submitting = ref(false)
const submitError = ref<string | null>(null)

async function save(input: SoilMixInput) {
  submitting.value = true
  submitError.value = null

  const result = await create(input)
  submitting.value = false

  if (!result.success) {
    // El mensaje del API tal cual: lo escribe quien conoce la regla que se ha roto.
    submitError.value = result.error!.message
    return
  }

  await navigateTo(`/soil-mixes/${result.data!.id}`)
}
</script>

<template>
  <section>
    <UiPageHeader
      title="Nuevo sustrato"
      context="Define una receta reutilizable y su rango de pH recomendado."
    />
    <SoilMixForm
      :submitting="submitting"
      :submit-error="submitError"
      submit-label="Guardar sustrato"
      impact="El nuevo sustrato estará disponible en el catálogo."
      @submit="save"
    />
  </section>
</template>
