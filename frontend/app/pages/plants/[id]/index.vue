<script setup lang="ts">
/**
 * La ficha de una planta: el centro operativo del ejemplar.
 *
 * Compuesta sobre el kit —`UiTabs`, `UiSummaryGrid`, `UiTimeline`, `UiDialog`, `UiPanel`— siguiendo
 * la pantalla `plant-detail` del wireframe de administración.
 *
 * **Híbrida a propósito.** Lo que el API sirve es real: la planta, su especie, su localización, sus
 * tags, los cuidados heredados y —por fin— sus lecturas, que `GET /plants/{id}/care-records`
 * expone desde T-03 y nadie consumía. Lo que no existe todavía sale de `mocks/plantDetail.mock.ts`
 * y **se marca en la pantalla**, no solo en el código.
 */
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'
import { usePlants } from '@features/plants/composables/usePlants'
import type { PlantDetail } from '@features/plants/types/plant.types'
import { usePlantHistory, toTimelineEvents } from '@features/care-records/composables/usePlantHistory'
import type { CareRecord } from '@features/care-records/types/careRecord.types'
import { plantGlance } from '@features/plants/composables/plantGlance'
import { MOCK_EVENTS, MOCK_NOTICE, MOCK_TASKS } from '@features/plants/mocks/plantDetail.mock'

const route = useRoute()
const plantId = String(route.params.id)
const { detail } = usePlants()
const { set: setBreadcrumbs } = useBreadcrumbs()
const history = usePlantHistory()

const plant = ref<PlantDetail | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const tab = ref('resumen')
const readingOpen = ref(false)
const noticeDismissed = ref(false)

/*
 * Mientras la planta carga, el último nivel es neutro: no se inventa un nombre ni se deja el
 * hueco saltando de sitio cuando llega el dato (ADR-013, los datos llegan ya montada la página).
 */
setBreadcrumbs([{ label: 'Inventario', to: '/plants' }, { label: 'Planta' }])

onMounted(async () => {
  const result = await detail(plantId)
  loading.value = false

  if (!result.success) {
    error.value = result.error!.message
    return
  }

  plant.value = result.data!
  setBreadcrumbs([{ label: 'Inventario', to: '/plants' }, { label: plant.value.nickname }])
  // El historial no bloquea la ficha: si falla, la planta se ve igual.
  history.load(plantId)
})

/** La lectura recién registrada entra en la cronología sin recargar. */
function onRegistered(record: CareRecord) {
  history.prepend(record)
  readingOpen.value = false
}

const readingEvents = computed(() => toTimelineEvents(history.records.value))

/** Las lecturas son reales; el resto de eventos, maqueta hasta T-20. `UiTimeline` los ordena. */
const timelineEvents = computed(() => [...readingEvents.value, ...MOCK_EVENTS])

/** El color de la marca es lo que hace la cronología legible de un vistazo, como en el wireframe. */
const TIMELINE_TYPES = [
  { value: 'reading', label: 'Lectura de cultivo', mark: '∿', tone: 'brand' as const },
  { value: 'water', label: 'Riego', mark: '◇', tone: 'info' as const },
  { value: 'photo', label: 'Fotografía y comentario', mark: '▧', tone: 'brand' as const },
  { value: 'bloom', label: 'Floración', mark: '✣', tone: 'warning' as const },
  { value: 'move', label: 'Movimiento', mark: '⌖', tone: 'neutral' as const },
]

const recordById = computed(
  () => new Map(history.records.value.map((record) => [record.id, record])),
)

/**
 * «De un vistazo»: riego y medición salen de lecturas reales; la tarea y la floración son maqueta
 * y van marcadas. `now` se pasa aquí y no dentro, para que la función sea determinista y testeable.
 */
const glance = computed(() => plantGlance(history.records.value, new Date().toISOString()))
</script>

