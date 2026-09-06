<script setup lang="ts">
/**
 * Galería del sistema de diseño. Muestra los componentes **reales**, con la misma implementación
 * que usan las pantallas, para que el kit se revise ejecutándose y no en una copia que se
 * desincroniza. No figura en la navegación de producto (ADR-014).
 *
 * Los datos de ejemplar —código permanente, estado, última lectura— son **de muestra**: el API no
 * los expone todavía, y ninguna pantalla de producto los pinta.
 */
import { useToast } from '@shared/composables/useToast'
import { NAVIGATION as APP_NAVIGATION } from '@features/layout/navigation'

definePageMeta({ layout: 'blank' })

useHead({ title: 'Cactify · UI kit' })

const { show } = useToast()

const filters = ref(['Pleno sol', 'Revisar'])
const dialogOpen = ref(false)
const tab = ref('resumen')
const selected = ref<string[]>([])
const humidity = ref('31')
const ph = ref('15')
const location = ref('')

const SAMPLE_ROWS = [
  { id: '1', code: 'CAT-GRUSS-01', nickname: 'Asiento de suegra', location: 'Invernadero 1 / A3', status: 'warning' },
  { id: '2', code: 'CAT-ASTRO-12', nickname: 'Superkabuto 12', location: 'Invernadero 1 / A3', status: 'danger' },
  { id: '3', code: 'CAT-MAMMI-04', nickname: 'Bola blanca', location: 'Invernadero 1 / A4', status: 'ok' },
] as const

const COLUMNS = [
  { key: 'nickname', label: 'Planta', sortable: true },
  { key: 'location', label: 'Localización', sortable: true },
  { key: 'status', label: 'Estado' },
]

// La identificativa —la primera— no se puede ocultar, así que no está aquí.
const HIDEABLE = COLUMNS.slice(1)

const sort = ref<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'nickname', direction: 'asc' })
const visibleColumns = ref(HIDEABLE.map((column) => column.key))
const density = ref<'comfortable' | 'compact'>('comfortable')

const STATUS_LABELS: Record<string, string> = { ok: 'Al día', warning: 'Revisar', danger: 'Alerta' }

// El mapa real de la aplicación: la galería muestra los componentes con los datos que usan.
const NAVIGATION = APP_NAVIGATION

const galleryPage = ref(3)
const calendarMonth = ref('2026-09')

const TIMELINE_TYPES = [
  { value: 'reading', label: 'Lecturas', mark: '∿' },
  { value: 'water', label: 'Riegos', mark: '◇' },
  { value: 'photo', label: 'Fotografías', mark: '▧' },
  { value: 'bloom', label: 'Floración', mark: '✣' },
]

const TIMELINE_EVENTS = [
  { id: '1', type: 'reading', title: 'Condiciones tras una semana cálida', at: '2026-08-21T18:06:00Z' },
  { id: '2', type: 'water', title: 'Riego de mantenimiento', at: '2026-08-16T08:42:00Z' },
  { id: '3', type: 'photo', title: 'Nueva espinación en el ápice', at: '2026-08-02T18:14:00Z' },
  { id: '4', type: 'bloom', title: 'Floración finalizada', at: '2026-05-22T10:00:00Z' },
  // Un tipo que el kit no conoce: se muestra igual, con representación de reserva.
  { id: '5', type: 'movimiento', title: 'Traslado a Bandeja A3', at: '2026-03-11T09:00:00Z' },
]

const AGENDA = [
  { id: '1', due: '2026-09-01', title: 'Revisión general', detail: 'CAT-GRUSS-01' },
  { id: '2', due: '2026-09-06', title: 'Regar bandeja A3', detail: '31 plantas' },
  { id: '3', due: '2026-09-09', title: 'Comprobar tamaño de maceta' },
  { id: '4', due: '2026-10-20', title: 'Poda de raíces' },
]

const CALENDAR = [
  { id: '1', date: '2026-09-08', label: 'Regar A3' },
  { id: '2', date: '2026-09-08', label: 'Regar A4' },
  { id: '3', date: '2026-09-08', label: 'Revisar maceta', tone: 'warning' },
  { id: '4', date: '2026-09-15', label: 'Trasplante', tone: 'danger' },
]

