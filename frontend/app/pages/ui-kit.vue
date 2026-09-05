<script setup lang="ts">
/**
 * Galería del sistema de diseño. Muestra los componentes **reales**, con la misma implementación
 * que usan las pantallas, para que el kit se revise ejecutándose y no en una copia que se
 * desincroniza. No figura en la navegación de producto (ADR-014).
 *
 * Los datos de ejemplar —código permanente, estado, última lectura— son **de muestra**: el API no
 * los expone todavía, y ninguna pantalla de producto los pinta.
 */
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
  { key: 'nickname', label: 'Planta' },
  { key: 'location', label: 'Localización' },
  { key: 'status', label: 'Estado' },
]

const STATUS_LABELS: Record<string, string> = { ok: 'Al día', warning: 'Revisar', danger: 'Alerta' }
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
      <UiTable v-model:selected="selected" :columns="COLUMNS" :rows="[...SAMPLE_ROWS]" row-key="id" selectable>
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
