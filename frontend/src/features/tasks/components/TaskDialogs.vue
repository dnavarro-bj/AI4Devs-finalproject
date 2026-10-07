<script setup lang="ts">
/**
 * Los cuatro diálogos de una tarea —editar, completar, reprogramar, omitir o cancelar— enganchados a
 * un `useTaskWorkflow`. Quien monta el flujo (la pantalla de tareas, una ficha, el Dashboard) pone
 * este componente una vez y abre lo que necesite desde el workflow.
 */
import type { TaskWorkflow } from '../composables/useTaskWorkflow'

defineProps<{ workflow: TaskWorkflow }>()
</script>

<template>
  <div>
    <TaskEditorDialog
      :open="workflow.editor.open"
      :task="workflow.editor.task"
      :initial="workflow.editor.initial"
      @saved="workflow.changed()"
      @close="workflow.editor.open = false"
    />
    <TaskCompleteDialog
      :open="workflow.completion.open"
      :task="workflow.completion.task"
      @completed="workflow.completed($event)"
      @close="workflow.completion.open = false"
    />
    <TaskRescheduleDialog
      :open="workflow.reschedule.open"
      :task="workflow.reschedule.task"
      @saved="workflow.changed()"
      @close="workflow.reschedule.open = false"
    />
    <TaskCloseDialog
      :open="workflow.closing.open"
      :task="workflow.closing.task"
      :mode="workflow.closing.mode"
      @saved="workflow.changed()"
      @close="workflow.closing.open = false"
    />
    <AlertResolveProposal
      :open="workflow.proposal.open"
      :alert-id="workflow.proposal.alertId"
      @done="workflow.proposalAnswered()"
    />
  </div>
</template>
