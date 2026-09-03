# Cactify — definición funcional y de experiencia de usuario

> **Estado:** documento vivo de descubrimiento de producto  
> **Propósito:** reunir decisiones, necesidades y preguntas antes de redactar el PDR/PRD y convertir el alcance aprobado en historias, specs y changes de OpenSpec.  
> **No es todavía:** un contrato de API, un diseño técnico ni un compromiso de alcance para una única entrega.

**Referencia visual en curso:** [wireframe navegable de administración](../wireframes/cactify-admin/index.html) y [notas de diseño](../wireframes/README.md).

## 1. Visión del producto

Cactify es una aplicación de administración para coleccionistas de cactus y pequeños viveros que necesitan gestionar aproximadamente entre 500 y 2000 ejemplares.

El producto debe permitir responder con rapidez a estas preguntas:

1. ¿Qué plantas tengo y dónde están?
2. ¿Qué planta concreta estoy viendo o manipulando?
3. ¿Qué ha ocurrido con ella desde que entró en la colección?
4. ¿Qué plantas necesitan atención ahora?
5. ¿Qué acción debo realizar y puedo registrarla para varias plantas a la vez?
6. ¿Qué condiciones y cuidados comparten determinados grupos de especies?

La aplicación debe ser visualmente cuidada y reconocible, pero su prioridad es ser clara, rápida y fiable durante el trabajo diario. Es una herramienta administrativa: la densidad de información es aceptable cuando está bien jerarquizada y permite actuar sin recorrer pantallas innecesarias.

## 2. Principios de producto y UX

### 2.1. Usabilidad antes que decoración

- Las acciones frecuentes deben ser visibles y tener nombres directos: «Añadir planta», «Registrar riego», «Mover plantas» o «Resolver alerta».
- La información crítica debe distinguirse por posición, texto e iconografía; el color no será la única señal.
- Las tablas podrán ser densas, pero deberán permitir ordenar, filtrar, seleccionar filas y personalizar las columnas visibles.
- Los formularios largos se dividirán en bloques con significado para el usuario, no según la estructura interna de la base de datos.
- Los estados vacíos deben explicar qué falta y ofrecer la acción que permite continuar.
- Los errores deben explicar qué ha ocurrido y cómo corregirlo.
- La aplicación debe funcionar correctamente en escritorio, tableta y móvil. El escritorio será óptimo para administración masiva; el móvil, para consultar una planta, fotografiarla y registrar trabajo sobre el terreno.

### 2.2. Trazabilidad

- Una planta tendrá un código estable que no se reutilizará.
- Una planta no desaparecerá de la historia por haber muerto, sido vendida, cedida o perdida.
- Las observaciones, comentarios, fotografías, cuidados, movimientos, alertas y cambios de estado deben conservar cuándo ocurrieron.
- Cuando una acción afecte a varias plantas, cada ficha debe reflejarla en su historial.

### 2.3. Herencia entre especie y ejemplar

La especie define la pauta general de cultivo. La planta hereda esa pauta y puede sobrescribir únicamente los valores en los que necesita un tratamiento particular.

```text
Especie: pauta recomendada
        │
        ├── Planta A: hereda todos los valores
        ├── Planta B: sobrescribe exposición y riego
        └── Planta C: sobrescribe temperatura mínima
```

Si cambia la especie, las plantas reciben los cambios en todos los campos que no hayan sobrescrito expresamente.

## 3. Arquitectura general de navegación

### 3.1. Menú lateral propuesto

```text
Dashboard

COLECCIÓN
  Plantas
  Localizaciones

TRABAJO DIARIO
  Tareas
  Alertas

CATÁLOGOS
  Especies
  Mezclas de sustrato
  Etiquetas

ADMINISTRACIÓN
  Importar / exportar
  Configuración
```

Los encabezados «Colección», «Trabajo diario», «Catálogos» y «Administración» sirven para agrupar y no tienen por qué conducir a una pantalla propia.

El historial general no se plantea inicialmente como entrada independiente del menú. El historial completo pertenece a la ficha de cada planta y el Dashboard muestra un resumen de actividad reciente.

«Tareas» organiza el trabajo pendiente. Los cuidados ya realizados se consultan en el historial de las plantas a las que afectaron. De este modo, el menú distingue lo que queda por hacer de lo que ya ocurrió.

### 3.2. Barra superior

La barra superior permanecerá disponible durante la navegación e incluirá:

- Buscador global.
- Acción rápida para crear o registrar información.
- Acceso a alertas pendientes, con contador cuando corresponda.
- Acceso a preferencias o perfil cuando exista autenticación.

El buscador global localizará, como mínimo:

- Plantas por código, apodo o descripción.
- Especies por nombre científico, nombre común o código.
- Localizaciones.
- Etiquetas.

Los resultados se presentarán agrupados por tipo y permitirán abrir directamente la ficha correspondiente.

### 3.3. Breadcrumbs