<template>
  <section>
    <p v-if="loading" data-test="loading" role="status">Cargando la planta…</p>

    <div v-else-if="error" class="not-found">
      <UiInlineError title="No se ha podido abrir la planta" data-test="error">
        {{ error }}
        <template #action>
          <UiButton variant="secondary" to="/plants" data-test="back-to-inventory">
            Volver al inventario
          </UiButton>
        </template>
      </UiInlineError>
    </div>

    <template v-else-if="plant">
      <PlantHeader :plant="plant" @register-reading="readingOpen = true" />

      <UiNotice
        v-if="!noticeDismissed"
        severity="warning"
        :title="MOCK_NOTICE.title"
        data-mock="true"
        dismissible
        @dismiss="noticeDismissed = true"
      >
        {{ MOCK_NOTICE.body }} <em>(dato de ejemplo hasta T-23)</em>
      </UiNotice>

      <UiTabs
        v-model="tab"
        :tabs="[
          { value: 'resumen', label: 'Resumen e historial' },
          { value: 'fotografias', label: 'Fotografías' },
          { value: 'floracion', label: 'Floración' },
          { value: 'datos', label: 'Datos' },
        ]"
      />

      <div v-if="tab === 'resumen'" class="plant-layout">
        <div>
          <UiSummaryGrid eyebrow="Estado actual" title="De un vistazo" :items="glance">
            <template #action>
              <UiButton variant="text" :to="`/plants/${plant.id}/edit`">Editar datos</UiButton>
            </template>
          </UiSummaryGrid>

          <UiPanel title="Historial completo" class="history">
            <p v-if="history.loading.value" role="status">Cargando el historial…</p>
            <UiTimeline v-else :events="timelineEvents" :types="TIMELINE_TYPES" data-test="timeline">
              <template #event-reading="{ event }">
                <!-- Las medidas, comparables entre sí: mismo patrón que «de un vistazo», compacto. -->
                <div :data-test="`reading-${event.id}`" class="reading-values">
                  <UiSummaryGrid
                    density="compact"
                    :items="event.values.map((value) => ({ label: value.label, value: value.text, absent: value.absent }))"
                  />
                </div>
                <RecommendationPanel
                  v-if="recordById.get(event.id)"
                  :plant-id="plant.id"
                  :care-record="recordById.get(event.id)!"
                />
              </template>
              <template #event-water="{ event }"><p class="mock-body">{{ event.body }} <em>(ejemplo · T-20)</em></p></template>
              <template #event-photo="{ event }"><p class="mock-body">{{ event.body }} <em>(ejemplo · T-20)</em></p></template>
              <template #event-bloom="{ event }"><p class="mock-body">{{ event.body }} <em>(ejemplo · T-20)</em></p></template>
              <template #event-move="{ event }"><p class="mock-body">{{ event.body }} <em>(ejemplo · T-20)</em></p></template>
            </UiTimeline>
          </UiPanel>
        </div>

        <aside class="plant-side">
          <UiPanel title="Cuidados efectivos">
            <SpeciesRanges :species="plant.species" data-test="species-ranges" />
            <p class="inheritance">
              Hereda todos los valores de <em>{{ plant.species.scientificName }}</em>.
            </p>
          </UiPanel>

          <UiPanel title="Próximo trabajo" data-mock="true">
            <ul class="tasks">
              <li v-for="task in MOCK_TASKS" :key="task.id">
                <strong>{{ task.title }}</strong>
                <small>{{ task.detail }}</small>
              </li>
            </ul>
            <p class="mock-note">Datos de ejemplo hasta T-22.</p>
          </UiPanel>
        </aside>
      </div>

      <UiEmptyState v-else-if="tab === 'fotografias'" title="Las fotografías llegan en T-19" mark="▧">
        Esta sección necesita almacenamiento de ficheros, que todavía no existe.
      </UiEmptyState>

      <UiEmptyState v-else-if="tab === 'floracion'" title="Las floraciones llegan en T-20" mark="✣">
        Registrar floraciones reales necesita la cronología de eventos del modelo.
      </UiEmptyState>

      <UiPanel v-else title="Datos del ejemplar">
        <dl class="data">
          <div><dt>Apodo</dt><dd>{{ plant.nickname }}</dd></div>
          <div><dt>Especie</dt><dd>{{ plant.species.scientificName }}</dd></div>
          <div><dt>Localización</dt><dd>{{ plant.location.name }}</dd></div>
          <div>
            <dt>Tags</dt>
            <dd>
              <template v-if="plant.tags.length">
                <UiStatus v-for="tag in plant.tags" :key="tag.id" tone="neutral">{{ tag.name }}</UiStatus>
              </template>
              <template v-else>Sin tags</template>
            </dd>
          </div>
        </dl>
      </UiPanel>

      <UiDialog
        :open="readingOpen"
        title="Registrar lectura o riego"
        :subtitle="`${plant.nickname} · ${plant.species.scientificName}`"
        @close="readingOpen = false"
      >
        <!-- Los rangos efectivos van al formulario: orientan al escribir, sin salir del diálogo. -->
        <CareRecordForm
          :plant-id="plant.id"
          :species="plant.species"
          @registered="onRegistered"
        />
      </UiDialog>
    </template>
  </section>
</template>

<style scoped>
.not-found {
  max-width: 480px;
}

.plant-layout {
  display: grid;
  gap: var(--space-5);
  grid-template-columns: 1fr minmax(280px, 340px);
  margin-top: var(--space-5);
}


.history {
  margin-top: var(--space-5);
}

.plant-side {
  display: grid;
  gap: var(--space-5);
  height: fit-content;
}

.reading-values {
  margin-top: var(--space-2);
}

.mock-body,
.mock-note {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  margin: var(--space-2) 0 0;
}

.inheritance {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  margin: var(--space-3) 0 0;
}

.tasks {
  list-style: none;
  margin: 0;
  padding: 0;
}

.tasks li {
  border-top: 1px solid var(--color-line);
  padding: var(--space-2) 0;
}

.tasks small {
  color: var(--color-ink-muted);
  display: block;
  font-size: var(--font-size-12);
}

.data div {
  border-top: 1px solid var(--color-line);
  display: flex;
  gap: var(--space-4);
  padding: var(--space-2) 0;
}

.data dt {
  color: var(--color-ink-muted);
  font-size: var(--font-size-13);
  width: 140px;
}

.data dd {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  margin: 0;
}

@media (max-width: 900px) {
  .plant-layout {
    grid-template-columns: 1fr;
  }
}
</style>
