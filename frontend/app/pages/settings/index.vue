<script setup lang="ts">
/**
 * La configuración (§20), con la composición de la pantalla `settings` del prototipo: cabecera con
 * el **estado de guardado**, navegación lateral de **cinco ámbitos** y el panel del ámbito activo.
 *
 * Un ámbito a la vez, pero **un solo estado**: cambiar de ámbito no pierde lo editado. «Hay cambios
 * sin guardar» se calcula, no se marca.
 *
 * **Maqueta, y declarada.** Guardar no persiste y no toca la configuración real del sistema; ningún
 * ticket del backlog la recoge. El ámbito de IA declara qué datos se envían y **no muestra ni pide
 * la clave de acceso**: una pantalla de maqueta no es sitio para secretos.
 */
import { useBreadcrumbs } from '@shared/composables/useBreadcrumbs'
import { useToast } from '@shared/composables/useToast'
import { useSettings } from '@features/settings/composables/useSettings'
import { SETTINGS_SCOPES, type SettingsScope } from '@features/settings/types/settings.types'

useHead({ title: 'Cactify · Configuración' })
useBreadcrumbs().set([{ label: 'Configuración' }])

const { values, scope, dirty, save, codePreview } = useSettings()
const toast = useToast()

function onSave() {
  save()
  toast.show('La configuración no se conserva todavía: no hay dónde guardarla.')
}

const sections = SETTINGS_SCOPES.map(({ value, label }) => ({ value, label }))

const timezones = ['Europe/Madrid', 'Atlantic/Canary', 'UTC'].map((value) => ({ value, label: value }))
const languages = [{ value: 'es', label: 'Español' }, { value: 'en', label: 'English' }]
const weekStarts = [{ value: 'monday', label: 'Lunes' }, { value: 'sunday', label: 'Domingo' }]
const temperatureUnits = [{ value: 'c', label: '°C' }, { value: 'f', label: '°F' }]
const volumeUnits = [{ value: 'ml', label: 'ml' }, { value: 'l', label: 'L' }]
const digitOptions = [{ value: '2', label: '2 · 01' }, { value: '3', label: '3 · 001' }, { value: '4', label: '4 · 0001' }]
const separators = [{ value: '-', label: 'Guion · -' }, { value: '/', label: 'Barra · /' }, { value: '', label: 'Sin separador' }]
const labelSizes = [{ value: '50x20', label: '50 × 20 mm' }, { value: '60x25', label: '60 × 25 mm' }, { value: '70x30', label: '70 × 30 mm' }]
const labelContents = [
  { value: 'full', label: 'Código, nombre y QR' },
  { value: 'code-qr', label: 'Solo código y QR' },
  { value: 'code-name', label: 'Código y nombre' },
]
const aiModels = [{ value: 'recommended', label: 'Modelo recomendado' }, { value: 'fast', label: 'Modelo rápido' }]
const aiUsages = [{ value: 'on-demand', label: 'Solo bajo petición' }, { value: 'on-reading', label: 'Al registrar mediciones' }]
</script>