Todas las pantallas tendrán breadcrumbs basados en la jerarquía de información, no en el recorrido accidental realizado por el usuario.

Ejemplos:

```text
Inicio
Inicio / Plantas
Inicio / Plantas / CAT-GRUSS-01
Inicio / Plantas / CAT-GRUSS-01 / Registrar cuidado
Inicio / Localizaciones / Invernadero 1 / Bandeja A3
Inicio / Catálogos / Especies / Echinocactus grusonii
```

Se colocarán entre la barra superior y el título de página. El último elemento representa la página actual.

## 4. Dashboard

El Dashboard debe responder «¿qué requiere mi atención?» y no ser solo una colección de métricas decorativas.

### 4.1. Información prioritaria

- Alertas críticas o importantes abiertas.
- Cuidados y revisiones pendientes o vencidos.
- Plantas sin revisar durante el intervalo configurado.
- Incidencias por localización.
- Actividad reciente relevante.
- Resumen de plantas por estado.

### 4.2. Acciones rápidas

- Añadir una planta.
- Crear una tarea.
- Abrir la agenda o el calendario.
- Registrar una observación o cuidado.
- Registrar un cuidado por lote.
- Abrir una localización.
- Revisar alertas.

Las cifras agregadas deben permitir navegar al conjunto que representan. Por ejemplo, «12 alertas importantes» debe abrir el listado ya filtrado por ese nivel.

## 5. Inventario de plantas

### 5.1. Listado

El listado debe poder manejar entre 500 y 2000 plantas sin depender de recorrer páginas manualmente.

Capacidades previstas:

- Búsqueda por código o texto.
- Filtros combinables por especie, localización, etiqueta, estado y características de cultivo.
- Ordenación por código, nombre, especie, localización, fecha de última revisión o nivel de atención.
- Columnas configurables.
- Selección múltiple.
- Acciones por lote.
- Vistas o filtros guardados.
- Exportación de los resultados filtrados.

La vista de tabla será la principal para administración. Podrá existir una vista visual de tarjetas o fotografías, pero no sustituirá a la tabla para el trabajo masivo.

### 5.2. Datos generales de una planta

Una planta podrá contener:

| Campo | Propósito | Situación |
|---|---|---|
| Código de inventario | Identificación estable y búsqueda | Decidido |
| Apodo o nombre interno | Nombre reconocible por el usuario | Ya existe |
| Especie | Pauta base y clasificación taxonómica | Ya existe |
| Localización | Posición física actual | Ya existe; pendiente jerarquía |
| Etiquetas | Clasificación flexible | Ya existe |
| Descripción | Información libre relativamente estable | Decidido |
| Fotografías | Identificación y evolución visual | Decidido |
| Mes y año de germinación | Edad aproximada cuando se conoce | Decidido |
| Estado | Activa, cuarentena, enferma, cedida, vendida, muerta o perdida | Propuesto |
| Fecha de adquisición | Entrada en la colección | Propuesto |
| Procedencia | Vivero, intercambio, germinación propia u otra fuente | Propuesto |
| Perfil de cuidados efectivo | Valores heredados y overrides | Parcialmente previsto |
| Comentarios cronológicos | Notas fechadas sobre el ejemplar | Decidido |

### 5.3. Alta de una planta

El alta debe permitir:

1. Seleccionar la especie.
2. Generar automáticamente el siguiente código disponible.
3. Indicar apodo, localización, etiquetas y descripción.
4. Indicar mes y año de germinación cuando se conozcan.
5. Subir una o varias fotografías durante la creación.
6. Revisar la pauta heredada de la especie.
7. Añadir overrides únicamente cuando sean necesarios.
8. Guardar y abrir la nueva ficha.

La fotografía no debe bloquear la creación si todavía no está disponible, salvo que esta decisión cambie durante la definición del alcance.

### 5.4. Edición de una planta

La edición reutilizará el formulario de alta para evitar reglas y experiencias duplicadas. El código de inventario permanecerá bloqueado y se conservarán fotografías, tareas e historial. Cambiar la especie deberá mostrar el impacto sobre los cuidados heredados y no regenerará el código de la planta.

Los accesos desde «Editar datos» o «Editar cuidados» abrirán el mismo formulario situando al usuario en la sección correspondiente.

## 6. Sistema de códigos

### 6.1. Código de especie

Cada especie tendrá un código corto, único y legible. Ejemplo:

```text
CAT-GRUSS
```

El formato exacto y la forma de generarlo están por decidir. Puede proponerse automáticamente a partir del nombre científico y permitir corrección manual antes de utilizarse.

### 6.2. Código de planta

El código de cada planta se compondrá del código de su especie y un número secuencial:

```text
CAT-GRUSS-01
CAT-GRUSS-02
CAT-GRUSS-03
...
CAT-GRUSS-99
CAT-GRUSS-100
```

Reglas propuestas:

