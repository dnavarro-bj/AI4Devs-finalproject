# Prompts de la IA en tiempo de ejecución

Los prompts que Cactify envía al proveedor de análisis mientras funciona. No confundir con [`prompts.md`](../prompts.md) de la raíz, que registra los prompts con los que se ha **construido** el proyecto.

Vive aquí y no en el `design.md` del change porque un design se archiva y este prompt hay que poder iterarlo después.

## Recomendación de cuidado de una lectura

**Cuándo se envía:** al solicitar `POST /plants/{id}/care-records/{careRecordId}/recommendation` sobre una lectura que aún no tiene recomendación.

**Quién lo construye:** `OpenAiCareAdvisor`, en `infrastructure/ai`. La capa de aplicación reúne los hechos —la especie y sus rangos, la lectura, el último riego y las desviaciones **ya calculadas**— y se los pasa como datos, no como texto. El fraseo es cosa del adaptador: así el doble de test recibe hechos y puede afirmar *qué* se mandó sin depender de cómo se redacta.

**El principio que lo gobierna** viene de la nota de la historia [0.4](user-stories/0.4-obtener-analisis-de-ia.md): *la IA no decide de forma autónoma ni inventa los rangos de cuidado; estos siempre provienen de la ficha de la especie. La IA solo interpreta esos datos.* Por eso las desviaciones se calculan en Kotlin contra `species.min_*`/`max_*` y llegan resueltas: al modelo no se le pregunta si el valor está fuera de rango, se le dice.

### Mensaje de sistema

```
Eres un experto en cultivo de cactus y suculentas. Interpreta la lectura que se te da a la luz
de los rangos de la especie, que ya vienen calculados: no los inventes ni los cuestiones.
Responde solo con un objeto JSON con estas claves:
- riskLevel: uno de "low", "medium", "high"
- explanation: una explicación breve, en español, de qué le pasa a la planta
- recommendedAction: qué debe hacer el usuario, en español; si no hay que hacer nada, dilo
- priority: uno de "immediate", "soon", "routine"
```

Los valores de `riskLevel` y `priority` son los que persisten los enumerados de dominio ([ADR-007](adr/ADR-007-enums-de-dominio.md)): en inglés, como el resto de identificadores. La etiqueta que ve el usuario la pone el frontend.

Se pide `response_format: json_object` para que el parseo no dependa de adivinar formato en prosa. Aun así, **todo fallo de interpretación se envuelve** como error del proveedor: un `riskLevel` desconocido hace que el enumerado lance, y sin envolver esa excepción acabaría reportándose como un `400` que culpa al cliente.

### Mensaje de usuario

Se compone con los hechos de la petición. Ejemplo real para una lectura de humedad muy baja:

```
Especie: Asiento de suegra (Echinocactus grusonii).
Rangos recomendados de la especie:
- Humedad: 10-30 %
- Temperatura: 10-35 °C
- Horas de luz: 6-10 h/día
- Pauta de riego: cada 10-20 dias en crecimiento, casi nulo en invierno

Lectura tomada el 2026-08-14T09:30:00Z:
- Humedad: 2
- Temperatura: no medida
- Horas de luz: no medidas
- Riego: no anotado
- Acidez del sustrato: no medida

Último riego registrado: 150 ml el 2026-07-28T08:00:00Z.

Desviaciones detectadas respecto a los rangos de la especie:
- humidity: 2, por debajo del rango 10-30
```

Tres detalles del contenido que no son casuales:

* **"no medida" frente a un valor.** Una lectura parcial es legítima, y decirle al modelo que un dato no se midió no es lo mismo que omitirlo: omitirlo invita a inventarlo.
* **El último riego se acota en el tiempo.** Es la lectura más reciente con riego mayor que cero **cuya fecha no sea posterior a la analizada**. Desde que el cliente puede aportar fechas (T-03), un envío en lote con lecturas antiguas haría que "el último riego" fuese posterior a la lectura que se está interpretando. Si no consta ninguno, se dice explícitamente: *"No consta ningún riego previo de esta planta."*
* **Las desviaciones van con su sentido** (por encima / por debajo) y con el rango contra el que se han calculado, para que la explicación pueda citarlo sin recalcularlo.

### Qué ajustar si la respuesta no convence

* Si el modelo devuelve niveles de riesgo demasiado altos para desviaciones pequeñas, el sitio para matizarlo es el mensaje de sistema, no el código.
* Si `priority` acaba siendo siempre una función de `riskLevel`, la columna no está aportando y conviene revisar la decisión 2 del design de `recomendaciones-ia` antes que insistir con el prompt.
* El modelo se cambia por variable de entorno (`OPENAI_MODEL`), sin tocar nada.
