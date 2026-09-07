<script setup lang="ts">
/**
 * La cabecera de la ficha de un ejemplar: quién es, cómo está y qué se puede hacer con él.
 *
 * Vive en la feature y no en el kit: el kit es lo que se reutiliza entre pantallas, y una cabecera
 * de ejemplar es de esta. La regla de ADR-014 —un patrón nuevo va al kit— habla de patrones
 * recurrentes, no de composiciones de un solo uso.
 *
 * **Lo que el API no sirve se marca en la pantalla**, no solo en el código: el código de
 * inventario (T-15), el estado (T-16), el contexto botánico (T-16 y T-17) y la fotografía (T-19)
 * llevan su marca. Una ficha con esos datos inventados y sin marcar es indistinguible de una que
 * funciona, y eso no es un riesgo técnico sino de criterio: alguien la enseña y la da por hecha.
 *
 * No abre el diálogo de lectura: emite la intención. Quien lo abre es la ficha, que es quien lo
 * monta.
 */
import type { PlantDetail } from '../types/plant.types'
import { MOCK_CODE, MOCK_CONTEXT, MOCK_PHOTO_COUNT, MOCK_STATUS } from '../mocks/plantDetail.mock'

defineProps<{ plant: PlantDetail }>()

defineEmits<{ 'register-reading': [], 'create-task': [], 'edit-plant': [] }>()
</script>

<template>
  <article class="specimen">
    <div class="specimen__photo" data-mock="true" role="img" aria-label="Sin fotografía todavía">
      <span aria-hidden="true">✺</span>
      <small>{{ MOCK_PHOTO_COUNT }} fotos · ejemplo</small>
    </div>

    <div class="specimen__identity">
      <div class="specimen__line">
        <UiIdentityCode data-test="plant-code" data-mock="true" :value="MOCK_CODE" pending />
        <UiStatus :tone="MOCK_STATUS.tone" data-mock="true">{{ MOCK_STATUS.label }}</UiStatus>
      </div>

      <h1>{{ plant.nickname }}</h1>
      <p class="specimen__species">
        <em>{{ plant.species.scientificName }}</em> · {{ plant.location.name }}
      </p>

      <!-- Los tags son reales; el contexto botánico es maqueta. No se mezclan en una lista. -->
      <ul class="specimen__context" data-test="tags">
        <li v-for="tag in plant.tags" :key="tag.id"><UiTag :label="tag.name" /></li>
        <li v-if="!plant.tags.length" class="specimen__none"><UiTag label="Sin tags" /></li>
      </ul>
      <ul class="specimen__context">
        <li v-for="item in MOCK_CONTEXT" :key="item" data-mock="true"><UiTag :label="item" /></li>
      </ul>

      <p class="specimen__mock-note">
        Código, estado, contexto y fotografía son <strong>datos de ejemplo</strong>: el API todavía
        no los sirve.
      </p>
    </div>

    <div class="specimen__actions">
      <UiButton data-test="register-reading" @click="$emit('register-reading')">
        Registrar lectura
      </UiButton>
      <UiButton variant="secondary" data-test="create-task" @click="$emit('create-task')">
        Crear tarea
      </UiButton>
      <UiButton
        variant="secondary"
        :to="`/plants/${plant.id}/edit`"
        data-test="edit-plant"
        @click="$emit('edit-plant')"
      >
        Editar planta
      </UiButton>
    </div>
  </article>
</template>

<style scoped>
.specimen {
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  display: grid;
  gap: var(--space-5);
  grid-template-columns: 140px 1fr auto;
  margin-bottom: var(--space-5);
  padding: var(--space-5);
}

.specimen__photo {
  align-items: center;
  aspect-ratio: 1;
  background: var(--color-surface-muted);
  border: 1px dashed var(--color-line-strong);
  border-radius: var(--radius-md);
  color: var(--color-ink-faint);
  display: flex;
  flex-direction: column;
  font-size: var(--font-size-24);
  gap: var(--space-1);
  justify-content: center;
}

.specimen__photo small {
  font-size: var(--font-size-11);
}

.specimen__line {
  align-items: center;
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-1);
}

.specimen__identity h1 {
  font-size: var(--font-size-24);
  letter-spacing: -0.02em;
  margin: 0;
}

.specimen__species {
  color: var(--color-ink-muted);
  font-size: var(--font-size-13);
  margin: var(--space-1) 0 var(--space-3);
}

.specimen__context {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  list-style: none;
  margin: 0;
  padding: 0;
}

.specimen__context li { list-style: none; }

.specimen__context + .specimen__context {
  margin-top: var(--space-1);
}

.specimen__none {
  background: transparent !important;
}

/* La marca de ejemplo se ve además de leerse: borde discontinuo, no solo un texto al pie. */
.specimen__photo[data-mock="true"],
.specimen__line > [data-mock="true"],
.specimen__context li[data-mock="true"] :deep(.tag) {
  border: 1px dashed var(--color-line-strong);
}

.specimen__mock-note {
  color: var(--color-ink-faint);
  font-size: var(--font-size-11);
  margin: var(--space-3) 0 0;
}

.specimen__actions {
  display: grid;
  gap: var(--space-2);
  height: fit-content;
}

@media (max-width: 900px) {
  .specimen {
    grid-template-columns: 1fr;
  }
}
</style>