- La secuencia es independiente para cada especie.
- Se muestran al menos dos dígitos, pero el código crece naturalmente al superar 99 plantas.
- Un número asignado no vuelve a utilizarse aunque la planta se archive.
- El código de planta permanece estable durante toda su vida.
- La generación debe ser segura ante dos altas simultáneas.

### 6.3. Pregunta pendiente sobre renombrado

Hay que decidir qué ocurre si se cambia el código de una especie que ya tiene plantas:

- **Opción recomendada:** el código de especie deja de poder cambiarse una vez que tiene plantas asociadas. Los códigos de inventario permanecen estables.
- **Alternativa:** permitir cambiar el código visible de la especie sin modificar los códigos históricos de sus plantas.

No se recomienda renumerar en masa ejemplares ya etiquetados físicamente.

## 7. Ficha de planta

La ficha es el centro operativo del ejemplar. Debe permitir entender su situación actual y recorrer toda su historia sin salir a distintas pantallas inconexas.

### 7.1. Cabecera

La cabecera mostrará de forma inmediatamente reconocible:

- Fotografía principal.
- Código de inventario.
- Apodo.
- Nombre científico y común de la especie.
- Localización actual.
- Estado.
- Alertas abiertas.
- Acciones frecuentes.

Acciones frecuentes posibles:

- Añadir fotografía.
- Registrar cuidado.
- Añadir comentario.
- Mover de localización.
- Editar planta.

### 7.2. Resumen actual

El resumen podrá mostrar:

- Último riego.
- Última revisión.
- Última medición disponible de cada tipo.
- Próxima acción prevista.
- Perfil de cuidados efectivo.
- Diferencias respecto a la especie.
- Alertas pendientes.

### 7.3. Historial unificado

La ficha debe servir todo el historial de registros del ejemplar en una cronología única.

Tipos de evento previstos:

- Alta en la colección.
- Observación o medición.
- Riego.
- Fertilización.
- Trasplante o cambio de sustrato.
- Tratamiento.
- Revisión de estado.
- Recomendación generada por IA.
- Alerta abierta, actualizada o resuelta.
- Comentario.
- Fotografía añadida.
- Floración observada.
- Movimiento entre localizaciones.
- Cambio de estado.
- Cambio relevante de datos.

La cronología debe:

- Ordenarse desde el evento más reciente.
- Permitir filtrar por tipo de evento.
- Mostrar fecha y hora cuando estén disponibles.
- Mostrar quién realizó la acción cuando exista multiusuario.
- Permitir abrir el detalle completo de cada evento.
- Mantener los eventos generados por acciones por lote dentro de cada planta afectada.

No todos los eventos necesitan la misma representación visual. Una fotografía, un comentario breve y una alerta requieren distintas densidades, pero comparten el mismo orden temporal.

### 7.4. Secciones o pestañas posibles

La ficha puede combinar un resumen inicial con navegación local:

```text
Resumen | Historial | Fotografías | Cuidados | Floración | Datos
```

La decisión final se tomará durante los wireframes. Debe evitarse repartir la historia en tantas pestañas que resulte imposible comprender la evolución completa.

## 8. Fotografías y contenido multimedia

### 8.1. Fotografías de especie

Una especie podrá tener:

- Fotografía principal o de portada.
- Galería de fotografías de referencia.
- Texto alternativo o descripción de cada imagen.
- Orden configurable.
- Información básica de autoría o procedencia cuando sea relevante.

Las fotografías de especie representan el aspecto general del taxón y no se mezclan con el seguimiento de un ejemplar concreto.

### 8.2. Fotografías de planta

Una planta podrá recibir fotografías:

- Durante su creación.
- Desde su ficha en cualquier momento posterior.
- Asociadas a un comentario, observación, floración, tratamiento u otro evento.

Cada fotografía debería conservar:

- Fecha de captura, si se conoce.
- Fecha de subida.
- Texto o comentario opcional.
- Relación opcional con un evento del historial.
- Indicador de fotografía principal.

La galería debe permitir ver la evolución temporal de la planta y abrir las imágenes a mayor tamaño.

### 8.3. Decisiones pendientes de medios

- Formatos y tamaño máximo.
- Número máximo de archivos por subida.
- Compresión y generación de miniaturas.
- Almacenamiento local o servicio de objetos.
- Eliminación: borrado real o conservación de una referencia histórica.
- Tratamiento de metadatos EXIF y privacidad.

## 9. Especies

### 9.1. Datos generales

Una especie podrá contener:

- Código único.
- Nombre científico.
- Nombre común.
- Descripción.
- Fotografías de referencia.
- Mezcla de sustrato recomendada.
- Rangos de humedad.
- Rangos de temperatura mínima y máxima.
- Horas de luz recomendadas.
- Pauta de riego.
- Exposición solar.
- Entorno recomendado: interior, exterior o ambos.
- Épocas de crecimiento.
- Información de floración.
- Número de ejemplares asociados.

### 9.2. Exposición solar

Valores iniciales propuestos:

| Valor visible | Identificador sugerido | Interpretación funcional |
|---|---|---|
| Sombra | `shade` | Luz indirecta; evita sol directo |
| Semisombra | `partial_shade` | Sol directo limitado o filtrado |
| Soleado | `sunny` | Varias horas de sol directo |
| Pleno sol | `full_sun` | Exposición directa prolongada |

Estos valores no sustituyen a las horas de luz. La exposición describe la intensidad o forma de recibirla; las horas describen la duración.

Queda pendiente fijar una definición más precisa para que «soleado» y «pleno sol» no dependan únicamente de la interpretación de quien introduce los datos.

### 9.3. Interior o exterior

Valores propuestos:

- Interior.
- Exterior.
- Interior o exterior.
- Estacional, si se necesita indicar que cambia según la época del año.

La decisión sobre incluir «estacional» dependerá de cómo se modele el calendario de cultivo.

### 9.4. Épocas de crecimiento

La especie definirá uno o varios periodos habituales de crecimiento. Una representación inicial puede ser por meses del año:

```text
Periodo principal: marzo–octubre
Reposo: noviembre–febrero
```

Debe contemplarse que los periodos pueden variar por clima, hemisferio y condiciones de interior. Por eso se tratarán como pauta de referencia y no como verdad universal.

Campos candidatos:

- Mes de inicio.
- Mes de fin.
- Tipo de periodo: crecimiento, reposo o transición.
- Notas.

### 9.5. Floración de la especie

La sección de floración de la especie describe el comportamiento esperado:

- Meses o periodo habitual de floración.
- Edad o madurez aproximada para florecer, si se conoce.
- Color o descripción de la flor.
- Duración habitual.
- Condiciones que favorecen la floración.
- Notas.

Esta información es orientativa y se diferencia de las floraciones realmente observadas en cada planta.

## 10. Floración de cada planta

Cada ejemplar podrá registrar eventos reales de floración dentro de su historial.

Un evento de floración podrá incluir:

- Fecha de inicio.
- Fecha de fin, cuando se conozca.
- Estado: botón, en flor o floración finalizada.
- Número aproximado de flores, opcional.
- Comentario.
- Fotografías.

Esto permitirá comparar la pauta esperada de la especie con el comportamiento real de cada ejemplar y consultar floraciones anteriores.

## 11. Germinación y edad

Para cada planta se guardará el mes y el año de germinación cuando se conozcan.

Reglas iniciales:

- Mes y año pueden ser desconocidos.
- Si se conoce únicamente el año, debería poder registrarse sin inventar un mes.
- La interfaz mostrará que se trata de una edad aproximada cuando la fecha no es completa.
- No se utilizará el primer día del mes como si fuese una fecha real en la experiencia de usuario.

Representación conceptual recomendada:

```text
germinationYear: 2021
germinationMonth: 4 | null
```

Queda por decidir si también se necesita una fecha de esquejado o propagación para ejemplares que no proceden de semilla.

## 12. Comentarios y notas de planta

Además de una descripción estable, cada planta permitirá añadir comentarios cronológicos.

La diferencia es:

- **Descripción:** resume características relativamente estables del ejemplar y se edita como parte de su ficha.
- **Comentario:** registra una observación puntual, fechada y conservada en el historial.

Un comentario podrá contener:

- Texto.
- Fecha y hora.
- Fotografías opcionales.
- Autor, cuando exista multiusuario.
- Edición o corrección, manteniendo trazabilidad cuando el alcance lo requiera.

Ejemplos:

- «Pequeña marca en el lado orientado al oeste; revisar en dos semanas».
- «Ha empezado a formar dos nuevos hijuelos».
- «Trasladada temporalmente por riesgo de helada».

## 13. Cuidados, observaciones y mediciones

El modelo actual `CareRecord` mezcla mediciones ambientales y cantidad de riego. Para el producto completo conviene distinguir conceptualmente:

### 13.1. Observaciones y mediciones

- Humedad.
- Temperatura.
- Horas de luz.
- pH del sustrato.
- Condición visual.
- Nota libre.
- Fotografías.

### 13.2. Acciones de cuidado

- Riego.
- Fertilización.
- Trasplante.
- Cambio de sustrato.
- Tratamiento.
- Poda o retirada de partes dañadas.
- Revisión.
- Otra acción configurable.

### 13.3. Trabajo por lote

Se podrá aplicar una acción a:

- Plantas seleccionadas manualmente.
- Todas las plantas de una localización.
- El resultado de un filtro o grupo guardado, con confirmación explícita del alcance.

Antes de guardar se mostrará el número exacto de plantas afectadas. Después, la acción aparecerá en el historial de cada una.

### 13.4. Registro manual y recomendación de IA

Desde la ficha de una planta se podrá registrar en una sola operación la fecha real y uno o varios valores de humedad, temperatura, horas de luz, pH del sustrato y cantidad de riego. Al menos un valor será obligatorio; los demás podrán quedar vacíos. La interfaz mostrará junto a cada campo el rango efectivo de la planta para reducir errores de interpretación.