// Rectángulos de color: la galería del kit no depende de ningún fichero externo.
const swatch = (color: string) => `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Crect width='120' height='120' fill='${color}'/%3E%3C/svg%3E`

const GALLERY_IMAGES = [
  { id: '1', src: swatch('%236b8f71'), alt: 'Ápice del ejemplar', primary: true },
  { id: '2', src: swatch('%23a8bfa0'), alt: 'Vista lateral', caption: 'Tras el trasplante' },
  { id: '3', src: swatch('%23c9d6bf'), alt: 'Raíces' },
]

const appliedFilters = ref([
  { id: 'location', label: 'Localización: Invernadero 1' },
  { id: 'status', label: 'Estado: Revisar' },
])
const removeFilter = (id: string) => {
  appliedFilters.value = appliedFilters.value.filter((criterion) => criterion.id !== id)
}

// Cuatro niveles, como la jerarquía real del producto.
const TREE = [
  {
    id: '1',
    label: 'Invernadero 1',
    count: 486,
    children: [
      {
        id: '2',
        label: 'Bancada norte',
        count: 120,
        children: [
          { id: '3', label: 'Bandeja A3', count: 24 },
          { id: '4', label: 'Bandeja A4', count: 31 },
        ],
      },
    ],
  },
  { id: '9', label: 'Zona exterior', count: 407 },
]
const searchEmpty = ref('')
const searchHit = ref('gruss')
const searchMiss = ref('zzz')

const SEARCH_GROUPS = [
  {
    kind: 'plant',
    label: 'Plantas',
    results: [
      { label: 'CAT-GRUSS-01', detail: 'Bola verde · Bandeja A3', to: '/plants' },
      { label: 'CAT-GRUSS-02', detail: 'Erizo · Bandeja A3', to: '/plants' },
    ],
  },
  {
    kind: 'species',
    label: 'Especies',
    results: [{ label: 'Echinocactus grusonii', detail: 'Asiento de suegra', to: '/species' }],
  },
]
</script>

