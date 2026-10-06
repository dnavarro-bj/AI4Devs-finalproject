# Tasks: esqueleto-trabajo

Orden test-first ([ADR-005](../../../docs/adr/ADR-005-tdd.md)). Solo frontend; capas de [ADR-015](../../../docs/adr/ADR-015-arquitectura-del-frontend.md): componente → composable → service. Los mocks viven en `src/features/<feature>/mocks/`, nombran su ticket y los consume el service.

## 1. Armazón: el Dashboard como raíz

- [x] 1.1 Escribir los escenarios de navegación: la raíz es el Dashboard y no redirige, la entrada va al frente sin grupo, y **solo se marca activa en la raíz**. En rojo
- [x] 1.2 Declarar la entrada «Dashboard» en `navigation.ts` y tratar la raíz aparte en `isActiveSection`
- [x] 1.3 Actualizar `navigation-map`, `app-shell` y los tests que daban `/` por redirección o contaban cuatro grupos

## 2. Datos de ejemplo y fecha de referencia

- [x] 2.1 Escribir el test de la fecha de referencia única: la leen Dashboard, agenda y calendario, y con una fecha dada «vencida» es determinista. En rojo
- [x] 2.2 Implementar el composable de la fecha de referencia
- [x] 2.3 Crear los mocks de tareas (T-22) y de alertas (T-23), con la cabecera que nombra el ticket que los borra, tipos provisionales declarados y fechas relativas a la fecha de referencia fija

## 3. Tareas

- [x] 3.1 Escribir el test del service con el mock tras su bandera: devuelve `ServiceResponse` y no lanza. En rojo
- [x] 3.2 Crear `src/features/tasks/` con tipos, service y composable que carga **una vez** y filtra por localización, tipo y prioridad
- [x] 3.3 Escribir los escenarios de «Tareas en tres vistas»: las tres muestran lo mismo, alternar no recarga ni pierde el filtro, vencida se calcula, día desbordado, sin tareas. En rojo
- [x] 3.4 Crear `app/pages/tasks/index.vue` con agenda, calendario y completadas sobre `UiAgendaList` y `UiCalendarMonth`
- [x] 3.5 Declarar con T-22, sin modificar nada, crear, completar, completar varias y editar; comprobar que **ninguna tarea cambia**

## 4. Alertas

- [x] 4.1 Escribir los escenarios de «Bandeja de alertas»: severidad legible sin color, abiertas por defecto con el recuento coherente, filtrar por estado, acciones que no cambian el estado, navegar a la planta. En rojo
- [x] 4.2 Crear `src/features/alerts/` con tipos, service sobre el mock y composable con el filtro por estado
- [x] 4.3 Crear `app/pages/alerts/index.vue` con la tarjeta de alerta y su marca por severidad
- [x] 4.4 Declarar con T-23 el filtro «Origen» y las acciones de revisar, descartar y crear tarea

## 5. Dashboard

- [x] 5.1 Escribir los escenarios de «Dashboard de trabajo»: las tres cifras abren su conjunto, la fecha viene de fuera, carga por zona real con barra proporcional, lo que falta declarado, error de localizaciones aislado. En rojo
- [x] 5.2 Crear `src/features/dashboard/` con el composable que reúne tareas, alertas y localizaciones **sin duplicar** sus cargas
- [x] 5.3 Reemplazar `app/pages/index.vue` por el Dashboard, con la composición de dos columnas
- [x] 5.4 Marcar con T-22, T-23 y T-24 cada bloque de ejemplo en su sitio, incluido el recuento de tareas por zona

## 6. Importar y exportar

- [x] 6.1 Escribir los escenarios de «Importar y exportar»: errores por fila a la vista, errores que bloquean, corregidos permiten aplicar, simulación declarada, cambiar de archivo reinicia. En rojo
- [x] 6.2 Crear `src/features/transfer/` con el mock (marcado «sin ticket», T-21 y T-15 donde toque) y el composable como **máquina de estados** en que aplicar solo es alcanzable sin errores
- [x] 6.3 Crear `app/pages/import-export/index.vue` con la frescura de la copia, los dos paneles y la actividad reciente

## 7. Configuración

- [x] 7.1 Escribir los escenarios de «Configuración por ámbitos»: un ámbito a la vez, lo editado se conserva al cambiar, «sin guardar» calculado, vista previa del código, guardar no persiste y lo dice, la clave no se expone. En rojo
- [x] 7.2 Crear `src/features/settings/` con estado local por ámbito y «sucio» calculado
- [x] 7.3 Crear `app/pages/settings/index.vue` sobre `UiEditorNav`, `UiSwitch` y los campos del kit
- [x] 7.4 Marcar la pantalla como maqueta sin ticket

## 8. Kit

- [x] 8.1 Revisar qué patrón aparece en **dos** pantallas —tarjeta de alerta, fila con interruptor, fila de actividad— y sacarlo al kit con su test y su muestra en `/ui-kit`
- [x] 8.2 Actualizar el recuento de componentes del kit y la galería si cambia

## 9. Cierre

- [x] 9.1 Eliminar los usos de `PendingSection` que quedan sin sección y comprobar que `pending-section.nuxt.spec.ts` sigue cubriendo el componente
- [x] 9.2 Suite del frontend y comprobación de tokens en verde (`yarn test`)
- [x] 9.3 Contraste final contra el prototipo, pantalla a pantalla y bloque a bloque —`dashboard`, `tasks`, `alerts`, `transfer`, `settings`—, con la lista de lo que se reproduce y lo que queda marcado con su ticket
- [x] 9.4 Proponer el ticket para importación, exportación y configuración, que ninguno del backlog recoge, y actualizar `docs/tickets/README.md` y `CLAUDE.md`
