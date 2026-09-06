# T-16 - Ficha del ejemplar ampliada y herencia de cuidados

**Área:** Backend + Frontend
**Historia relacionada:** [0.1](../user-stories/0.1-registrar-cactus.md), [0.7](../user-stories/0.7-personalizar-cuidados-de-un-ejemplar.md)
**Bloque:** 1 — gestión de plantas

## Descripción

Ampliar el ejemplar con lo que la ficha del prototipo da por supuesto y el modelo no tiene: descripción, estado, germinación, adquisición y procedencia. Y resolver por fin la personalización de cuidados, pendiente desde T-01.

## Alcance

* `Plant` gana descripción, estado del ciclo de vida, mes y año de germinación, fecha de adquisición y procedencia.
* Germinación con año conocido y mes desconocido, sin inventar un día ni un mes.
* Overrides de la pauta de cultivo por ejemplar: nulo hereda de la especie, valor sobrescribe. Cambiar la especie se propaga a lo no sobrescrito.
* La ficha muestra el perfil efectivo y en qué se aparta de su especie.
* Un cambio de estado queda registrado con su fecha.

## Criterios de aceptación

* Un ejemplar con solo año de germinación se guarda y se muestra como edad aproximada, sin mes inventado.
* Sobrescribir la exposición de un ejemplar no altera el resto de valores, que siguen heredándose.
* Cambiar la pauta de la especie cambia la de sus ejemplares salvo en los campos sobrescritos.
* La ficha distingue visualmente el valor heredado del sobrescrito.

## Pendiente antes de empezar

Los estados válidos del ejemplar y sus transiciones (§24.4), y la regla general sobre datos parciales, que choca con el estilo de invariantes estrictas de [ADR-011](../adr/ADR-011-invariantes-de-negocio-en-el-dominio.md).
