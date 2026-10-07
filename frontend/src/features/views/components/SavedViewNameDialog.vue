<script setup lang="ts">
/**
 * Pedir un nombre: para guardar una vista o grupo nuevo y para renombrarlo.
 *
 * **No habla con el API**: recibe `submit`, que devuelve el mensaje de error o `null` si salió bien,
 * y así lo mismo sirve para guardar que para renombrar. Un fallo —un nombre repetido, por ejemplo—
 * se muestra en línea y **no pierde lo escrito**: el diálogo sigue abierto con el nombre como estaba.
 */
const props = withDefaults(defineProps<{
  open: boolean
  title: string
  submitLabel: string
  initialName?: string
  submit: (name: string) => Promise<string | null>
}>(), { initialName: '' })

const emit = defineEmits<{ close: [] }>()

const name = ref(props.initialName)
const nameError = ref('')
const saveError = ref<string | null>(null)
const saving = ref(false)

// Al abrirse de nuevo, parte de cero: lo escrito era de otra operación.
watch(() => props.open, (open) => {
  if (!open) return
  name.value = props.initialName
  nameError.value = ''
  saveError.value = null
})

async function onSubmit() {
  saveError.value = null
  nameError.value = name.value.trim() === '' ? 'El nombre es obligatorio.' : ''
  if (nameError.value) return

  saving.value = true
  const error = await props.submit(name.value.trim())
  saving.value = false

  if (error) {
    saveError.value = error
    return
  }
  emit('close')
}
</script>

<template>
  <UiDialog :open="open" :title="title" @close="emit('close')">
    <form class="name-form" data-test="name-form" @submit.prevent="onSubmit">
      <UiInlineError v-if="saveError" data-test="name-error">{{ saveError }}</UiInlineError>

      <UiField
        v-model="name"
        label="Nombre"
        :error="nameError"
        error-test="name-required"
        maxlength="80"
        data-test="view-name"
      />

      <div class="name-form__actions">
        <UiButton variant="secondary" data-test="cancel-name" @click="emit('close')">Cancelar</UiButton>
        <UiButton type="submit" :busy="saving" data-test="confirm-name">{{ submitLabel }}</UiButton>
      </div>
    </form>
  </UiDialog>
</template>

<style scoped>
.name-form {
  display: grid;
  gap: var(--space-3);
}

.name-form__actions {
  display: flex;
  gap: var(--space-2);
  justify-content: flex-end;
}
</style>