<template>
  <div class="gallery">
    <header class="gallery__head">
      <p class="gallery__eyebrow">Cactify · sistema de diseño</p>
      <h1>Los componentes, tal y como la aplicación los pinta.</h1>
      <p class="gallery__lead">
        Esta galería monta los componentes reales de <code>app/components/ui/</code>. Si algo se ve
        aquí, así se ve en producto. Los datos son de muestra.
      </p>
    </header>

    <section class="gallery__section">
      <h2>Acciones</h2>
      <div class="row">
        <UiButton>Guardar lectura</UiButton>
        <UiButton variant="secondary">Crear tarea</UiButton>
        <UiButton variant="text">Ver historial</UiButton>
        <UiButton variant="danger">Eliminar etiqueta</UiButton>
        <UiButton variant="icon" label="Más acciones">•••</UiButton>
      </div>
      <div class="row">
        <UiButton disabled>Guardar cambios</UiButton>
        <UiButton busy>Creando…</UiButton>
      </div>
    </section>

    <section class="gallery__section">
      <h2>Campos</h2>
      <div class="grid-2">
        <UiField label="Nombre de la planta" model-value="Asiento de suegra" help="Nombre interno; la especie no cambia." />
        <UiField
          v-model="location"
          label="Localización"
          as="select"
          placeholder="Elige una localización"
          :options="[{ value: '1', label: 'Invernadero 1 / Bancada norte / A3' }]"
          help="Ubicación exacta del ejemplar."
        />
        <UiField v-model="humidity" label="Humedad" unit="%" type="number" help="Rango efectivo: 20–40%." />
        <UiField v-model="ph" label="pH del sustrato" unit="pH" type="number" error="Introduce un valor entre 0 y 14." />
        <UiField label="Observación" as="textarea" model-value="Coloración uniforme después del último riego." help="Describe solo lo observado." />
        <UiField label="Especie" model-value="Echinocactus grusonii" readonly help="Se hereda del catálogo." />
      </div>
    </section>

    <section class="gallery__section">
      <h2>Estado, prioridad y filtros</h2>
      <div class="row">
        <UiStatus tone="ok">Al día</UiStatus>
        <UiStatus tone="warning">Revisar</UiStatus>
        <UiStatus tone="danger">Crítica</UiStatus>
        <UiStatus tone="neutral">Inactiva</UiStatus>
      </div>
      <div class="row">
        <UiPriority level="routine">Rutina</UiPriority>
        <UiPriority level="soon">Atender pronto</UiPriority>
        <UiPriority level="immediate">Inmediata</UiPriority>
      </div>
      <div class="row">
        <UiFilterChip
          v-for="filter in filters"
          :key="filter"
          :label="filter"
          @remove="filters = filters.filter((item) => item !== filter)"
        />
        <UiButton v-if="!filters.length" variant="text" @click="filters = ['Pleno sol', 'Revisar']">
          Restaurar filtros
        </UiButton>
      </div>
    </section>

    <section class="gallery__section">
      <h2>Navegación</h2>
      <UiBreadcrumbs :items="[{ label: 'Inventario', to: '/plants' }, { label: 'CAT-GRUSS-01' }]" />
      <!-- Sobre el fondo de la barra lateral, que es donde vive: en claro no se leería. -->
      <div class="on-sidebar">
        <UiNavGroup label="Colección" :entries="NAVIGATION[0]!.entries" active-path="/plants/1" />
        <UiNavGroup label="Catálogos" :entries="NAVIGATION[2]!.entries" />
      </div>

      <UiPageHeader title="Plantas" context="312 ejemplares · 4 requieren atención">
        <template #actions>
          <UiButton variant="secondary">Exportar</UiButton>
          <UiButton>Añadir planta</UiButton>
        </template>
      </UiPageHeader>
      <UiPageHeader title="Configuración" />

      <!-- Los tres estados del buscador: sin buscar, con resultados agrupados y sin resultados. -->
      <div class="search-samples">
        <UiGlobalSearch v-model="searchEmpty" :groups="[]" />
        <UiGlobalSearch v-model="searchHit" :groups="SEARCH_GROUPS" />
        <UiGlobalSearch v-model="searchMiss" :groups="[]" />
      </div>
      <UiTabs
        v-model="tab"
        :tabs="[
          { value: 'resumen', label: 'Resumen e historial' },
          { value: 'fotos', label: 'Fotografías', count: 8 },
          { value: 'datos', label: 'Datos' },
        ]"
      />
      <p class="note">Pestaña activa: {{ tab }}</p>
    </section>

    <section class="gallery__section">
      <h2>Datos</h2>
      <!-- Las tres posiciones del recorrido: primera, intermedia y última. -->
      <UiPagination :page="0" :total-pages="7" />
      <UiPagination v-model:page="galleryPage" :total-pages="7" />
      <UiPagination :page="6" :total-pages="7" />
      <p class="note">Página seleccionada: {{ galleryPage + 1 }}</p>
      <UiFilterBar :applied="appliedFilters" @remove="removeFilter" @clear="appliedFilters = []">
        <UiButton variant="secondary">Localización ⌄</UiButton>
        <UiButton variant="secondary">Especie ⌄</UiButton>
      </UiFilterBar>

      <div class="stat-tiles">
        <UiStatTile :value="12" label="Alertas importantes" to="/alerts" tone="danger" />
        <UiStatTile :value="7" label="Tareas vencidas" to="/tasks" tone="warning" />
        <UiStatTile :value="0" label="Sin revisar" context="más de 30 días" to="/plants" />
        <UiStatTile :value="1284" label="Ejemplares" />
      </div>

      <!-- Acotado como en su sitio real: un panel lateral, no el ancho de la pantalla. -->
      <div class="tree-sample">
        <UiTree :nodes="TREE" aria-label="Localizaciones" @select="show(`Localización ${$event}`)" />
      </div>

      <div class="table-controls">
        <UiButton
          variant="secondary"
          @click="density = density === 'compact' ? 'comfortable' : 'compact'"
        >
          Densidad: {{ density === 'compact' ? 'compacta' : 'cómoda' }}
        </UiButton>
        <label v-for="column in HIDEABLE" :key="column.key">
          <input v-model="visibleColumns" type="checkbox" :value="column.key">
          {{ column.label }}
        </label>
      </div>
      <p class="note">Orden: {{ sort ? `${sort.key} ${sort.direction}` : 'ninguno' }}</p>

      <UiTable
        v-model:selected="selected"
        :columns="COLUMNS"
        :rows="[...SAMPLE_ROWS]"
        row-key="id"
        selectable
        :sort="sort"
        :visible-columns="visibleColumns"
        :density="density"
        @update:sort="sort = $event"
      >
        <template #bulk-actions>
          <UiButton variant="secondary">Mover</UiButton>
          <UiButton variant="secondary">Crear tarea</UiButton>
        </template>
        <template #cell-nickname="{ row }">
          <span class="plant-cell">
            <span class="plant-thumb" aria-hidden="true">♧</span>
            <span>
              <code>{{ row.code }}</code>
              <strong>{{ row.nickname }}</strong>
            </span>
          </span>
        </template>
        <template #cell-status="{ row }">
          <UiStatus :tone="row.status as 'ok' | 'warning' | 'danger'">{{ STATUS_LABELS[row.status as string] }}</UiStatus>
        </template>
      </UiTable>
    </section>

    <section class="gallery__section">
      <h2>Cronología y trabajo</h2>
      <UiTimeline :events="TIMELINE_EVENTS" :types="TIMELINE_TYPES">
        <template #event-water><p class="note">450 ml · desde la tarea «Regar bandejas A3 y A4».</p></template>
        <template #event-photo><p class="note">La coloración se mantiene uniforme.</p></template>
      </UiTimeline>

      <div class="two-columns">
        <UiAgendaList :entries="AGENDA" today="2026-09-06" @select="show(`Tarea ${$event}`)" />
        <UiCalendarMonth
          v-model:month="calendarMonth"
          today="2026-09-06"
          :entries="CALENDAR"
          :max-per-day="2"
          @select-day="show(`Día ${$event}`)"
        />
      </div>
    </section>

    <section class="gallery__section">
      <h2>Multimedia y formularios largos</h2>
      <UiMediaGallery :images="GALLERY_IMAGES" />
      <UiMediaGallery :images="[]" />
      <!-- La subida real —formatos, tamaño, miniaturas y almacenamiento— llega en T-19. -->
      <UiUploadArea label="Añadir fotografías" accept="image/*" hint="JPG o PNG" @files="show(`${$event.length} fichero(s)`)" />

      <UiFormSection title="Identidad" description="Cómo reconocer este ejemplar">
        <UiField v-model="humidity" label="Apodo" />
      </UiFormSection>
      <UiFormSection title="Pauta anual">
        <UiMonthRange :from="3" :to="10" label="Crecimiento" />
        <UiMonthRange :from="11" :to="2" label="Reposo" />
      </UiFormSection>
      <UiFormSection title="Composición del sustrato">
        <UiProportionBar :parts="[{ label: 'Mineral', value: 70 }, { label: 'Orgánico', value: 30 }]" />
        <UiProportionBar :parts="[{ label: 'Mineral', value: 70 }, { label: 'Orgánico', value: 20 }]" />
      </UiFormSection>
    </section>

    <section class="gallery__section">
      <h2>Superficies y feedback</h2>
      <div class="grid-2">
        <UiPanel title="Cuidados recomendados">
          <template #action>
            <UiButton variant="text">Ver especie</UiButton>
          </template>
          <p class="note">Un panel agrupa una responsabilidad y se separa por borde, nunca por sombra.</p>
        </UiPanel>

        <UiNotice severity="warning" title="Revisión pendiente" dismissible>
          No se registra una observación desde hace 43 días.
          <template #action>
            <UiButton variant="secondary">Crear tarea</UiButton>
          </template>
        </UiNotice>

        <UiEmptyState title="Todavía no hay plantas aquí">
          Añade un ejemplar o mueve plantas desde otra ubicación.
          <template #action>
            <UiButton>Añadir planta</UiButton>
          </template>
        </UiEmptyState>

        <UiInlineError title="No se pudo importar la fila 18">
          El código CAT-GRUSS-01 ya existe. Usa otro código o excluye la fila.
        </UiInlineError>
      </div>

      <div class="row">
        <UiInlineError>No se ha podido cargar el inventario.</UiInlineError>
      </div>

      <div class="row">
        <UiButton variant="secondary" @click="show('Lectura guardada')">Mostrar confirmación</UiButton>
        <UiButton variant="secondary" @click="dialogOpen = true">Abrir diálogo</UiButton>
      </div>
    </section>

    <section class="gallery__section">
      <h2>Etiqueta de ejemplar</h2>
      <div class="grid-2">
        <UiSpecimenLabel
          code="CAT-GRUSS-01"
          name="Asiento de suegra"
          species="Echinocactus grusonii"
          :details="[
            { label: 'Ubicación', value: 'Invernadero 1 / A3' },
            { label: 'Germinación', value: '04/2021' },
          ]"
          footnote="Pleno sol · Exterior"
        >
          <template #status>
            <UiStatus tone="ok">Activa</UiStatus>
          </template>
        </UiSpecimenLabel>

        <UiSpecimenLabel name="Bola verde" species="Mammillaria" />
      </div>
      <p class="note">
        A la derecha, lo que el API expone hoy: sin código permanente ni contexto. Lo ausente se
        omite; no se inventa.
      </p>
    </section>

    <UiDialog
      :open="dialogOpen"
      title="Análisis de CAT-GRUSS-01"
      subtitle="Recomendación vinculada a una lectura"
      footnote="Guardada junto a su lectura."
      @close="dialogOpen = false"
    >
      <div class="row">
        <UiStatus tone="warning">Riesgo medio</UiStatus>
        <UiPriority level="soon">Atender pronto</UiPriority>
      </div>
      <h3>Posible estrés hídrico leve</h3>
      <p class="note">
        La humedad está por debajo del rango efectivo y la temperatura se acerca al máximo
        recomendado.
      </p>
      <template #footer>
        <UiButton @click="dialogOpen = false">Cerrar y volver</UiButton>
      </template>
    </UiDialog>
  </div>
