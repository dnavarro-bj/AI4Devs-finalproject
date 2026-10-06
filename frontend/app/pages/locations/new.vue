<script setup lang="ts">
/** Alta de una localización con la composición `location-editor` del wireframe. */
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'
import { useCatalogs } from '@features/catalogs/composables/useCatalogs'
import LocationForm from '@features/catalogs/components/LocationForm.vue'

useHead({ title: 'Cactify · Nueva localización' })
useBreadcrumbs().set([
  { label: 'Localizaciones', to: '/locations' },
  { label: 'Nueva localización' },
])

const { createLocation } = useCatalogs()
const submitting = ref(false)
const submitError = ref<string | null>(null)

async function save(name: string) {
  submitting.value = true
  submitError.value = null

  const result = await createLocation(name)
  submitting.value = false

  if (!result.success) {
    submitError.value = result.error!.message || 'No se ha podido crear la localización.'
    return
  }

  await navigateTo(`/locations/${result.data!.id}`)
}
</script>

<template>
  <section>
    <UiPageHeader
      title="Nueva localización"
      context="Sitúala dentro del vivero para que plantas, tareas y alertas hereden una ruta clara."
    />
    <LocationForm
      :submitting="submitting"
      :submit-error="submitError"
      @submit="save"
    />
  </section>
</template>
