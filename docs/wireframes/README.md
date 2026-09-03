# Wireframes y prototipos de Cactify

Esta carpeta contiene la referencia visual y de interacción previa al PDR/PRD y a los changes de OpenSpec.

La referencia compartida de tokens, componentes, estados y patrones está en el [Cactify UI Kit](../ui-kit/README.md).

## Prototipo actual

- [Administración de colección y tareas](cactify-admin/index.html)

## Estado

El prototipo es de fidelidad media: define arquitectura de información, jerarquía, densidad, navegación y flujos principales. La identidad visual, tipografías, iconografía, textos definitivos y detalles de marca siguen abiertos.

## Alcance de esta iteración

- Shell común con menú lateral, buscador global y breadcrumbs.
- Dashboard orientado a trabajo pendiente.
- Inventario en tabla con filtros y selección múltiple.
- Alta de planta en pantalla propia con código automático, fotografías, procedencia y cuidados heredados o personalizados.
- Edición de plantas sobre el mismo formulario, conservando su código y todo el historial.
- Ficha de planta con historial unificado.
- Registro manual de humedad, temperatura, luz, pH y riego desde la ficha de planta.
- Recomendaciones de IA vinculadas a una lectura, con riesgo, prioridad, explicación y creación opcional de tarea.
- Agenda y calendario de tareas.
- Creación manual y finalización de tareas.
- Edición de tareas desde la agenda y el calendario.
- Bandeja inicial de alertas.
- Catálogo de especies con filtros y grupos de cultivo dinámicos.
- Ficha de especie con fotografías, pauta anual, condiciones, floración y ejemplares asociados.
- Alta y edición de especies mediante un formulario por secciones.
- Catálogo de mezclas de sustrato con composición, pH y alcance sobre especies y plantas.
- Ficha y editor de recetas con validación visual de porcentajes y rango de pH.
- Catálogo y ficha de etiquetas con cobertura, uso y plantas asociadas.
- Alta, renombrado y combinación segura de etiquetas duplicadas.
- Importación CSV con revisión previa, errores por fila y confirmación antes de aplicar.
- Exportación del inventario, selecciones y etiquetas físicas con historial de operaciones.
- Configuración por ámbitos: colección, unidades, códigos, alertas, notificaciones, IA y acceso.
- Mapa jerárquico de localizaciones con carga, alertas y trabajo por zona.
- Ficha de localización con sublocalizaciones, plantas, características e historial de movimientos.
- Alta y edición de localizaciones, incluida la elección de su ubicación padre.
- Movimiento masivo de plantas entre localizaciones con trazabilidad.

## Dirección de diseño provisional

### Sujeto, usuario y objetivo

- **Sujeto:** una colección viva de cactus que se administra físicamente por localizaciones.
- **Usuario:** una persona que gestiona entre 500 y 2000 ejemplares.
- **Objetivo principal:** identificar qué necesita atención y registrar el trabajo con el mínimo de pasos.

### Sistema visual

- **Paleta:** tonos minerales fríos, verde de campo como acción, ámbar para atención y rojo terroso para riesgo.
- **Tipografía:** sans serif funcional para interfaz y monoespaciada para códigos de inventario.
- **Layout:** menú lateral estable, barra superior de búsqueda y contenido de ancho amplio para tablas.
- **Elemento característico:** los códigos de planta se representan como etiquetas físicas de inventario y funcionan como ancla visual en todas las vistas.

### Autocrítica aplicada antes de construir

Se descartó un dashboard genérico de tarjetas estadísticas. La portada se organiza alrededor de una agenda accionable, alertas y carga por localización. Se evitó también una estética botánica ornamental: las referencias al vivero aparecen en códigos, localizaciones, fotografías y vocabulario operativo, sin competir con la información.

## Cómo abrirlo

Puede abrirse directamente en un navegador. Para evitar restricciones del navegador con archivos locales, también puede servirse desde la raíz del repositorio:

```bash
python3 -m http.server 4173
```

Después: `http://localhost:4173/docs/wireframes/cactify-admin/`.
