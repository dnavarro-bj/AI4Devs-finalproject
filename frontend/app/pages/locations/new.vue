<script setup lang="ts">
/**
 * Alta de una localización con la composición `location-editor` del prototipo. Desde «Añadir
 * dentro» de una ficha llega con `?parent=` y la posición ya elegida.
 */
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'
import { useLocations } from '@features/locations/composables/useLocations'
import { locationSubmitError, type LocationSubmitError } from '@features/locations/composables/locationSubmitError'
import { emptyLocationInput } from '@features/locations/mappers/locationInput'
import LocationForm from '@features/locations/components/LocationForm.vue'
import type { LocationInput } from '@features/locations/types/location.types'

useHead({ title: 'Cactify · Nueva localización' })
useBreadcrumbs().set([
  { label: 'Localizaciones', to: '/locations' },
  { label: 'Nueva localización' },
])

const route = useRoute()
const { create } = useLocations()

const queryParent = route.query.parent
const initial = emptyLocationInput(typeof queryParent === 'string' && queryParent ? queryParent : null)

const submitting = ref(false)
const submitError = ref<LocationSubmitError | null>(null)

async function save(input: LocationInput) {
  submitting.value = true
  submitError.value = null

  const result = await create(input)
  submitting.value = false

  if (!result.success) {
    submitError.value = locationSubmitError(result.error!)
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
      :initial="initial"
      :submitting="submitting"
      :submit-error="submitError"
      @submit="save"
    />
  </section>
</template>
