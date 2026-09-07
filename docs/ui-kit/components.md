# Componentes

El [banco de componentes aislados](cactify-ui-kit/components.html) permite revisar visualmente las 53 piezas. El banco y los wireframes mandan en apariencia; `frontend/app/components/ui/` materializa el comportamiento accesible en Vue.

## Catálogo completo

| Grupo | Componentes Vue |
|---|---|
| Acciones y campos | `UiButton`, `UiField`, `UiFieldAction`, `UiStatus`, `UiPriority`, `UiFilterChip`, `UiFilterBar` |
| Navegación | `UiBreadcrumbs`, `UiNavGroup`, `UiTabs`, `UiPageHeader`, `UiGlobalSearch`, `UiEditorNav`, `UiPagination` |
| Datos | `UiTable`, `UiSummaryGrid`, `UiStatTile`, `UiTree`, `UiProportionBar`, `UiProportionWheel`, `UiScale`, `UiMonthRange`, `UiYearGrid` |
| Trabajo e historial | `UiTimeline`, `UiAgendaList`, `UiCalendarMonth` |
| Estructura y medios | `UiPanel`, `UiFormSection`, `UiMediaGallery`, `UiUploadArea`, `UiSpecimenLabel` |
| Patrones de aplicación | `UiIdentityCode`, `UiEntityHero`, `UiEntityCell`, `UiTag`, `UiDefinitionList`, `UiDetailLayout`, `UiSectionHeader`, `UiLoadingState`, `UiOverflowMenu`, `UiStickyActionBar`, `UiSegmentedControl`, `UiSwitch`, `UiChoiceCards`, `UiStepper`, `UiProgressBar`, `UiEntityPicker`, `UiFileItem` |
| Feedback | `UiNotice`, `UiEmptyState`, `UiInlineError`, `UiDialog`, `UiToastHost` |

`UiTreeNode` es la implementación recursiva interna de `UiTree`; no es una pieza de consumo independiente y no cuenta como componente adicional del catálogo.

## Botones

### Primario

Una única acción principal por región. Usa verbo y resultado: “Guardar lectura”. En formularios queda a la derecha. Puede estar deshabilitado solo cuando la causa sea visible.

### Secundario

Acciones alternativas, navegación contextual o apertura de flujos. No compite cromáticamente con el primario.

### Texto e icono

El botón de texto sirve para acciones ligeras dentro de un componente. Un botón solo con icono necesita `aria-label` y una forma inequívoca. Las acciones destructivas nunca se esconden bajo el estilo primario.

## Campos

La etiqueta siempre está encima. La ayuda explica formato, procedencia o consecuencia; el placeholder nunca sustituye la etiqueta. Los sufijos de unidad permanecen dentro del control pero fuera del valor editable.

Estados obligatorios: vacío, completo, foco, deshabilitado, error y solo lectura. Un error debe indicar cómo corregirlo.

## Estado y prioridad

Los estados responden “cómo está”: al día, revisar, crítica, inactiva. La prioridad responde “cuándo actuar”: rutina, atender pronto, inmediata. No son intercambiables.

## Filtros y etiquetas

Un filtro aplicado lleva cierre visible y puede deshacerse sin abrir un menú. Las etiquetas describen agrupaciones persistentes de la colección; no deben parecer estados temporales.

## Panel

El panel estándar agrupa una responsabilidad. Usa borde y fondo blanco; la sombra se reserva para diálogos. La cabecera alinea título y una sola acción contextual.

## Tabla

Es la vista principal para inventarios grandes. La primera columna identificativa permanece visualmente dominante. Las acciones masivas solo aparecen tras seleccionar filas. En móvil puede mantener desplazamiento horizontal si convertirla a tarjetas ocultara comparaciones importantes.

## Aviso

Incluye severidad, título accionable, explicación breve y, cuando corresponda, una acción. Cerrar un aviso visual no equivale a resolver la alerta de dominio.

## Diálogo

Se usa para tareas acotadas y reversibles. Crear o editar una planta ocupa una pantalla propia; registrar una lectura o crear una tarea puede resolverse en diálogo. Conserva título, cierre, contenido desplazable y acciones estables al final.

## Toast

Confirma una acción ya completada. No contiene información que el usuario necesite recuperar ni reemplaza errores de formulario.

## Breadcrumbs y pestañas

Todas las pantallas tienen breadcrumbs. Las pestañas cambian una vista local y no sustituyen la navegación principal. Su estado activo combina texto y subrayado, no solo color.

## Etiqueta de ejemplar

Es la firma del sistema. Reúne miniatura, código permanente, nombre y contexto botánico. El código nunca se trunca cuando identifica una operación y nunca cambia al editar la planta.

## Identidad y fichas

`UiIdentityCode` es la placa compacta que identifica una planta, especie o localización; no se confunde con `UiSpecimenLabel`, que representa la etiqueta física completa. `UiEntityHero` compone la portada de cualquier ficha mediante slots, y `UiEntityCell` conserva la misma identidad en tablas, selectores y resultados.

`UiDefinitionList` resuelve las fichas clave–valor y `UiDetailLayout` mantiene la relación entre contenido principal y lateral. Son componentes de estructura: no conocen plantas, especies ni sustratos.

## Elección y procesos

`UiSegmentedControl` y `UiChoiceCards` representan elecciones exclusivas; las pestañas siguen reservadas para navegación local. `UiSwitch` activa una preferencia booleana. `UiStepper` explica una secuencia real y `UiProgressBar` representa capacidad o avance con el valor disponible también como texto.
