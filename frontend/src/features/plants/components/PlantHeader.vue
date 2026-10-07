<script setup lang="ts">
/**
 * La cabecera de la ficha de un ejemplar: quién es, cómo está y qué se puede hacer con él.
 *
 * Vive en la feature y no en el kit: el kit es lo que se reutiliza entre pantallas, y una cabecera
 * de ejemplar es de esta. La regla de ADR-014 —un patrón nuevo va al kit— habla de patrones
 * recurrentes, no de composiciones de un solo uso.
 *
 * **Lo que el API no sirve se marca en la pantalla**, no solo en el código: el código de
 * inventario y el estado son **reales** (T-15, T-16), igual que la germinación y la **fotografía**
 * (T-19); solo el contexto botánico (exposición y entorno, T-17) lleva su marca. Una ficha con esos
 * datos inventados y sin marcar es indistinguible de una que funciona, y eso no es un riesgo
 * técnico sino de criterio: alguien la enseña y la da por hecha.
 *
 * No abre el diálogo de lectura: emite la intención. Quien lo abre es la ficha, que es quien lo
 * monta.
 */
import { useReferenceDate } from '@shared/composables/useReferenceDate'
import type { PlantDetail } from '../types/plant.types'
import { germinationLabel, isFinalStatus, STATUS_LABELS } from '../mappers/plantProfile'
import { MOCK_CONTEXT } from '../mocks/plantDetail.mock'

const props = defineProps<{
  plant: PlantDetail
  /** Su portada real; sin ella, «Sin fotografía». */
  cover?: { src: string, alt: string } | null
  photoCount?: number
}>()

defineEmits<{ 'register-reading': [], 'create-task': [], 'edit-plant': [], 'change-status': [], 'open-photos': [] }>()

const today = useReferenceDate()

/** Con mes, «Germinada 04/2021»; con solo el año, el año y una edad aproximada. Sin año, nada. */
const germination = computed(() => germinationLabel(
  props.plant.germinationYear,
  props.plant.germinationMonth,
  Number(today.value.slice(0, 4)),
))

const STATUS_TONES = {
  activa: 'ok', cuarentena: 'warning', enferma: 'danger',
  cedida: 'neutral', vendida: 'neutral', muerta: 'neutral', perdida: 'neutral',
} as const
const statusTone = computed(() => STATUS_TONES[props.plant.status])
const archived = computed(() => isFinalStatus(props.plant.status))
</script>

<template>
  <article class="specimen">
    <UiCoverPhoto
      class="specimen__photo"
      data-test="plant-cover"
      :src="cover?.src"
      :alt="cover?.alt"
      :count="photoCount ?? 0"
      count-action
      @count="$emit('open-photos')"
    />

    <div class="specimen__identity">
      <div class="specimen__line">
        <UiIdentityCode data-test="plant-code" :value="plant.code" />
        <UiStatus :tone="statusTone" data-test="plant-status">{{ STATUS_LABELS[plant.status] }}</UiStatus>
        <!-- Un ejemplar archivado no desaparece: se distingue por el texto y por la forma, no solo por el color. -->
        <span v-if="archived" class="specimen__archived" data-test="archived-mark">▪ Archivada</span>
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
        <li v-if="germination" data-test="germination"><UiTag :label="germination" /></li>
      </ul>

      <p class="specimen__mock-note">
        El contexto botánico es un <strong>dato de ejemplo</strong>: el API todavía no lo sirve.
      </p>
    </div>

    <div class="specimen__actions">
      <UiButton data-test="register-reading" @click="$emit('register-reading')">
        Registrar lectura
      </UiButton>
      <UiButton variant="secondary" data-test="create-task" @click="$emit('create-task')">
        Crear tarea
      </UiButton>
      <UiButton variant="secondary" data-test="change-status" @click="$emit('change-status')">
        Cambiar estado
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
.specimen__archived {
  border: 1px dashed var(--color-ink-muted);
  border-radius: var(--radius-pill);
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  padding: 0 var(--space-2);
}

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

/* Más específico que el tamaño del kit: en la ficha la portada es un cuadrado de la columna. */
.specimen > .specimen__photo.cover.is-lg {
  align-self: start;
  aspect-ratio: 1;
  min-height: 0;
  width: 100%;
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
