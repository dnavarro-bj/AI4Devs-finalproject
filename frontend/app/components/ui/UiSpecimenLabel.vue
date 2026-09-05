<script setup lang="ts">
/**
 * La firma del sistema: miniatura, código permanente, nombre y contexto botánico.
 *
 * El código no se trunca nunca —identifica operaciones— y **todo** el contexto es opcional: hoy el
 * API no expone código, miniatura ni estado del ejemplar, así que lo ausente se omite en lugar de
 * dejar un hueco o inventarse un valor (ADR-014).
 */
withDefaults(defineProps<{
  name: string
  species?: string
  code?: string
  mark?: string
  details?: { label: string, value: string }[]
  footnote?: string
}>(), {
  species: undefined,
  code: undefined,
  mark: '♧',
  details: undefined,
  footnote: undefined,
})
</script>

<template>
  <article class="specimen-label">
    <div class="label-top">
      <span class="label-mark" aria-hidden="true">{{ mark }}</span>
      <slot name="status" />
    </div>

    <code v-if="code">{{ code }}</code>
    <h2>{{ name }}</h2>
    <p v-if="species"><em>{{ species }}</em></p>

    <dl v-if="details?.length">
      <div v-for="detail in details" :key="detail.label">
        <dt>{{ detail.label }}</dt>
        <dd>{{ detail.value }}</dd>
      </div>
    </dl>

    <div v-if="footnote" class="label-foot"><span>{{ footnote }}</span></div>
  </article>
</template>

<style scoped>
.specimen-label {
  background: var(--color-surface);
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-sm);
  color: var(--color-ink);
  max-width: 410px;
  padding: var(--space-6);
  position: relative;
}

.specimen-label::before {
  border: 1px solid color-mix(in srgb, var(--color-brand) 22%, transparent);
  content: "";
  inset: var(--space-2);
  pointer-events: none;
  position: absolute;
}

.label-top {
  align-items: center;
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--space-10);
}

.label-mark {
  align-items: center;
  background: var(--color-brand);
  border-radius: 50%;
  color: var(--color-surface);
  display: flex;
  font-size: var(--font-size-24);
  height: 42px;
  justify-content: center;
  width: 42px;
}

/* El código identifica operaciones: se muestra entero, pase lo que pase. */
.specimen-label > code {
  border-left: 3px solid var(--color-brand);
  display: inline-block;
  margin-bottom: var(--space-3);
  overflow: visible;
  padding: var(--space-1) var(--space-2);
  text-overflow: clip;
  white-space: normal;
}

.specimen-label h2 {
  font-size: var(--font-size-24);
  margin-bottom: var(--space-1);
}

.specimen-label > p {
  color: var(--color-ink-muted);
  margin-bottom: var(--space-6);
}

.specimen-label dl {
  border-top: 1px solid var(--color-line);
  margin: 0;
}

.specimen-label dl div {
  border-bottom: 1px solid var(--color-line);
  display: flex;
  font-size: var(--font-size-12);
  justify-content: space-between;
  padding: var(--space-2) 0;
}

.specimen-label dt {
  color: var(--color-ink-muted);
}

.specimen-label dd {
  font-weight: 700;
  margin: 0;
  text-align: right;
}

.label-foot {
  color: var(--color-ink-muted);
  display: flex;
  font-family: var(--font-mono);
  font-size: var(--font-size-11);
  justify-content: space-between;
  margin-top: var(--space-6);
}
</style>
