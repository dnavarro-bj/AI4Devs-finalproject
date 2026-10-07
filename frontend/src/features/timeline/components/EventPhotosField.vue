<script setup lang="ts">
/**
 * «Adjuntar fotografías» de los diálogos de comentario, intervención y floración. Las elige y las
 * conserva con su vista previa; **no las sube**: el diálogo emite el evento y quien lo abre crea el
 * evento y **después** sube las fotos con su `eventId` —un fallo de imagen no deshace el evento—.
 */
const files = defineModel<File[]>({ required: true })
</script>

<template>
  <div class="event-photos" data-test="event-photos-field">
    <LocalPhotoPicker
      v-model="files"
      label="Adjuntar fotografías (opcional)"
      upload-test="event-photo-upload"
    />
  </div>
</template>
