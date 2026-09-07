<script setup lang="ts">
export interface OverflowItem { value: string, label: string, danger?: boolean, disabled?: boolean }
withDefaults(defineProps<{ items: OverflowItem[], label?: string }>(), { label: 'Más acciones' })
const emit = defineEmits<{ select: [string] }>()
const open = ref(false)

function choose(item: OverflowItem) {
  if (item.disabled) return
  open.value = false
  emit('select', item.value)
}
</script>

<template>
  <div class="overflow-menu" @keydown.esc="open = false">
    <button class="overflow-menu__trigger" type="button" :aria-label="label" aria-haspopup="menu" :aria-expanded="open" @click="open = !open">•••</button>
    <div v-if="open" role="menu">
      <button v-for="item in items" :key="item.value" type="button" role="menuitem" :disabled="item.disabled" :class="{ 'is-danger': item.danger }" @click="choose(item)">{{ item.label }}</button>
    </div>
  </div>
</template>

<style scoped>
.overflow-menu { display: inline-block; position: relative; }
.overflow-menu__trigger { align-items: center; background: transparent; border: 0; border-radius: var(--radius-sm); color: var(--color-ink-muted); display: inline-flex; height: 38px; justify-content: center; padding: 0; width: 38px; }
.overflow-menu__trigger:hover { background: var(--color-surface-muted); }
[role="menu"] { background: var(--color-surface); border: 1px solid var(--color-line); border-radius: 7px; box-shadow: var(--shadow-overlay); display: grid; min-width: 190px; padding: 5px; position: absolute; right: 0; top: calc(100% + 4px); z-index: 20; }
[role="menu"] button { background: transparent; border: 0; border-radius: 5px; color: var(--color-ink); font-size: var(--font-size-12); padding: 8px 10px; text-align: left; }
[role="menu"] button:hover:not(:disabled) { background: var(--color-canvas); }
[role="menu"] button.is-danger { color: var(--color-danger); }
[role="menu"] button:disabled { opacity: 0.46; }
</style>
