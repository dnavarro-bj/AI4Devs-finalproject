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

## Se implementa en dos changes

1. **`ficha-del-ejemplar`** — hecho: descripción, estado con su historial y sus transiciones, germinación con datos parciales, adquisición y procedencia; el inventario por estado.
2. **`cuidados-por-ejemplar`** — pendiente: los overrides de la pauta con herencia de la especie y el perfil efectivo.

## Decisiones tomadas

* **Siete estados**: en curso (`activa`, `cuarentena`, `enferma`) y finales (`cedida`, `vendida`, `muerta`, `perdida`). Entre en curso, libres; a un final, libre; de un final solo a `activa`, con motivo obligatorio.
* **Germinación parcial**: año y mes opcionales, el mes solo con año.
* **Procedencia**: lista cerrada más nota libre.
