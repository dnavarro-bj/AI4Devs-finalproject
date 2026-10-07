<script setup lang="ts">
/**
 * Alta de una planta. Usa **el mismo formulario que la edición** (§5.4): reutilizarlo evita
 * duplicar reglas de validación y dos experiencias que deberían ser la misma.
 */
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'
import { usePlants } from '@features/plants/composables/usePlants'
import type { PlantFormValues, SaveAfter } from '@features/plants/components/PlantForm.vue'
import { usePendingUploads } from '@features/media/composables/usePendingUploads'
import { useToast } from '@shared/composables/useToast'
import type { PhotoSelection } from '@features/media/types/media.types'
import { toProfile } from '@features/plants/mappers/plantProfile'

const { create } = usePlants()
const { uploadAfterSave } = usePendingUploads()
const toast = useToast()
const { set: setBreadcrumbs } = useBreadcrumbs()

setBreadcrumbs([{ label: 'Inventario', to: '/plants' }, { label: 'Añadir planta' }])

const submitting = ref(false)
const error = ref<string | null>(null)
/** Cambia al «Guardar y añadir otra»: remonta el formulario vacío, sin arrastrar nada de la anterior. */
const formKey = ref(0)

/**
 * Guardar y **después** subir: el ejemplar ya existe cuando se sube la primera foto, así que una
 * imagen que falla no bloquea ni deshace el alta. Lo que no suba queda en la cola y la ficha lo
 * avisa con su reintento. La primera de la lista es la principal: se sube la primera.
 */
async function onSubmit(values: PlantFormValues, photos: PhotoSelection[] = [], after: SaveAfter = 'detail') {
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

  if (!result.success) {
    submitting.value = false
    // Se conserva lo escrito: el usuario corrige y reintenta sin volver a teclearlo.
    error.value = result.error!.message
    return
  }

  let failed = 0
  for (const { file, purpose } of photos) {
    const sent = await uploadAfterSave({ kind: 'plants', id: result.data!.id }, [file], { purpose })
    failed += sent.failed
  }
  submitting.value = false

  if (after === 'another') {
    toast.show(`Planta creada: ${result.data!.code}${failed ? ` · ${failed} fotografía(s) sin subir, reintenta desde su ficha` : ''}`)
    formKey.value++
    return
  }
  await navigateTo(`/plants/${result.data!.id}`)
}
</script>

<template>
  <section>
    <UiPageHeader title="Añadir planta" />

    <UiInlineError v-if="error" data-test="error" class="form__error">{{ error }}</UiInlineError>

    <PlantForm :key="formKey" :submitting="submitting" submit-label="Crear planta" @submit="onSubmit" />
  </section>
</template>

<style scoped>
.form__error {
  margin-bottom: var(--space-4);
}
</style>
