# Patrones de producto

## Cabecera de pantalla

Orden recomendado: breadcrumbs, título y descripción, acciones. La acción primaria representa el siguiente paso más frecuente de esa pantalla. Las métricas no deben desplazar el propósito principal.

## Formularios largos

Crear o editar plantas, especies, localizaciones y mezclas usa pantalla completa. Se agrupan campos por decisiones comprensibles, con resumen lateral cuando ayuda a revisar el resultado. Las acciones permanecen predecibles: cancelar a la izquierda del guardado; eliminar, si existe, queda separado.

## Selección masiva

La tabla muestra selectores discretos. Al seleccionar uno o más elementos aparece una barra oscura con cantidad, alcance y acciones válidas. Toda acción declara cuántos ejemplares afectará antes de ejecutarse.

## Lectura de cultivo

Una lectura admite uno o más valores entre humedad, temperatura, horas de luz, pH y cantidad de riego. Junto a cada campo se muestra el rango efectivo de la planta. La fecha no puede estar en el futuro.

Después de guardar, el registro aparece en la cronología con los valores introducidos. Los ausentes se muestran como raya, nunca como cero.

## Recomendación de IA

La IA es una interpretación vinculada a una lectura concreta. El patrón siempre contiene:

1. Valores de origen.
2. Riesgo y prioridad.
3. Explicación basada en rangos efectivos e historial.
4. Acción recomendada.
5. Evidencia utilizada.
6. Aviso de que no modifica automáticamente tareas, alertas ni cuidados.

Convertir la recomendación en tarea abre el formulario correspondiente con contexto precargado; el usuario confirma la creación.

## Historial de planta

La cronología mezcla eventos heterogéneos sin perder su tipo: lectura, riego, tarea, fotografía, comentario, floración o movimiento. Cada evento indica fecha y procedencia. Las recomendaciones aparecen anidadas en la lectura que las originó.

## Riesgo y trabajo

Una condición detectada puede generar una alerta. Una alerta puede convertirse en tarea. Completar la tarea registra la acción, pero no borra el historial ni afirma que la condición biológica se haya resuelto sin una nueva revisión.

## Estados vacíos y errores

Un vacío explica qué falta y ofrece una sola acción útil. Un error conserva los datos introducidos, identifica el campo o proceso afectado y describe el siguiente paso. Para importaciones, los errores se revisan antes de confirmar cambios.

## Responsive

En pantallas pequeñas se preserva este orden: identidad, estado, acción, detalle. Los laterales pasan debajo del contenido principal; las acciones pueden ocupar todo el ancho. Las tablas conservan scroll si la comparación entre columnas es esencial.
