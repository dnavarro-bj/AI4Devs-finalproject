<script setup lang="ts">
/**
 * Completar una tarea **enseñando antes el alcance exacto** (§14.4): las plantas que se verían
 * afectadas ahora, paginadas, cada una con la posibilidad de excluirla, y el contador «se registrará
 * en N de M». No existe en el prototipo: se compone sobre el diálogo, la paginación y los campos del
 * kit.
 *
 * El registro del hecho concreto es **opcional** y lo decide el tipo de la tarea: agua para un riego,
 * maceta para un cambio de maceta, notas para una poda. El mismo registro se aplica a todas las
 * plantas incluidas, y el diálogo lo dice.
 */
import { useReferenceDate } from '@shared/composables/useReferenceDate'
import { useTaskCompletion, type CompletionRecordDraft } from '../composables/useTaskCompletion'
import { completionRecordKind } from '../mappers/task.mapper'
import type { Task } from '../types/task.types'

const props = defineProps<{ open: boolean, task: Task | null }>()
const emit = defineEmits<{ completed: [Task], close: [] }>()

const today = useReferenceDate()
const completion = useTaskCompletion()

const day = ref(today.value)
const water = ref<string | number>('')
const potSize = ref<string | number>('')
const notes = ref('')
const dayError = ref('')

watch(() => [props.open, props.task?.id] as const, ([open]) => {
  if (!open || !props.task) return
  day.value = today.value
  water.value = ''
  potSize.value = ''
  notes.value = ''
  dayError.value = ''
  completion.start(props.task)
}, { immediate: true })

const kind = computed(() => (props.task ? completionRecordKind(props.task.type) : null))
const filled = (value: string | number) => value !== '' && value !== null && !Number.isNaN(Number(value))

function draft(): CompletionRecordDraft | null {
  if (kind.value === 'reading' && filled(water.value)) return { waterAmountMl: Number(water.value) }
  if (kind.value === 'trasplante' && filled(potSize.value)) return { potSize: Number(potSize.value) }
  if (kind.value === 'poda' && notes.value.trim()) return { notes: notes.value.trim() }
  return null
}

async function confirm() {
  dayError.value = completion.isFuture(day.value) ? 'La fecha de finalización no puede ser futura.' : ''
  if (dayError.value) return
  const done = await completion.confirm(day.value, draft())
  if (done) emit('completed', done)
}

const plural = (count: number) => `${count} ${count === 1 ? 'planta' : 'plantas'}`
</script>

<template>
  <UiDialog
    :open="open"
    :title="task ? `Completar: ${task.title}` : 'Completar tarea'"
    subtitle="Registrar trabajo realizado"
    data-test="complete-dialog"
    @close="emit('close')"
  >
    <UiInlineError v-if="completion.error.value" data-test="complete-error">{{ completion.error.value }}</UiInlineError>

    <div class="complete">
      <UiField
        v-model="day"
        label="Terminada el"
        type="date"
        :error="dayError"
        error-test="complete-day-error"
        data-test="complete-day"
      />

      <section aria-labelledby="scope-title" data-test="complete-scope">
        <h3 id="scope-title">Plantas afectadas</h3>
        <p class="complete__count" data-test="completion-count" aria-live="polite">
          <template v-if="completion.total.value === 0 && !completion.loading.value">
            La tarea no afecta ahora a ninguna planta.
          </template>
          <template v-else>
            Se registrará en {{ plural(completion.affected.value) }} de {{ completion.total.value }}.
          </template>
        </p>

        <p v-if="completion.loading.value" role="status">Calculando el alcance…</p>
        <ul v-else-if="completion.scope.value?.content.length" class="complete__plants">
          <li v-for="plant in completion.scope.value.content" :key="plant.id" :class="{ 'is-excluded': completion.excluded.has(plant.id) }">
            <label>
              <input
                type="checkbox"
                :checked="completion.excluded.has(plant.id)"
                :aria-label="`Excluir ${plant.code}`"
                data-test="exclude-plant"
                @change="completion.toggle(plant.id)"
              >
              <span class="complete__what">
                <code>{{ plant.code }}</code>
                <strong>{{ plant.nickname }}</strong>
                <small>{{ plant.species.scientificName }} · {{ plant.location.path || plant.location.name }}</small>
              </span>
              <span class="complete__flag">{{ completion.excluded.has(plant.id) ? 'Excluida' : 'Se incluye' }}</span>
            </label>
          </li>
        </ul>

        <UiPagination
          :page="completion.page.value"
          :total-pages="completion.scope.value?.totalPages ?? 0"
          :loading="completion.loading.value"
          label="Páginas del alcance"
          @update:page="completion.loadPage($event)"
        />
      </section>

      <section v-if="kind" aria-labelledby="record-title" data-test="complete-record">
        <h3 id="record-title">Registrar el hecho (opcional)</h3>
        <UiField
          v-if="kind === 'reading'"
          v-model="water"
          label="Agua entregada"
          type="number"
          min="0"
          unit="ml"
          data-test="record-water"
        />
        <UiField
          v-else-if="kind === 'trasplante'"
          v-model="potSize"
          label="Tamaño de la maceta"
          type="number"
          min="1"
          unit="cm"
          data-test="record-pot"
        />
        <UiField
          v-else
          v-model="notes"
          label="Notas de la poda"
          as="textarea"
          :rows="2"
          data-test="record-notes"
        />
        <p class="complete__hint" data-test="record-hint">
          El mismo registro se aplica a todas las plantas incluidas. Si una necesita un dato distinto,
          exclúyela y regístrala aparte.
        </p>
      </section>
    </div>

    <template #footer>
      <UiButton variant="secondary" data-test="complete-cancel" @click="emit('close')">Cancelar</UiButton>
      <UiButton
        :disabled="!completion.canConfirm.value"
        :busy="completion.submitting.value"
        data-test="complete-confirm"
        @click="confirm"
      >
        Completar tarea
      </UiButton>
    </template>
  </UiDialog>
</template>

<style scoped>
.complete {
  display: grid;
  gap: var(--space-5);
}

h3 {
  font-size: var(--font-size-14);
  margin: 0 0 var(--space-2);
}

.complete__count,
.complete__hint {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  margin: 0 0 var(--space-2);
}

.complete__plants {
  display: grid;
  gap: var(--space-2);
  list-style: none;
  margin: 0 0 var(--space-3);
  padding: 0;
}

.complete__plants label {
  align-items: center;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: grid;
  gap: var(--space-3);
  grid-template-columns: auto 1fr auto;
  padding: var(--space-2) var(--space-3);
}

.complete__plants .is-excluded label {
  background: var(--color-surface-muted);
  color: var(--color-ink-muted);
}

.complete__what code,
.complete__what strong,
.complete__what small {
  display: block;
}

.complete__what code {
  font-family: var(--font-mono);
  font-size: var(--font-size-11);
}

.complete__what small,
.complete__flag {
  color: var(--color-ink-muted);
  font-size: var(--font-size-11);
}
</style>
