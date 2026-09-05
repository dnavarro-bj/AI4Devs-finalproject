<script setup lang="ts">
import type { Location, SpeciesCare, SpeciesSummary } from '../../types/api'
import { ApiError } from '../../types/api'

const { listLocations, listSpecies, speciesCare } = useCatalogs()
const { create } = usePlants()
const { set: setBreadcrumbs } = useBreadcrumbs()

setBreadcrumbs([{ label: 'Inventario', to: '/plants' }, { label: 'Añadir planta' }])

const nickname = ref('')
const locationId = ref('')
const speciesId = ref('')

const locations = ref<Location[]>([])
const species = ref<SpeciesSummary[]>([])
const selectedSpecies = ref<SpeciesCare | null>(null)

const loading = ref(true)
const submitting = ref(false)
const error = ref<string | null>(null)
const fieldErrors = reactive({ nickname: '', location: '', species: '' })

// Ya montada, no en `setup`: ver ADR-013. Sin esto, el renderizado de servidor intentaría
// alcanzar el API por una URL que dentro del contenedor no resuelve, y la página sería un 500.
onMounted(async () => {
  try {
    const [locationsPage, speciesPage] = await Promise.all([listLocations(), listSpecies()])
    locations.value = locationsPage.content
    species.value = speciesPage.content
  } catch (cause) {
    error.value = cause instanceof ApiError ? cause.message : 'No se han podido cargar los catálogos.'
  } finally {
    loading.value = false
  }
})

// Los rangos solo están en la ficha de la especie, así que se piden al seleccionarla.
watch(speciesId, async (id) => {
  if (!id) {
    selectedSpecies.value = null
    return
  }
  selectedSpecies.value = await speciesCare(id)
})

const locationOptions = computed(() => locations.value.map((location) => ({
  value: location.id,
  label: location.name,
})))

const speciesOptions = computed(() => species.value.map((item) => ({
  value: item.id,
  label: `${item.scientificName} — ${item.commonName}`,
})))

function validate(): boolean {
  fieldErrors.nickname = nickname.value.trim() === '' ? 'El nickname es obligatorio.' : ''
  fieldErrors.location = locationId.value === '' ? 'Elige una localización.' : ''
  fieldErrors.species = speciesId.value === '' ? 'Elige una especie.' : ''
  return !fieldErrors.nickname && !fieldErrors.location && !fieldErrors.species
}

async function submit() {
  error.value = null
  if (!validate()) return

  submitting.value = true
  try {
    const plant = await create(nickname.value.trim(), locationId.value, speciesId.value)
    await navigateTo(`/plants/${plant.id}`)
  } catch (cause) {
    // Se conserva lo escrito: el usuario corrige y reintenta sin volver a teclearlo.
    error.value = cause instanceof ApiError ? cause.message : 'No se ha podido crear la planta.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section>
    <h1>Añadir planta</h1>

    <form @submit.prevent="submit">
      <UiPanel>
        <UiInlineError v-if="error" data-test="error" class="form__error">{{ error }}</UiInlineError>

        <div class="form__fields">
          <UiField
            v-model="nickname"
            label="Nickname"
            data-test="nickname"
            :error="fieldErrors.nickname"
            error-test="nickname-error"
          />

          <UiField
            v-model="locationId"
            label="Localización"
            as="select"
            placeholder="Elige una localización"
            :options="locationOptions"
            data-test="location"
            :error="fieldErrors.location"
            error-test="location-error"
          />

          <UiField
            v-model="speciesId"
            label="Especie"
            as="select"
            placeholder="Elige una especie"
            :options="speciesOptions"
            data-test="species"
            :error="fieldErrors.species"
            error-test="species-error"
          />
        </div>

        <SpeciesRanges v-if="selectedSpecies" :species="selectedSpecies" class="form__ranges" />
      </UiPanel>

      <div class="actions">
        <UiButton variant="secondary" to="/plants">Cancelar</UiButton>
        <UiButton type="submit" :busy="submitting">
          {{ submitting ? 'Creando…' : 'Crear planta' }}
        </UiButton>
      </div>
    </form>
  </section>
</template>

<style scoped>
h1 {
  margin-bottom: var(--space-6);
}

.form__error {
  margin-bottom: var(--space-4);
}

.form__fields {
  display: grid;
  gap: var(--space-5);
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.form__ranges {
  margin-top: var(--space-5);
}

/* Cancelar a la izquierda del guardado (patterns.md, "Formularios largos"). */
.actions {
  align-items: center;
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
  margin-top: var(--space-5);
}
</style>
