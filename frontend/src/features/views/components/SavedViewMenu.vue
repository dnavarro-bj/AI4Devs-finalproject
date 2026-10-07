<script setup lang="ts">
/**
 * El selector de vistas guardadas de una pantalla: aplicar, guardar el estado actual, reemplazar,
 * renombrar y borrar. Sirve igual a las **vistas del inventario** y a los **grupos de especies**:
 * es la misma consulta con nombre, y solo cambia cómo se llama.
 *
 * **No habla con el API**: la pantalla le pasa las vistas, cuál está aplicada y las acciones, que
 * devuelven el mensaje de error o `null` si salieron bien. Un fallo se muestra en línea y no pierde
 * nada de lo escrito. Si el API de vistas cae, **el selector lo dice y el resto de la pantalla
 * sigue funcionando**: guardar vistas es una comodidad, no un requisito para trabajar.
 */
import type { SavedView } from '../types/view.types'

type Kind = 'view' | 'group'

const LABELS: Record<Kind, {
  trigger: string
  panel: string
  save: string
  saveTitle: string
  empty: string
  noun: string
}> = {
  view: {
    trigger: 'Vistas',
    panel: 'Vistas guardadas',
    save: 'Guardar la vista actual…',
    saveTitle: 'Guardar la vista actual',
    empty: 'Todavía no hay vistas guardadas. Guarda la combinación de filtros, orden y columnas que usas a menudo.',
    noun: 'vista',
  },
  group: {
    trigger: 'Grupos',
    panel: 'Grupos de cultivo guardados',
    save: 'Guardar los filtros como grupo…',
    saveTitle: 'Guardar los filtros como grupo',
    empty: 'Todavía no hay grupos. Filtra por lo que tienen en común y guarda los filtros como grupo.',
    noun: 'grupo',
  },
}

/** Qué escribe la acción en curso: un nombre nuevo, el de otra vista, o nada. */
const props = withDefaults(defineProps<{
  kind?: Kind
  views: SavedView[]
  /** La vista cuyo borrador coincide con el estado de la pantalla. */
  appliedId?: string | null
  /** La última vista aplicada cuando el estado ya no coincide con ella. */
  modified?: SavedView | null
  loading?: boolean
  /** El fallo al cargar las vistas, si lo hubo. */
  error?: string | null
  saveAs: (name: string) => Promise<string | null>
  replaceWith: (view: SavedView) => Promise<string | null>
  renameTo: (view: SavedView, name: string) => Promise<string | null>
  removeView: (view: SavedView) => Promise<string | null>
}>(), { kind: 'view', appliedId: null, modified: null, loading: false, error: null })

const emit = defineEmits<{ apply: [SavedView] }>()

const labels = computed(() => LABELS[props.kind])

const open = ref(false)
const naming = ref<'save' | { rename: SavedView } | null>(null)
const removing = ref<SavedView | null>(null)
const removeError = ref<string | null>(null)
const removingBusy = ref(false)
const actionError = ref<string | null>(null)

const nameDialogOpen = computed(() => naming.value !== null)
const nameDialogTitle = computed(() =>
  typeof naming.value === 'object' && naming.value ? `Renombrar ${labels.value.noun}` : labels.value.saveTitle)
const nameDialogInitial = computed(() =>
  typeof naming.value === 'object' && naming.value ? naming.value.rename.name : '')

function submitName(name: string): Promise<string | null> {
  const target = naming.value
  if (target && typeof target === 'object') return props.renameTo(target.rename, name)
  return props.saveAs(name)
}

function apply(view: SavedView) {
  actionError.value = null
  emit('apply', view)
  open.value = false
}

async function replace(view: SavedView) {
  actionError.value = await props.replaceWith(view)
}

function askRemove(view: SavedView) {
  removeError.value = null
  removing.value = view
}

async function confirmRemove() {
  if (!removing.value) return
  removingBusy.value = true
  const error = await props.removeView(removing.value)
  removingBusy.value = false

  if (error) {
    removeError.value = error
    return
  }
  removing.value = null
}

const hintOf = (view: SavedView) =>
  view.matchCount === undefined ? undefined : `${view.matchCount} ${view.matchCount === 1 ? 'especie' : 'especies'}`
</script>

