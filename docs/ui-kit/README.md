# Cactify UI Kit

Referencia visual y de comportamiento derivada de los wireframes de administración de Cactify. Su objetivo es mantener consistencia al implementar las pantallas del frontend, no sustituir los componentes Vue definitivos.

## Cómo consultar el kit

La galería interactiva está en [`cactify-ui-kit/index.html`](cactify-ui-kit/index.html). Desde la raíz del proyecto puede servirse junto al resto de documentación:

```bash
npx vite --host 127.0.0.1
```

Abrir después `/docs/ui-kit/cactify-ui-kit/`.

## Estructura

| Documento | Contenido |
|---|---|
| [Fundamentos](foundations.md) | Principios, color, tipografía, espaciado, radios, elevación y responsive |
| [Componentes](components.md) | Anatomía, variantes, estados y reglas de uso |
| [Patrones](patterns.md) | Composición de formularios, inventarios, historial, lecturas, IA y tareas |
| [Tokens CSS](cactify-ui-kit/tokens.css) | Variables portables que deben originar los futuros design tokens del frontend |
| [Galería](cactify-ui-kit/index.html) | Muestras visuales e interacciones de referencia |

## Principios de producto

1. **El trabajo pendiente aparece primero.** Alertas, vencimientos y próximas acciones tienen más peso que las métricas decorativas.
2. **La colección se reconoce por sus ejemplares.** El código permanente, la especie y la localización acompañan las acciones importantes.
3. **Dato e interpretación no se confunden.** Una lectura es evidencia; una recomendación de IA siempre muestra su origen y nivel de riesgo.
4. **La densidad sigue siendo respirable.** Las vistas admiten cientos o miles de plantas, pero mantienen jerarquía, alineación y blancos consistentes.
5. **Las acciones dicen el resultado.** “Guardar lectura”, “Crear tarea” o “Mover 31 plantas”; nunca botones ambiguos como “Aceptar”.

## Relación con los wireframes

Los wireframes continúan siendo la referencia de composición de cada pantalla. El UI kit gobierna las decisiones compartidas: tokens, controles, estados y patrones. Si hay una discrepancia, debe resolverse conscientemente antes de implementar; no se mezclan variantes por accidente.

## Estado

Versión inicial extraída del prototipo de administración. Incluye escritorio y adaptación móvil, estados de interacción, ejemplos de accesibilidad y los patrones de dominio más importantes.
