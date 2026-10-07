<script setup lang="ts">
/**
 * El menú de acciones de una fila —el «•••» del prototipo—: un botón que despliega una lista de
 * acciones nombradas.
 *
 * No sabe qué hace cada acción: recibe `{ id, label, tone?, disabled? }` y **emite el `id`** elegido.
 * Quien lo usa decide qué ocurre. El patrón accesible es el del botón de menú: el botón declara
 * `aria-haspopup` y `aria-expanded`; la lista se recorre con las flechas (saltando lo deshabilitado),
 * se activa con Intro o Espacio y se cierra con Escape —devolviendo el foco al botón—, al elegir y
 * al hacer clic fuera.
 */
export interface ActionMenuItem {
  id: string
  label: string
  /** `danger` para lo destructivo: se distingue también por posición, no solo por color. */
  tone?: 'default' | 'danger'
  disabled?: boolean
}

const props = defineProps<{
  /** El nombre accesible del botón: «Acciones de la tarea». */
  label: string
  actions: ActionMenuItem[]
}>()

const emit = defineEmits<{ select: [string] }>()

const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
const menu = ref<HTMLElement | null>(null)
const open = ref(false)
const active = ref(-1)

const enabled = (index: number) => !props.actions[index]?.disabled

function nextEnabled(from: number, step: 1 | -1): number {
  const total = props.actions.length
  for (let offset = 1; offset <= total; offset++) {
    const index = (from + step * offset + total * 2) % total
    if (enabled(index)) return index
  }
  return -1
}

async function show() {
  open.value = true
  active.value = nextEnabled(-1, 1)
  await nextTick()
  menu.value?.focus()
}

function close(returnFocus = true) {
  open.value = false
  active.value = -1
  if (returnFocus) trigger.value?.focus()
}

function choose(index: number) {
  const action = props.actions[index]
  if (!action || action.disabled) return
  emit('select', action.id)
  close()
}

function onTriggerKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    if (!open.value) show()
  } else if (event.key === 'Enter' && !open.value) {
    // El clic del propio Intro ya abre en un navegador; aquí se cubre el evento de teclado.
    event.preventDefault()
    show()
  }
}

function onMenuKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    close()
  } else if (event.key === 'ArrowDown') {
    event.preventDefault()
    active.value = nextEnabled(active.value, 1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    active.value = nextEnabled(active.value, -1)
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    choose(active.value)
  } else if (event.key === 'Tab') {
    close(false)
  }
}

function onOutside(event: MouseEvent) {
  if (!open.value) return
  if (root.value?.contains(event.target as Node)) return
  close(false)
}

onMounted(() => document.addEventListener('click', onOutside))
onBeforeUnmount(() => document.removeEventListener('click', onOutside))
</script>

<template>
  <div ref="root" class="action-menu">
    <button
      ref="trigger"
      type="button"
      class="action-menu__trigger"
      aria-haspopup="menu"
      :aria-expanded="open ? 'true' : 'false'"
      :aria-label="label"
      @click.stop="open ? close() : show()"
      @keydown="onTriggerKeydown"
    >
      <span aria-hidden="true">•••</span>
    </button>

    <ul
      v-if="open"
      ref="menu"
      class="action-menu__list"
      role="menu"
      tabindex="-1"
      :aria-label="label"
      @keydown="onMenuKeydown"
    >
      <li v-for="(action, index) in actions" :key="action.id" role="none">
        <button
          type="button"
          role="menuitem"
          class="action-menu__item"
          :class="{ 'is-active': index === active, 'is-danger': action.tone === 'danger' }"
          :aria-disabled="action.disabled ? 'true' : undefined"
          tabindex="-1"
          @click.stop="choose(index)"
          @mouseenter="active = action.disabled ? active : index"
        >
          {{ action.label }}
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.action-menu {
  display: inline-block;
  position: relative;
}

.action-menu__trigger {
  align-items: center;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  color: var(--color-ink-muted);
  cursor: pointer;
  display: inline-flex;
  font: inherit;
  height: 36px;
  justify-content: center;
  min-width: 36px;
}

.action-menu__trigger:hover,
.action-menu__trigger[aria-expanded='true'] {
  background: var(--color-brand-soft);
  color: var(--color-brand-strong);
}

.action-menu__list {
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-overlay);
  list-style: none;
  margin: var(--space-1) 0 0;
  min-width: 180px;
  outline: 0;
  padding: var(--space-1);
  position: absolute;
  right: 0;
  z-index: 20;
}

.action-menu__item {
  background: transparent;
  border: 0;
  border-radius: var(--radius-sm);
  color: var(--color-ink);
  cursor: pointer;
  display: block;
  font: inherit;
  font-size: var(--font-size-12);
  padding: var(--space-2) var(--space-3);
  text-align: left;
  width: 100%;
}

.action-menu__item.is-active {
  background: var(--color-brand-soft);
}

.action-menu__item.is-danger {
  color: var(--color-danger);
}

.action-menu__item[aria-disabled='true'] {
  color: var(--color-ink-muted);
  cursor: not-allowed;
  opacity: 0.6;
}
</style>
