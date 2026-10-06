<script setup lang="ts">
/**
 * Alta de una planta. Usa **el mismo formulario que la edición** (§5.4): reutilizarlo evita
 * duplicar reglas de validación y dos experiencias que deberían ser la misma.
 */
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'
import { usePlants } from '@features/plants/composables/usePlants'
import type { PlantFormValues } from '@features/plants/components/PlantForm.vue'
import { toProfile } from '@features/plants/mappers/plantProfile'

const { create } = usePlants()
const { set: setBreadcrumbs } = useBreadcrumbs()

setBreadcrumbs([{ label: 'Inventario', to: '/plants' }, { label: 'Añadir planta' }])

const submitting = ref(false)
const error = ref<string | null>(null)

async function onSubmit(values: PlantFormValues) {
  error.value = null
  submitting.value = true

  // `activa` es el estado por defecto del API: solo viaja si se ha elegido otro en curso.
  const result = await create(
    values.nickname,
    values.locationId,
    values.speciesId,
    toProfile(values),
    values.status === 'activa' ? undefined : values.status,
  )
  submitting.value = false

  if (!result.success) {
    // Se conserva lo escrito: el usuario corrige y reintenta sin volver a teclearlo.
    error.value = result.error!.message
    return
  }
  await navigateTo(`/plants/${result.data!.id}`)
}
</script>

<template>
  <section>
    <UiPageHeader title="Añadir planta" />

    <UiInlineError v-if="error" data-test="error" class="form__error">{{ error }}</UiInlineError>

    <PlantForm :submitting="submitting" submit-label="Crear planta" @submit="onSubmit" />
  </section>
</template>

<style scoped>
.form__error {
  margin-bottom: var(--space-4);
}
</style>