Después de guardar, la lectura aparecerá inmediatamente en la cronología. El usuario podrá solicitar una recomendación de IA en ese momento o hacerlo más adelante desde el propio registro. Cada recomendación quedará vinculada a una lectura concreta e incluirá:

- Nivel de riesgo.
- Prioridad de actuación.
- Explicación breve basada en los rangos efectivos.
- Acción recomendada.
- Datos utilizados para elaborar el análisis.

La recomendación no modificará por sí misma cuidados, tareas ni alertas. El usuario podrá convertir la acción sugerida en una tarea mediante una confirmación explícita.

## 14. Organización del trabajo y tareas

El inventario responde «qué plantas tengo». El módulo de tareas responde «qué trabajo tengo que hacer, cuándo y sobre qué plantas».

La primera versión será completamente manual: el usuario crea, programa y completa tareas. Esta base permitirá generar después tareas automáticas sin desarrollar un segundo sistema paralelo.

### 14.1. Diferencia entre tarea y cuidado realizado

Una tarea representa una intención o trabajo pendiente. Un cuidado representa un hecho que ya ocurrió.

```text
Tarea planificada
«Regar CAT-GRUSS-01 el 15 de junio»
        │
        │ completar
        ▼
Tarea completada ────── Registro de riego en el historial
```

Reglas propuestas:

- Crear una tarea no modifica el historial de cuidados como si el trabajo ya se hubiese realizado.
- Completar una tarea crea o enlaza el registro de cuidado correspondiente.
- Cancelar u omitir una tarea conserva que estuvo planificada, pero no genera un cuidado realizado.
- Una acción de cuidado podrá registrarse directamente sin que exista una tarea previa.
- La ficha de la planta podrá mostrar tanto sus próximas tareas como sus cuidados ya realizados.

### 14.2. Tipos iniciales de tarea

El catálogo inicial se mantendrá deliberadamente pequeño y ajustado al trabajo real con cactus:

| Tipo | Ejemplos |
|---|---|
| Riego | Regar una planta, una selección o una localización |
| Protección frente al frío | Trasladar, cubrir o aislar antes de una bajada de temperatura |
| Protección frente al sol intenso | Sombrear o cambiar temporalmente de exposición |
| Poda de raíces | Revisar y podar raíces durante el mantenimiento |
| Cambio de maceta | Trasplantar cuando el ejemplar ha superado el tamaño adecuado |

Podrá existir un tipo «Otra» con título y descripción libres para necesidades excepcionales. Antes de convertir los tipos en un catálogo configurable se validará si realmente aparecen más trabajos repetidos.

### 14.3. Datos básicos de una tarea

| Campo | Propósito |
|---|---|
| Tipo | Clasificar y filtrar el trabajo |
| Título | Describir la acción con lenguaje directo |
| Destino | Planta, conjunto de plantas o localización |
| Fecha o periodo previsto | Situar la tarea en agenda y calendario |
| Prioridad | Ordenar el trabajo cuando coinciden varias tareas |
| Estado | Distinguir pendiente, completada, omitida o cancelada |
| Notas | Añadir instrucciones o contexto |
| Origen | Manual inicialmente; regla o sugerencia automática en el futuro |
| Fecha de finalización | Registrar cuándo se realizó realmente |
| Cuidado asociado | Enlazar la tarea completada con el historial real |

El estado «Vencida» será calculado: una tarea está vencida cuando sigue pendiente y ha pasado su fecha o el final de su periodo previsto. No será un estado que el usuario tenga que seleccionar manualmente.

### 14.4. Destinatarios y trabajo en grupo

Una tarea podrá dirigirse a:

- Una planta concreta.
- Varias plantas seleccionadas expresamente.
- Una localización completa.

Ejemplos:

```text
Regar CAT-GRUSS-01
Proteger del frío 18 plantas seleccionadas
Colocar malla de sombreo en Invernadero 2
```

Cuando se complete una tarea de grupo, la interfaz mostrará las plantas afectadas y permitirá excluir excepciones antes de registrar el trabajo. El historial de cada planta incluida recibirá su evento correspondiente.

Queda pendiente decidir si una tarea sobre una localización afecta a las plantas que contenía al crearla o a las que contiene en el momento de completarla. La interfaz deberá mostrar siempre el alcance exacto antes de confirmar.

### 14.5. Agenda y calendario

El módulo de tareas tendrá varias representaciones de los mismos datos:

```text
Agenda | Calendario | Completadas
```

- **Agenda:** vista operativa por defecto, agrupada en vencidas, hoy, próximos días y posteriores.
- **Calendario:** planificación visual mensual o semanal.
- **Completadas:** consulta del trabajo ya realizado, enlazado con los historiales correspondientes.

Para una colección grande, el calendario mensual no puede ser la única vista: demasiadas tareas dentro de una celda dejan de ser legibles. La agenda será más eficaz para ejecutar el trabajo diario y el calendario para comprender carga y estacionalidad.

