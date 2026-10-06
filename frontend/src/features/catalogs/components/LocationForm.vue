<script setup lang="ts">
/**
 * Editor de localización compartido por alta y, cuando T-18 amplíe el contrato, corrección.
 * Mantiene desde ahora la composición completa del wireframe sin fingir que el API persiste los
 * datos que todavía no conoce: solo el nombre está habilitado y el resto se marca en su contexto.
 */
const props = withDefaults(defineProps<{
  initialName?: string
  submitting?: boolean
  submitError?: string | null
  submitLabel?: string
}>(), {
  initialName: '',
  submitting: false,
  submitError: null,
  submitLabel: 'Guardar localización',
})

const emit = defineEmits<{ submit: [name: string] }>()

const name = ref(props.initialName)
const nameError = ref('')

const pathName = computed(() => name.value.trim() || 'Nueva localización')

const environmentOptions = [
  { value: 'inside', label: 'Interior', disabled: true },
  { value: 'covered', label: 'Cubierto', disabled: true },
  { value: 'outside', label: 'Exterior', disabled: true },
]

const exposureOptions = [
  { value: 'shade', label: 'Sombra', mark: '◑', disabled: true },
  { value: 'partial', label: 'Semisombra', mark: '◐', disabled: true },
  { value: 'sunny', label: 'Soleado', mark: '◒', disabled: true },
  { value: 'full-sun', label: 'Pleno sol', mark: '☼', disabled: true },
]

function submit() {
  nameError.value = name.value.trim() ? '' : 'Escribe un nombre para la localización.'
  if (nameError.value) return
  emit('submit', name.value.trim())
}
</script>

<template>
  <form class="location-form" data-test="location-form" @submit.prevent="submit">
    <div class="location-form__content">
      <UiInlineError v-if="submitError" data-test="submit-error">{{ submitError }}</UiInlineError>

      <UiFormSection
        standalone
        title="Posición en el vivero"
        description="Selecciona dónde quedará contenida esta localización."
        data-test="position-section"
      >
        <div class="parent-preview" data-mock="true">
          <span class="parent-preview__mark" aria-hidden="true">⌖</span>
          <span>
            <strong>Toda la colección</strong>
            <small>Ruta resultante: Toda la colección / <b>{{ pathName }}</b></small>
          </span>
          <UiButton variant="secondary" disabled>Elegir padre · T-18</UiButton>
        </div>
      </UiFormSection>

      <UiFormSection
        standalone
        title="Identificación"
        description="Un nombre breve facilita encontrarla al mover plantas o crear tareas."
        data-test="identity-section"
      >
        <div class="field-grid">
          <UiField
            v-model="name"
            label="Nombre"
            placeholder="Por ejemplo, Bancada este"
            :error="nameError"
            error-test="name-error"
            autofocus
            data-test="name"
          />
          <UiField
            label="Código corto"
            placeholder="Se definirá con T-18"
            help="La ruta técnica se generará a partir de la jerarquía."
            disabled
            data-mock="true"
          />
          <UiField
            label="Tipo"
            as="select"
            placeholder="Disponible con T-18"
            :options="[]"
            disabled
            data-mock="true"
          />
          <UiField
            label="Capacidad orientativa"
            placeholder="Disponible con T-18"
            help="Permitirá detectar zonas demasiado cargadas."
            disabled
            data-mock="true"
          />
          <UiField
            class="field-grid__wide"
            label="Descripción y referencias físicas"
            as="textarea"
            :rows="4"
            placeholder="Disponible con T-18"
            disabled
            data-mock="true"
          />
        </div>
      </UiFormSection>

      <UiFormSection
        standalone
        title="Características del espacio"
        description="Sirven como contexto para agrupar trabajo y detectar incompatibilidades."
        data-test="characteristics-section"
      >
        <div class="pending-fields" data-mock="true">
          <UiSegmentedControl model-value="" label="Entorno" :options="environmentOptions" />
          <UiChoiceCards model-value="" label="Exposición predominante" :options="exposureOptions" :columns="4" />
          <UiField
            label="Notas operativas"
            as="textarea"
            :rows="3"
            placeholder="Disponible con T-18"
            disabled
          />
        </div>
      </UiFormSection>
    </div>

    <aside class="location-form__aside">
      <article class="impact-note" data-test="impact-note">
        <strong>Se creará en la raíz del vivero</strong>
        <p>Podrás asignar plantas aquí después de guardar la localización.</p>
      </article>

      <UiPanel title="Jerarquía recomendada">
        <p>
          Usa pocos niveles y nombres que existan físicamente. Una ruta como
          «Invernadero 1 / Bancada norte / Bandeja A3» se reconoce de un vistazo.
        </p>
      </UiPanel>

      <p class="contract-note" data-mock="true">
        <strong>T-18</strong> habilitará el padre, el tipo, la capacidad y las características del espacio.
      </p>
    </aside>

    <UiStickyActionBar class="location-form__actions" message="La nueva localización estará vacía.">
      <template #actions>
        <UiButton variant="secondary" to="/locations">Cancelar</UiButton>
        <UiButton type="submit" :busy="submitting" data-test="submit">
          {{ submitting ? 'Guardando…' : submitLabel }}
        </UiButton>
      </template>
    </UiStickyActionBar>
  </form>
