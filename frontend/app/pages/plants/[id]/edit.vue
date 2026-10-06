<script setup lang="ts">
/**
 * Editar una planta, con **el mismo formulario que el alta** (§5.4).
 *
 * Guarda apodo, localización y especie con `PUT /plants/{id}` y vuelve a la ficha. Si el API
 * rechaza la edición, explica el motivo **sin perder lo escrito**: el formulario es el dueño de sus
 * valores y esta pantalla solo lo envuelve, así que si no se navega sigue montado tal como estaba.
 *
 * Lo que el API todavía no acepta —descripción, estado, procedencia, cuidados propios— no es
 * editable: el formulario lo muestra deshabilitado con su ticket, en lugar de admitir un texto
 * que se perdería.
 */
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'
import { usePlants } from '@features/plants/composables/usePlants'
import type { PlantDetail } from '@features/plants/types/plant.types'
import type { PlantFormValues } from '@features/plants/components/PlantForm.vue'

const route = useRoute()
const plantId = String(route.params.id)
const { detail, update } = usePlants()
const { set: setBreadcrumbs } = useBreadcrumbs()

const plant = ref<PlantDetail | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const submitting = ref(false)
const saveError = ref<string | null>(null)

setBreadcrumbs([{ label: 'Inventario', to: '/plants' }, { label: 'Editar planta' }])

onMounted(async () => {
  const result = await detail(plantId)
  loading.value = false

  if (!result.success) {
    error.value = result.error!.message
    return
  }

  plant.value = result.data!
  setBreadcrumbs([
    { label: 'Inventario', to: '/plants' },
    { label: plant.value.nickname, to: `/plants/${plantId}` },
    { label: 'Editar' },
  ])
})

async function onSubmit(values: PlantFormValues) {
  saveError.value = null
  submitting.value = true

  const result = await update(plantId, values.nickname, values.locationId, values.speciesId)
  submitting.value = false

  if (!result.success) {
    // Se conserva lo escrito: el usuario corrige y reintenta sin volver a teclearlo.
    saveError.value = result.error!.message
    return
  }
  await navigateTo(`/plants/${plantId}`)
}
</script>

<template>
  <section>
    <UiPageHeader title="Editar planta" :context="plant?.nickname" />

    <p v-if="loading" role="status">Cargando la planta…</p>

    <UiInlineError v-else-if="error" title="No se ha podido abrir la planta" data-test="error">
      {{ error }}
      <template #action>
        <UiButton variant="secondary" to="/plants">Volver al inventario</UiButton>
      </template>
    </UiInlineError>

    <template v-else-if="plant">
      <UiInlineError v-if="saveError" data-test="error" class="form__error">{{ saveError }}</UiInlineError>

      <PlantForm
        :initial="{
          nickname: plant.nickname,
          locationId: plant.location.id,
          speciesId: plant.species.id,
        }"
        :locked-code="plant.code"
        :submitting="submitting"
        submit-label="Guardar cambios"
        @submit="onSubmit"
      >
        <template #secondary-action>
          <UiButton variant="secondary" :to="`/plants/${plantId}`">Cancelar</UiButton>
        </template>
      </PlantForm>
    </template>
  </section>
</template>

<style scoped>
.form__error {
  margin-bottom: var(--space-4);
}
</style>
