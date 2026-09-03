# Fundamentos visuales

## Dirección

Cactify es una herramienta de trabajo para una colección viva. La interfaz combina la precisión de una etiqueta de vivero con superficies limpias y resistentes al uso diario. Debe sentirse serena, competente y botánica, sin caer en ilustraciones decorativas o en una estética de tienda de plantas.

## Color

La paleta base vive en [`tokens.css`](cactify-ui-kit/tokens.css).

| Token | Valor | Uso |
|---|---:|---|
| `--color-ink` | `#17211d` | Texto principal |
| `--color-ink-muted` | `#52615a` | Texto secundario |
| `--color-canvas` | `#f3f5f1` | Fondo de aplicación |
| `--color-surface` | `#ffffff` | Superficies elevadas |
| `--color-line` | `#d9e0db` | Bordes y divisores |
| `--color-brand` | `#315c49` | Acción primaria y navegación activa |
| `--color-brand-strong` | `#244536` | Hover y superficies de énfasis |
| `--color-success-soft` | `#dce9e1` | Estado correcto, nunca como única señal |
| `--color-warning` | `#9a6412` | Atención y vencimiento próximo |
| `--color-danger` | `#a34135` | Riesgo alto, error y acción destructiva |

Los colores semánticos siempre se acompañan de texto, icono o forma. El verde de marca no significa por sí solo “correcto”: también representa la acción primaria.

## Tipografía

La familia de referencia es `Avenir Next`, con `Avenir`, `Segoe UI` y sans-serif como alternativas. Los códigos de ejemplar usan una familia monoespaciada del sistema.

| Rol | Tamaño | Peso | Interlineado |
|---|---:|---:|---:|
| Título de pantalla | `38px` máx. | 700 | `1.08` |
| Título de sección | `17px` | 700 | `1.25` |
| Título de componente | `15px` | 700 | `1.3` |
| Texto base | `15px` | 400 | `1.5` |
| Texto auxiliar | `12px` | 400–600 | `1.4` |
| Código de planta | `12px` | 700 | `1.2` |

Se usa sentence case. Las mayúsculas con espaciado solo identifican categorías cortas o tipos de evento; no deben preceder sistemáticamente a todos los títulos.

## Espaciado

La unidad base es `4px`. La escala disponible es `4, 8, 12, 16, 20, 24, 32, 40 y 48px`.

- `4–8px`: relación íntima, como icono y texto o título y ayuda.
- `12–16px`: interior de controles y componentes compactos.
- `20–24px`: interior de paneles y separación de grupos.
- `32–48px`: separación entre secciones de documentación o pantalla.

## Forma y elevación

- Radio pequeño `6px`: controles y elementos funcionales.
- Radio medio `10px`: paneles, tablas y avisos.
- Radio grande `16px`: diálogos y composiciones excepcionales.
- Píldora: únicamente estados, filtros y cantidades breves.
- Sombra: reservada para overlays o elementos realmente elevados. Las tarjetas ordinarias se separan mediante borde.

## Retícula

La aplicación usa una barra lateral de `248px`, una barra superior de `76px` y un área principal de hasta `1530px`. Las pantallas de detalle combinan una columna fluida con un lateral de `310px`. En móvil, el lateral pasa a drawer y todas las composiciones se apilan.

## Movimiento

Las transiciones comunican una acción: abrir un diálogo, mostrar una confirmación o cambiar de sección. La entrada de una pantalla puede durar `180ms`. Debe respetarse `prefers-reduced-motion`.

## Accesibilidad base

- Objetivo mínimo recomendado: WCAG 2.2 AA.
- Foco visible de `3px`, separado del borde del control.
- Área interactiva mínima recomendada de `38px`; `44px` en acciones principales móviles.
- Todo campo conserva una etiqueta visible y un mensaje de ayuda o error específico.
- La información no depende únicamente del color.