Filtros previstos:

- Tipo de tarea.
- Estado.
- Prioridad.
- Localización.
- Especie.
- Planta.
- Origen manual o automático.

Acciones previstas:

- Crear una tarea desde un día del calendario.
- Crearla desde la ficha de una planta o localización.
- Reprogramar.
- Completar.
- Omitir indicando opcionalmente el motivo.
- Cancelar.
- Aplicar acciones a varias tareas compatibles.

Las tareas pendientes se podrán editar desde la agenda y el calendario. Se podrán cambiar tipo, título, destinatarios, prioridad, fecha, hora y notas. Una tarea completada no se modificará silenciosamente: cualquier corrección deberá conservar qué se registró originalmente y quién realizó el cambio cuando exista multiusuario.

### 14.6. Integración con el Dashboard y las alertas

El Dashboard mostrará:

- Tareas vencidas.
- Tareas previstas para hoy.
- Próximas tareas importantes.
- Resumen por tipo o localización cuando ayude a organizar una jornada.

Una alerta y una tarea tampoco son lo mismo:

- La alerta indica un riesgo o situación que requiere atención.
- La tarea representa la acción planificada para atenderla.

Desde una alerta podrá crearse una tarea precompletada. Completar la tarea podrá proponer resolver la alerta relacionada, pero no debería ocultarla automáticamente si necesita una revisión posterior.

### 14.7. Preparación para automatizaciones futuras

Las automatizaciones futuras crearán tareas normales con un origen distinto. El usuario las encontrará y completará desde la misma agenda.

```text
Creación manual ──────────────┐
Regla periódica ──────────────┤
Condiciones de cultivo ───────┼──▶ Tarea pendiente ──▶ Cuidado realizado
Alerta o recomendación ───────┤
Previsión meteorológica ──────┘
```

Ejemplos futuros:

- Proponer un cambio de maceta dos años después del último trasplante.
- Crear una revisión de raíces según el tiempo desde el último mantenimiento.
- Proponer protección frente al frío al acercarse una temporada o temperatura de riesgo.
- Proponer sombreo para grupos sensibles al pleno sol.
- Sugerir riego teniendo en cuenta especie, época de crecimiento, exposición y último riego.

Para permitirlo, desde la primera versión deben conservarse de forma estructurada el tipo de tarea, sus destinatarios, el periodo previsto, el estado, el origen, la finalización real y el cuidado asociado.

Una automatización podrá crear o sugerir una tarea, pero nunca marcará el trabajo como realizado. La confirmación humana seguirá siendo necesaria para que aparezca un cuidado en el historial.

### 14.8. Alcance inicial recomendado

Primera entrega del módulo:

- Crear tareas manuales.
- Asignarlas a una planta, varias plantas o una localización.
- Ver agenda y calendario.
- Filtrar y reprogramar.
- Completar, omitir o cancelar.
- Crear el registro histórico correspondiente al completar.
- Mostrar vencidas y tareas de hoy en el Dashboard.

Fuera de esa primera entrega:

- Recurrencias automáticas.
- Reglas basadas en el historial.
- Decisiones automáticas de riego.
- Meteorología.
- Asignación a trabajadores y coordinación multiusuario.
- Notificaciones push.

## 15. Agrupación de especies por características

El sistema debe permitir localizar y agrupar especies según sus necesidades de cultivo:

- Horas de luz.
- Exposición solar.
- Frecuencia o pauta de riego.
- Temperatura mínima y máxima.
- Humedad.
- Mezcla de sustrato.
- Entorno interior o exterior.
- Época de crecimiento.
- Época de floración.

### 15.1. Primera propuesta: grupos dinámicos

La opción inicial recomendada es construir grupos a partir de filtros, sin duplicar datos:

```text
«Cactus de semisombra»
  exposición = semisombra

«Sensibles al frío»
  temperatura mínima > 8 °C

«Crecimiento invernal»
  periodo de crecimiento incluye diciembre–febrero
```

El usuario podrá guardar una combinación de filtros con un nombre para reutilizarla. Cuando cambie una especie, entrará o saldrá automáticamente de los grupos cuyas reglas ya no cumpla.

### 15.2. Posible evolución: perfiles de cuidado

Si muchas especies comparten exactamente la misma pauta, podría existir un catálogo de perfiles de cuidado reutilizables. No se propone introducirlo todavía porque añade herencia adicional sobre `Species` y puede complicar las excepciones.

Primero se validará si los grupos dinámicos y los filtros resuelven la necesidad real.

## 16. Localizaciones

Para una colección de este tamaño, las localizaciones deben poder organizarse jerárquicamente:

```text
Vivero
└── Invernadero 1
    ├── Bancada norte
    │   ├── Bandeja A1
    │   └── Bandeja A2
    └── Bancada sur
```

Cada localización podrá mostrar:

- Nombre y ruta completa.
- Descripción o notas.
- Número de plantas directas y descendientes.
- Plantas contenidas.
- Alertas y cuidados pendientes.
- Acciones por lote.