</template>

<style scoped>
.location-form {
  align-items: start;
  display: grid;
  gap: var(--space-5);
  grid-template-columns: minmax(0, 1fr) 270px;
  padding-bottom: var(--space-8);
}

.location-form__content {
  display: grid;
  gap: var(--space-4);
  min-width: 0;
}

.location-form__aside {
  display: grid;
  gap: var(--space-3);
  position: sticky;
  top: calc(var(--topbar-height) + var(--space-4));
}

.location-form__aside :deep(.panel p) {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  line-height: 1.6;
  margin: 0;
}

.parent-preview {
  align-items: center;
  background: var(--color-canvas);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-sm);
  display: grid;
  gap: var(--space-3);
  grid-template-columns: auto 1fr auto;
  padding: var(--space-3);
}

.parent-preview__mark {
  align-items: center;
  background: var(--color-brand-soft);
  border-radius: var(--radius-sm);
  color: var(--color-brand-strong);
  display: flex;
  font-size: var(--font-size-17);
  height: 38px;
  justify-content: center;
  width: 38px;
}

.parent-preview strong,
.parent-preview small {
  display: block;
}

.parent-preview strong {
  font-size: var(--font-size-13);
}

.parent-preview small {
  color: var(--color-ink-muted);
  font-size: var(--font-size-11);
  margin-top: var(--space-1);
}

.parent-preview b {
  color: var(--color-ink);
}

.field-grid {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.field-grid__wide {
  grid-column: 1 / -1;
}

.pending-fields {
  display: grid;
  gap: var(--space-5);
}

.impact-note {
  background: var(--color-brand-soft);
  border-left: 4px solid var(--color-brand);
  border-radius: 4px var(--radius-md) var(--radius-md) 4px;
  padding: var(--space-4);
}

.impact-note strong {
  color: var(--color-brand-strong);
  font-size: var(--font-size-13);
}

.impact-note p {
  color: var(--color-brand-strong);
  font-size: var(--font-size-11);
  line-height: 1.5;
  margin: var(--space-1) 0 0;
}

.contract-note {
  border-top: 1px solid var(--color-line);
  color: var(--color-ink-muted);
  font-size: var(--font-size-11);
  line-height: 1.5;
  margin: 0;
  padding: var(--space-3) var(--space-1) 0;
}

.location-form__actions {
  grid-column: 1 / -1;
}

@media (max-width: 900px) {
  .location-form {
    grid-template-columns: minmax(0, 1fr);
  }

  .location-form__aside {
    grid-row: 2;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    position: static;
  }

  .contract-note {
    grid-column: 1 / -1;
  }
}

@media (max-width: 620px) {
  .field-grid,
  .location-form__aside {
    grid-template-columns: 1fr;
  }

  .contract-note,
  .field-grid__wide {
    grid-column: auto;
  }

  .parent-preview {
    grid-template-columns: auto 1fr;
  }

  .parent-preview :deep(.button) {
    grid-column: 2;
    justify-self: start;
  }
}
</style>
