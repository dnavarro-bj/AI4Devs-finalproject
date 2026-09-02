<script setup lang="ts">
import type { Location, SpeciesCare, SpeciesSummary } from '../../types/api'
import { ApiError } from '../../types/api'

const { listLocations, listSpecies, speciesCare } = useCatalogs()
const { create } = usePlants()

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
      <p v-if="error" class="error" data-test="error" role="alert">{{ error }}</p>

      <div class="field">
        <label for="nickname">Nickname</label>
        <input id="nickname" v-model="nickname" data-test="nickname" type="text">
        <p v-if="fieldErrors.nickname" class="error" data-test="nickname-error">{{ fieldErrors.nickname }}</p>
      </div>

      <div class="field">
        <label for="location">Localización</label>
        <select id="location" v-model="locationId" data-test="location">
          <option value="">Elige una localización</option>
          <option v-for="location in locations" :key="location.id" :value="location.id">
            {{ location.name }}
          </option>
        </select>
        <p v-if="fieldErrors.location" class="error" data-test="location-error">{{ fieldErrors.location }}</p>
      </div>

      <div class="field">
        <label for="species">Especie</label>
        <select id="species" v-model="speciesId" data-test="species">
          <option value="">Elige una especie</option>
          <option v-for="item in species" :key="item.id" :value="item.id">
            {{ item.scientificName }} — {{ item.commonName }}
          </option>
        </select>
        <p v-if="fieldErrors.species" class="error" data-test="species-error">{{ fieldErrors.species }}</p>
      </div>

      <SpeciesRanges v-if="selectedSpecies" :species="selectedSpecies" />

      <div class="actions">
        <button type="submit" :disabled="submitting">
          {{ submitting ? 'Creando…' : 'Crear planta' }}
        </button>
        <NuxtLink to="/plants">Cancelar</NuxtLink>
      </div>
    </form>
  </section>
</template>

<style scoped>
form {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  display: grid;
  gap: var(--space);
  padding: var(--space);
}

.actions {
  align-items: center;
  display: flex;
  gap: var(--space);
}

.error {
  color: var(--color-danger);
  margin: 0.3rem 0 0;
}
</style>