<template>
  <section>
    <UiPageHeader title="Configuración" context="Ajusta las reglas comunes del vivero. Las pautas de cada especie siguen teniendo prioridad.">
      <template #actions>
        <span data-test="save-state" role="status">
          {{ dirty ? 'Hay cambios sin guardar' : 'Todos los cambios guardados' }}
        </span>
        <UiButton data-test="save-settings" @click="onSave">Guardar cambios</UiButton>
      </template>
    </UiPageHeader>

    <MockNotice ticket="sin ticket" what="la configuración" />

    <div class="layout">
      <UiEditorNav
        :model-value="scope"
        :sections="sections"
        label="Secciones de configuración"
        @update:model-value="scope = $event as SettingsScope"
      />

      <UiPanel :key="scope" data-test="settings-panel" :data-scope="scope">
        <template v-if="scope === 'collection'">
          <UiSectionHeader title="Datos de la colección" description="Se utilizan como opción inicial en formularios e informes." />
          <UiField v-model="values.collection.name" label="Nombre de la colección" data-test="collection-name" />
          <UiField v-model="values.collection.timezone" label="Zona horaria" as="select" :options="timezones" />
          <UiField v-model="values.collection.language" label="Idioma" as="select" :options="languages" />
          <UiSegmentedControl v-model="values.collection.temperatureUnit" label="Temperatura" :options="temperatureUnits" />
          <UiSegmentedControl v-model="values.collection.volumeUnit" label="Volumen de riego" :options="volumeUnits" />
          <UiField v-model="values.collection.reviewDays" label="Revisar cada" unit="días" type="number" min="1" />
          <UiField v-model="values.collection.weekStart" label="Inicio de semana" as="select" :options="weekStarts" />
        </template>

        <template v-else-if="scope === 'codes'">
          <UiSectionHeader title="Códigos de inventario" description="Define cómo se generan los códigos nuevos. Los existentes no cambian." />
          <UiField v-model="values.codes.prefix" label="Prefijo general" maxlength="8" data-test="codes-prefix" />
          <UiField v-model="values.codes.digits" label="Dígitos por planta" as="select" :options="digitOptions" data-test="codes-digits" />
          <UiField v-model="values.codes.separator" label="Separador" as="select" :options="separators" data-test="codes-separator" />
          <p>Vista previa <code data-test="code-preview">{{ codePreview }}</code></p>
          <UiNotice severity="info" title="Numeración">
            Si el siguiente número ya existe, se buscará el primer código libre de la especie. Los códigos reales los fija T-15.
          </UiNotice>
          <UiSectionHeader title="Etiquetas físicas" description="Formato inicial de las hojas PDF generadas desde Importar / exportar." />
          <UiField v-model="values.codes.labelSize" label="Tamaño" as="select" :options="labelSizes" />
          <UiField v-model="values.codes.labelContent" label="Contenido" as="select" :options="labelContents" />
        </template>

        <template v-else-if="scope === 'alerts'">
          <UiSectionHeader title="Reglas generales de alerta" description="Se aplican cuando la especie o la planta no define un valor más específico." />
          <UiField v-model="values.alerts.staleDays" label="Plazo para planta sin revisar" unit="días" type="number" min="1" />
          <UiSwitch v-model="values.alerts.staleOn" label="Planta sin revisar" description="Crear alerta después del periodo indicado." />
          <UiField v-model="values.alerts.overdueDays" label="Plazo para tarea vencida" unit="días" type="number" min="0" />
          <UiSwitch v-model="values.alerts.overdueOn" label="Tarea vencida" description="Avisar si una tarea sigue abierta." />
          <UiField v-model="values.alerts.temperatureHours" label="Plazo para temperatura crítica" unit="horas" type="number" min="0" />
          <UiSwitch v-model="values.alerts.temperatureOn" label="Temperatura crítica" description="Usar los rangos efectivos de cada planta." />
          <UiSectionHeader title="Notificaciones" description="Elige qué merece interrumpirte fuera del Dashboard." />
          <UiSwitch v-model="values.alerts.dailyDigest" label="Resumen diario" description="Tareas y alertas pendientes a las 07:30 · correo." />
          <UiSwitch v-model="values.alerts.criticalMail" label="Alertas críticas" description="Aviso inmediato al detectarse · correo." />
          <UiSwitch v-model="values.alerts.overdueMail" label="Tareas vencidas" description="Incluidas en el resumen; sin aviso adicional · correo." />
        </template>

        <template v-else-if="scope === 'ai'">
          <UiSectionHeader title="Recomendaciones con IA" description="La IA interpreta el historial; no sustituye las reglas de cultivo ni crea alertas por sí sola." />
          <UiField v-model="values.ai.model" label="Modelo" as="select" :options="aiModels" />
          <UiField v-model="values.ai.usage" label="Uso" as="select" :options="aiUsages" />
          <UiNotice severity="info" title="Datos enviados al generar una recomendación" data-test="ai-privacy">
            Especie, rangos efectivos, lecturas e historial relevante. Las fotografías quedan fuera salvo autorización explícita.
          </UiNotice>
          <p class="note">La clave de acceso al proveedor no se muestra ni se pide aquí.</p>
        </template>

        <template v-else>
          <UiSectionHeader title="Usuarios y acceso" description="La colección funciona actualmente con un único administrador." />
          <div class="user">
            <strong>David Navarro</strong>
            <small>Administrador · acceso completo</small>
            <UiStatus tone="ok">Activo</UiStatus>
          </div>
          <UiEmptyState title="Multiusuario, más adelante" mark="♙">
            Cuando se active la autenticación podrás invitar personas y limitar quién administra catálogos, configuración o tareas.
            <template #action>
              <UiButton variant="secondary" disabled data-test="invite-user">Invitar usuario</UiButton>
            </template>
          </UiEmptyState>
        </template>
      </UiPanel>
    </div>
  </section>
</template>

<style scoped>
.layout {
  align-items: start;
  display: grid;
  gap: var(--space-4);
  grid-template-columns: 240px minmax(0, 1fr);
}

.layout :deep(.panel) {
  display: grid;
  gap: var(--space-3);
}

.user {
  display: grid;
  gap: var(--space-1);
}

.note,
.user small {
  color: var(--color-ink-muted);
  font-size: var(--font-size-12);
  margin: 0;
}

@media (max-width: 900px) {
  .layout {
    grid-template-columns: 1fr;
  }
}
</style>
