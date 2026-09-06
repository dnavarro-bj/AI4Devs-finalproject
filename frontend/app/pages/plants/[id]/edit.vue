<script setup lang="ts">
/**
 * Editar una planta, con **el mismo formulario que el alta** (§5.4).
 *
 * **El API no tiene endpoint de edición.** Expone `POST /plants`, `GET /plants`,
 * `GET /plants/{id}` y `PUT /plants/{id}/tags`, y nada más: no hay forma de cambiar el apodo, la
 * localización ni la especie de un ejemplar ya creado. El wireframe da la edición por hecha y
 * ningún ticket la cubre — la misma situación que abrió T-08 en su día.
 *
 * Así que esta pantalla **guarda lo que puede y avisa de lo que no**. Un formulario que parece
 * guardar y no guarda es peor que uno que no deja editar: el usuario cree tener un dato que no
 * tiene.
 */
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'
import { usePlants } from '@features/plants/composables/usePlants'
import type { PlantDetail } from '@features/plants/types/plant.types'
import type { PlantFormValues } from '@features/plants/components/PlantForm.vue'
import { MOCK_CODE } from '@features/plants/mocks/plantDetail.mock'

const route = useRoute()
const plantId = String(route.params.id)
const { detail } = usePlants()
const { set: setBreadcrumbs } = useBreadcrumbs()

const plant = ref<PlantDetail | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const partialSave = ref(false)

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

/** Lo único que el API admite persistir hoy son los tags, y este formulario no los edita. */
function onSubmit(_values: PlantFormValues) {
  partialSave.value = true
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
      <UiNotice
        v-if="partialSave"
        severity="warning"
        title="Los cambios no se han guardado"
        data-test="partial-save"
      >
        El API todavía no permite modificar una planta ya creada: solo expone la edición de sus
        tags. Lo que has escrito sigue en pantalla, pero no se ha guardado en el servidor.
      </UiNotice>

      <PlantForm
        :initial="{
          nickname: plant.nickname,
          locationId: plant.location.id,
          speciesId: plant.species.id,
        }"
        :locked-code="MOCK_CODE"
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