</template>

<style scoped>
/* La navegación solo tiene sentido sobre su superficie: el kit no la muestra flotando en claro. */
.two-columns {
  display: grid;
  gap: var(--space-6);
  grid-template-columns: minmax(240px, 1fr) 2fr;
}

@media (max-width: 900px) {
  .two-columns {
    grid-template-columns: 1fr;
  }
}

.tree-sample {
  max-width: 360px;
}

.stat-tiles {
  display: grid;
  gap: var(--space-3);
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  margin-bottom: var(--space-5);
}

.table-controls {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  margin-bottom: var(--space-3);
}

.table-controls label {
  align-items: center;
  color: var(--color-ink-muted);
  display: inline-flex;
  font-size: var(--font-size-13);
  gap: var(--space-1);
}

.search-samples {
  display: grid;
  gap: var(--space-12);
}

.on-sidebar {
  background: var(--color-sidebar);
  border-radius: var(--radius-md);
  padding: var(--space-3);
}

.gallery__head {
  border-bottom: 1px solid var(--color-line);
  margin-bottom: var(--space-10);
  padding-bottom: var(--space-8);
}

.gallery__eyebrow {
  color: var(--color-brand);
  font-size: var(--font-size-12);
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.gallery__lead {
  color: var(--color-ink-muted);
  max-width: 60ch;
}

.gallery__section {
  border-top: 1px solid var(--color-line);
  display: grid;
  gap: var(--space-4);
  padding: var(--space-8) 0;
}

.gallery__section > h2 {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  letter-spacing: 0.08em;
  margin: 0;
  text-transform: uppercase;
}

.row {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.grid-2 {
  display: grid;
  gap: var(--space-5);
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
}

.note {
  color: var(--color-ink-muted);
  font-size: var(--font-size-13);
  margin: 0;
}

.plant-cell {
  align-items: center;
  display: flex;
  gap: var(--space-2);
}

.plant-thumb {
  align-items: center;
  background: var(--color-brand-soft);
  border-radius: var(--radius-sm);
  color: var(--color-brand);
  display: flex;
  flex: 0 0 auto;
  height: 36px;
  justify-content: center;
  width: 36px;
}

.plant-cell code,
.plant-cell strong {
  display: block;
}
</style>
