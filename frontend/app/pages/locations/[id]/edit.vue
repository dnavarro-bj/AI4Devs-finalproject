<script setup lang="ts">
/**
 * La corrección de una localización: el mismo formulario que el alta, prellenado.
 *
 * Es **reemplazo completo**, y cambiar el padre **mueve la localización con todo su contenido**:
 * los ejemplares no cambian de localización, solo cambia la ruta, que se calcula. El selector de
 * padre no ofrece la propia localización ni sus descendientes.
 */
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'
import { useLocations } from '@features/locations/composables/useLocations'
import { locationSubmitError, type LocationSubmitError } from '@features/locations/composables/locationSubmitError'
import { locationToInput } from '@features/locations/mappers/locationInput'
import LocationForm from '@features/locations/components/LocationForm.vue'
import { isNotFound } from '@shared/services/errorNormalizer'
import type { LocationDetail, LocationInput } from '@features/locations/types/location.types'
import type { DomainError } from '@shared/types/api.types'

const route = useRoute()
const id = String(route.params.id)

const { detail, update } = useLocations()
const { set: setBreadcrumbs } = useBreadcrumbs()

const location = ref<LocationDetail | null>(null)
const loading = ref(true)
const loadError = ref<DomainError | null>(null)

const submitting = ref(false)
const submitError = ref<LocationSubmitError | null>(null)

useHead({ title: 'Cactify · Editar localización' })
setBreadcrumbs([{ label: 'Localizaciones', to: '/locations' }, { label: 'Editar localización' }])

const notFound = computed(() => !loading.value && isNotFound(loadError.value))
const initial = computed<LocationInput | undefined>(() => (location.value ? locationToInput(location.value) : undefined))

async function save(input: LocationInput) {
  submitting.value = true
  submitError.value = null

  const result = await update(id, input)
  submitting.value = false

  if (!result.success) {
    submitError.value = locationSubmitError(result.error!)
    return
  }

  await navigateTo(`/locations/${id}`)
}

onMounted(async () => {
  const result = await detail(id)
  loading.value = false

  if (!result.success) {
    loadError.value = result.error
    return
  }
  location.value = result.data!
  setBreadcrumbs([
    { label: 'Localizaciones', to: '/locations' },
    ...result.data!.ancestors.map((ancestor) => ({ label: ancestor.name, to: `/locations/${ancestor.id}` })),
    { label: result.data!.name, to: `/locations/${id}` },
    { label: 'Editar' },
  ])
})
</script>

<template>
  <section>
    <p v-if="loading" data-test="loading" role="status">Cargando la localización…</p>

    <UiEmptyState v-else-if="notFound" title="Esta localización no existe" data-test="not-found" mark="◌">
      No se puede corregir algo que ya no está en el catálogo.
      <template #action>
        <UiButton to="/locations">Volver al catálogo</UiButton>
      </template>
    </UiEmptyState>

    <UiInlineError v-else-if="loadError" data-test="error">{{ loadError.message }}</UiInlineError>

    <template v-else-if="location && initial">
      <UiPageHeader
        :title="`Editar «${location.name}»`"
        context="Cambiar el padre mueve la localización con todo su contenido; los ejemplares no cambian de sitio."
      />
      <LocationForm
        :initial="initial"
        :editing-id="id"
        :submitting="submitting"
        :submit-error="submitError"
        submit-label="Guardar cambios"
        @submit="save"
      />
    </template>
  </section>
</template>