Mover una planta debe registrar la localización anterior, la nueva y la fecha del movimiento.

## 17. Alertas

Una alerta es una incidencia operativa con ciclo de vida propio, no solo un color aplicado a una recomendación histórica.

```text
Nueva → Revisada → Resuelta
             └── Descartada
```

Datos previstos:

- Planta y localización.
- Motivo.
- Severidad.
- Fecha de detección.
- Acción recomendada.
- Estado.
- Fecha y comentario de resolución.
- Responsable, cuando exista multiusuario.

Las alertas podrán originarse por:

- Mediciones fuera de los rangos efectivos.
- Demasiado tiempo sin revisar una planta.
- Un cuidado vencido.
- Una incidencia anotada manualmente.
- Una recomendación de IA.

La IA puede enriquecer la explicación, pero no será el único mecanismo de detección.

## 18. Catálogos

### 18.1. Especies

Además del alta y edición, el catálogo permitirá:

- Buscar, filtrar y ordenar.
- Ver cuántas plantas pertenecen a cada especie.
- Abrir grupos dinámicos por características.
- Detectar posibles duplicados.
- Evitar eliminar una especie con plantas asociadas.

### 18.2. Mezclas de sustrato

Cada mezcla mantendrá sus porcentajes, pH, descripción y especies asociadas. Se podrá consultar qué especies y plantas utilizan o recomiendan una mezcla antes de modificarla.

### 18.3. Etiquetas

El catálogo permitirá crear, renombrar, combinar duplicados y consultar el número de plantas asociadas a cada etiqueta.

## 19. Importación, exportación, inventario y etiquetas físicas

Capacidades previstas para operar a escala:

- Importar plantas y catálogos desde CSV.
- Validar una importación antes de aplicarla.
- Mostrar errores por fila sin descartar silenciosamente datos.
- Exportar el inventario completo o el resultado de un filtro.
- Generar etiquetas físicas con código y QR.
- Abrir una planta escaneando su QR.
- Realizar revisiones físicas de inventario por localización.

La revisión física deberá poder indicar plantas verificadas, no encontradas, desplazadas o no registradas.

## 20. Configuración

Opciones candidatas:

- Unidades de medida.
- Umbrales generales de alertas.
- Intervalo por defecto entre revisiones.
- Preferencias de notificación.
- Formato y prefijo de códigos.
- Configuración del proveedor de IA.
- Gestión de usuarios y permisos cuando se incorpore autenticación.

No toda opción técnica debe exponerse al usuario. La configuración contendrá únicamente decisiones que tenga sentido cambiar durante el uso normal del producto.

## 21. Relación con el modelo actual

| Concepto actual | Se conserva | Evolución prevista |
|---|---|---|
| `Species` | Sí | Código, descripción, fotos, exposición, entorno, crecimiento y floración |
| `Plant` | Sí | Código, descripción, fotos, germinación, estado, procedencia y overrides |
| `Location` | Sí | Jerarquía e historial de movimientos |
| `Tag` | Sí | Administración y combinación de duplicados |
| `SoilMix` | Sí | Consulta de usos y posible relación con plantas tras trasplantes |
| `CareRecord` | Conceptualmente | Separar mediciones, observaciones y acciones de cuidado |
| Tareas | No existe | Planificación manual, calendario y enlace con cuidados realizados |
| `AIRecommendation` | Sí | Integrada en historial y alertas, no como única fuente de decisión |
| Alerta visual en historial | No es suficiente | Entidad o concepto con ciclo de vida operativo |

## 22. Revisión inicial de historias existentes

Antes de crear nuevos changes deberían revisarse estas historias:

- **0.1 Registrar un cactus:** ampliar con código, descripción, fotografías y germinación.
- **0.2 Registrar condiciones:** separar mediciones de acciones de cuidado y contemplar adjuntos.
- **0.3 Consultar recomendaciones por especie:** añadir exposición, entorno, crecimiento y floración.
- **0.5 Consultar historial:** convertirlo en cronología unificada de la planta.
- **0.6 Registrar especie:** añadir código, descripción, fotografías y nuevas características.
- **0.7 Personalizar cuidados:** concretar qué campos admiten override y cómo se muestra la herencia.
- **0.9 Localizaciones:** sustituir el catálogo plano por jerarquía o elevar F.1 al alcance principal.
- **0.11 Búsqueda:** ampliar a búsqueda global por texto y código.
- **F.1 Localización jerárquica:** elevar a funcionalidad central para una colección grande.
- **F.2 Cuidados por lote:** elevar a funcionalidad central.
- **F.3 Cuidados pendientes:** elevar a base del Dashboard operativo.

Historias nuevas candidatas:

