<script setup lang="ts">
/**
 * La búsqueda global de la barra superior.
 *
 * **No busca**: recibe los resultados ya agrupados y emite el elegido. Hoy quien busca es el
 * layout contra datos de ejemplo; en T-21 será el API, y este componente no se entera. Ningún
 * componente del kit accede a datos, y este no va a ser el primero.
 *
 * El patrón accesible es el de *combobox* con lista de resultados: el campo declara la lista que
 * controla y cuál de sus opciones está activa, de modo que un lector de pantalla anuncia el
 * movimiento sin que el foco salga del campo. Las flechas recorren **todos** los resultados en
 * orden, atravesando los grupos: los grupos organizan la vista, no el recorrido.
 */
import { useId } from 'vue'

export interface SearchGroup {
  kind: string
  label: string
  results: { label: string, detail?: string, to: string }[]
}

const props = withDefaults(
  defineProps<{ modelValue: string, groups: SearchGroup[], label?: string, placeholder?: string }>(),
  { label: 'Buscar en la colección', placeholder: 'Buscar planta, especie, localización…' },
)

const emit = defineEmits<{
  'update:modelValue': [string]
  'select': [{ label: string, detail?: string, to: string }]
}>()

const listId = useId()
const optionId = (index: number) => `${listId}-option-${index}`

/** El recorrido es plano aunque la vista sea agrupada. */
const flatResults = computed(() => props.groups.flatMap((group) => group.results))
const indexOf = (group: SearchGroup, position: number) =>
  flatResults.value.indexOf(group.results[position]!)

const dismissed = ref(false)
const activeIndex = ref(-1)

/** Sin texto no hay lista; con texto y sin resultados, la hay pero dice que no hay nada. */
const searching = computed(() => props.modelValue.trim().length > 0)
const open = computed(() => searching.value && !dismissed.value)
const noResults = computed(() => open.value && flatResults.value.length === 0)

// Escribir reabre la lista y deshace cualquier recorrido anterior: los resultados ya son otros.
watch(
  () => props.modelValue,
  () => {
    dismissed.value = false
    activeIndex.value = -1
  },
)

function move(step: number) {
  const total = flatResults.value.length
  if (!total) return
  dismissed.value = false
  activeIndex.value = (activeIndex.value + step + total) % total
}

function choose(result?: { label: string, detail?: string, to: string }) {
  if (!result) return
  emit('select', result)
  dismissed.value = true
  activeIndex.value = -1
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    move(1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    move(-1)
  } else if (event.key === 'Enter') {
    // Sin resultado activo no se elige nada: pulsar Enter no debe abrir el primero por sorpresa.
    if (activeIndex.value >= 0) {
      event.preventDefault()
      choose(flatResults.value[activeIndex.value])
    }
  } else if (event.key === 'Escape') {
    dismissed.value = true
    activeIndex.value = -1
  }
}
</script>

<template>
  <div class="global-search">
    <input
      type="search"
      role="combobox"
      :value="modelValue"
      :aria-label="label"
      :placeholder="placeholder"
      :aria-expanded="String(open)"
      :aria-controls="listId"
      :aria-activedescendant="activeIndex >= 0 ? optionId(activeIndex) : undefined"
      autocomplete="off"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      @keydown="onKeydown"
    >

    <div :id="listId" class="global-search__results" role="listbox" :aria-label="label">
      <template v-if="open">
        <p v-if="noResults" class="global-search__empty" data-test="no-results">
          No hay resultados para «{{ modelValue }}».
        </p>
        <div
          v-for="group in groups"
          v-else
          :key="group.kind"
          class="global-search__group"
          role="group"
          :aria-label="group.label"
        >
          <p class="global-search__group-label">{{ group.label }}</p>
          <button
            v-for="(result, position) in group.results"
            :id="optionId(indexOf(group, position))"
            :key="result.to + result.label"
            type="button"
            role="option"
            :aria-selected="indexOf(group, position) === activeIndex ? 'true' : 'false'"
            :class="{ 'is-active': indexOf(group, position) === activeIndex }"
            @click="choose(result)"
          >
            <span class="global-search__label">{{ result.label }}</span>
            <span v-if="result.detail" class="global-search__detail">{{ result.detail }}</span>
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.global-search {
  max-width: 420px;
  position: relative;
  width: 100%;
}

.global-search input {
  background: var(--color-surface-muted);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-pill);
  color: var(--color-ink);
  font-size: var(--font-size-13);
  min-height: 36px;
  padding: 0 var(--space-4);
  width: 100%;
}

.global-search input::placeholder {
  color: var(--color-ink-faint);
}

.global-search__results:empty {
  display: none;
}

.global-search__results {
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-overlay);
  left: 0;
  max-height: 60vh;
  overflow-y: auto;
  padding: var(--space-2);
  position: absolute;
  right: 0;
  top: calc(100% + var(--space-2));
  z-index: 40;
}

.global-search__group + .global-search__group {
  border-top: 1px solid var(--color-line);
  margin-top: var(--space-2);
  padding-top: var(--space-2);
}

.global-search__group-label {
  color: var(--color-ink-faint);
  font-size: var(--font-size-11);
  font-weight: 700;
  letter-spacing: 0.08em;
  margin: 0 0 var(--space-1);
  padding: 0 var(--space-2);
  text-transform: uppercase;
}

.global-search__results button {
  background: transparent;
  border: 0;
  border-radius: var(--radius-sm);
  display: block;
  min-height: 38px;
  padding: var(--space-1) var(--space-2);
  text-align: left;
  width: 100%;
}

/* El resultado activo no se distingue solo por color: cambia el fondo y el peso de su nombre. */
.global-search__results button.is-active {
  background: var(--color-brand-soft);
}

.global-search__results button.is-active .global-search__label {
  font-weight: 700;
}

.global-search__label {
  color: var(--color-ink);
  display: block;
  font-size: var(--font-size-13);
}

.global-search__detail {
  color: var(--color-ink-muted);
  display: block;
  font-size: var(--font-size-11);
}

.global-search__empty {
  color: var(--color-ink-muted);
  font-size: var(--font-size-13);
  margin: 0;
  padding: var(--space-2);
}
</style>