<template>
  <div class="views-menu">
    <UiButton
      variant="secondary"
      :aria-expanded="open ? 'true' : 'false'"
      data-test="views-toggle"
      @click="open = !open"
    >
      {{ labels.trigger }} <span aria-hidden="true">{{ open ? '⌃' : '⌄' }}</span>
    </UiButton>

    <section v-if="open" class="views-menu__panel" :aria-label="labels.panel" data-test="views-panel">
      <UiInlineError v-if="error" data-test="views-error">{{ error }}</UiInlineError>
      <UiInlineError v-if="actionError" data-test="views-action-error">{{ actionError }}</UiInlineError>

      <p v-if="loading" role="status" data-test="views-loading">Cargando…</p>

      <div v-if="modified" class="views-menu__modified" data-test="views-modified">
        <span>Has modificado «{{ modified.name }}».</span>
        <UiButton variant="text" data-test="replace-modified" @click="replace(modified)">
          Reemplazar «{{ modified.name }}» con este estado
        </UiButton>
      </div>

      <p v-if="!loading && !error && !views.length" class="views-menu__empty" data-test="views-empty">
        {{ labels.empty }}
      </p>

      <ul v-if="views.length" class="views-menu__list">
        <li v-for="view in views" :key="view.id" :data-test="`view-${view.id}`">
          <button
            type="button"
            class="views-menu__apply"
            :class="{ 'is-applied': view.id === appliedId }"
            :aria-pressed="view.id === appliedId ? 'true' : 'false'"
            data-test="view-apply"
            @click="apply(view)"
          >
            <strong>{{ view.name }}</strong>
            <small v-if="hintOf(view)">{{ hintOf(view) }}</small>
          </button>
          <span class="views-menu__actions">
            <UiButton variant="text" :label="`Renombrar ${view.name}`" data-test="view-rename" @click="naming = { rename: view }">Renombrar</UiButton>
            <UiButton variant="text" :label="`Reemplazar ${view.name} con este estado`" data-test="view-replace" @click="replace(view)">Reemplazar</UiButton>
            <UiButton variant="text" :label="`Borrar ${view.name}`" data-test="view-remove" @click="askRemove(view)">Borrar</UiButton>
          </span>
        </li>
      </ul>

      <UiButton variant="secondary" data-test="view-save" @click="naming = 'save'">{{ labels.save }}</UiButton>
    </section>

    <SavedViewNameDialog
      :open="nameDialogOpen"
      :title="nameDialogTitle"
      :submit-label="typeof naming === 'object' && naming ? 'Renombrar' : 'Guardar'"
      :initial-name="nameDialogInitial"
      :submit="submitName"
      @close="naming = null"
    />

    <UiDialog
      :open="removing !== null"
      :title="`Borrar ${labels.noun}`"
      :subtitle="removing?.name"
      @close="removing = null"
    >
      <div class="views-menu__confirm" data-test="remove-confirm">
        <p>
          Se borra solo la {{ labels.noun }}: no cambia ninguna planta ni especie.
        </p>
        <UiInlineError v-if="removeError" data-test="remove-error">{{ removeError }}</UiInlineError>
        <div class="views-menu__confirm-actions">
          <UiButton variant="secondary" data-test="cancel-remove" @click="removing = null">Cancelar</UiButton>
          <UiButton :busy="removingBusy" data-test="confirm-remove" @click="confirmRemove">Borrar</UiButton>
        </div>
      </div>
    </UiDialog>
  </div>
</template>

<style scoped>
.views-menu {
  position: relative;
}

.views-menu__panel {
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-overlay);
  display: grid;
  gap: var(--space-3);
  min-width: 320px;
  padding: var(--space-3);
  position: absolute;
  right: 0;
  top: calc(100% + var(--space-1));
  z-index: 10;
}

.views-menu__modified {
  align-items: center;
  background: var(--color-warning-soft);
  border-radius: var(--radius-sm);
  display: grid;
  font-size: var(--font-size-12);
  gap: var(--space-1);
  padding: var(--space-2) var(--space-3);
}

.views-menu__empty {
  color: var(--color-ink-muted);
  font-size: var(--font-size-13);
  margin: 0;
}

.views-menu__list {
  display: grid;
  gap: var(--space-2);
  list-style: none;
  margin: 0;
  padding: 0;
}

.views-menu__list li {
  border: 1px solid var(--color-line);
  border-radius: var(--radius-sm);
  display: grid;
  gap: var(--space-1);
  padding: var(--space-2);
}

.views-menu__apply {
  background: transparent;
  border: 0;
  color: var(--color-ink);
  cursor: pointer;
  display: grid;
  font: inherit;
  gap: 2px;
  padding: 0;
  text-align: left;
}

.views-menu__apply.is-applied strong::after {
  color: var(--color-brand);
  content: " ✓";
}

.views-menu__apply small {
  color: var(--color-ink-muted);
  font-size: var(--font-size-11);
}

.views-menu__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.views-menu__confirm {
  display: grid;
  gap: var(--space-3);
}

.views-menu__confirm p {
  color: var(--color-ink-muted);
  font-size: var(--font-size-13);
  margin: 0;
}

.views-menu__confirm-actions {
  display: flex;
  gap: var(--space-2);
  justify-content: flex-end;
}
</style>