- Gestionar fotografías de una especie.
- Gestionar fotografías y galería de una planta.
- Crear y programar tareas manuales.
- Consultar tareas en una agenda y un calendario.
- Asignar una tarea a una planta, varias plantas o una localización.
- Completar una tarea y registrar el cuidado realizado.
- Reprogramar, omitir o cancelar una tarea.
- Asignar códigos estables de inventario.
- Registrar germinación y procedencia.
- Añadir comentarios cronológicos.
- Registrar floraciones reales.
- Gestionar el ciclo de vida de una planta.
- Consultar una cronología unificada.
- Gestionar alertas hasta su resolución.
- Agrupar especies mediante filtros guardados.
- Importar y exportar datos.
- Generar y escanear etiquetas QR.
- Realizar una revisión física del inventario.

## 23. Priorización preliminar

Esta clasificación es orientativa y se revisará antes del PDR/PRD.

### Núcleo operativo

- Navegación, buscador global y breadcrumbs.
- Inventario y ficha completa de planta.
- Códigos estables.
- Especies ampliadas.
- Fotografías de especies y plantas.
- Historial unificado y comentarios.
- Localizaciones jerárquicas.
- Tareas manuales, agenda y calendario.
- Finalización de tareas enlazada al historial.
- Cuidados por lote.
- Alertas y Dashboard operativo.
- Filtros y agrupaciones por características.

### Importante para operar a escala

- Importación y exportación.
- Etiquetas QR.
- Revisión física de inventario.
- Estados y archivo de plantas.
- Vistas guardadas y columnas configurables.

### Evolución posterior

- Geolocalización precisa o mapas.
- Gestión avanzada de propagaciones y genealogía.
- Proveedores e intercambios avanzados.
- Gestión comercial.
- IoT y automatización física.
- Generación automática de tareas por recurrencia, historial o condiciones.
- Multiempresa.

## 24. Preguntas abiertas

Estas preguntas no bloquean seguir descubriendo pantallas, pero deberán resolverse antes de cerrar el PDR/PRD correspondiente:

1. ¿El código de especie se genera siempre o puede introducirse manualmente?
2. ¿Puede cambiarse el código de una especie después de crear plantas?
3. ¿Se exige fotografía durante el alta o es opcional?
4. ¿Qué estados exactos puede tener una planta y qué transiciones son válidas?
5. ¿Una planta puede estar simultáneamente en interior/exterior de forma estacional?
6. ¿Cómo se define de forma objetiva la diferencia entre «soleado» y «pleno sol»?
7. ¿Se necesita registrar propagación por esqueje, hijuelo o injerto además de germinación?
8. ¿Los comentarios pueden editarse y eliminarse, o solo corregirse conservando historial?
9. ¿Qué tipos de cuidado entran en la primera versión?
10. ¿Qué eventos deben generar alertas automáticamente?
11. ¿Se necesitan grupos manuales además de filtros dinámicos?
12. ¿Cuántas fotografías y qué tamaños debe admitir el sistema?
13. ¿El QR contendrá solo el código o una URL directa a la ficha?
14. ¿Las tareas se programan para un día exacto, para un periodo, o deben admitir ambas opciones desde el principio?
15. ¿Una tarea sobre una localización afecta a las plantas presentes al crearla o al completarla?
16. ¿El tipo «Otra» es suficiente o se necesitan tipos de tarea configurables?
17. ¿La primera versión necesita tareas recurrentes manuales aunque todavía no existan reglas inteligentes?
18. ¿Completar una tarea debe crear siempre un cuidado o hay tareas administrativas sin efecto en el historial de plantas?

## 25. Referencias de investigación

- [BGCI — PlantSearch y documentación de colecciones vivas](https://www.bgci.org/resources/bgci-databases/plantsearch/)
- [BGCI — Manual de gestión de jardines botánicos](https://www.bgci.org/wp/wp-content/uploads/2019/04/BGCI%20Botanic%20Garden%20Manual.pdf)
- [Hortis — gestión de colecciones botánicas](https://www.hortis.com/)
- [Hortis — impresión de etiquetas](https://support.hortis.com/support/solutions/articles/80001151982-print-plant-labels)
- [Sepal — estructura de taxones, ejemplares y localizaciones](https://sepal.app/)
- [BG-BASE — funciones de gestión de colecciones](https://www.bg-base.com/features.htm)
- [BRAHMS — gestión de jardines y trabajo de campo](https://herbaria.plants.ox.ac.uk/bol/brahms/software/v8)
- [W3C WAI — patrón accesible de breadcrumbs](https://www.w3.org/WAI/ARIA/apg/patterns/breadcrumb/)

## 26. Próximos pasos del descubrimiento

1. Revisar y resolver las preguntas abiertas por bloques.
2. Definir el mapa completo de historias de usuario y prioridades.
3. Dibujar la arquitectura de información y los flujos principales.
4. Crear wireframes de baja fidelidad en `docs/`.
5. Validar los wireframes contra tareas reales de una colección grande.
6. Redactar el PDR/PRD con alcance, requisitos, exclusiones y criterios verificables.
7. Dividir la implementación en changes de OpenSpec pequeños y coherentes.
