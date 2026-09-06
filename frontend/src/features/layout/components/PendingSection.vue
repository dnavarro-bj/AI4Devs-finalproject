<script setup lang="ts">
/**
 * La pantalla de una sección declarada que todavía no está construida.
 *
 * Existe una sola vez y la usan las doce rutas pendientes: doce estados vacíos escritos a mano
 * divergen en cuanto alguien edite uno, y T-13 y T-14 tienen que poder reemplazar el cuerpo sin
 * tocar breadcrumbs ni cabecera.
 *
 * No simula datos. Una tabla de mentira aquí sería indistinguible de una pantalla rota, y peor:
 * daría por construido lo que no lo está.
 *
 * No es un componente del kit —vive en `components/`, no en `components/ui/`— porque es una
 * pantalla de este producto y de este momento, no un patrón reutilizable.
 */
defineProps<{ title: string, ticket: string }>()
</script>

<template>
  <div>
    <UiPageHeader :title="title" />
    <UiEmptyState title="Esta sección está por construir" mark="◷">
      «{{ title }}» todavía no tiene pantalla. La construye el ticket {{ ticket }}; hasta entonces
      la sección existe en la navegación para que la arquitectura de la aplicación esté completa.
    </UiEmptyState>
  </div>
</template>
