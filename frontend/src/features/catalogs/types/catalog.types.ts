/** Los catálogos que pueblan los formularios. Todo identificador es `string` (ADR-008). */

export interface Location {
  id: string
  name: string
}

/**
 * La localización en el catálogo: el nombre más la carga que soporta.
 *
 * El recuento viaja en el listado —no solo en la ficha, como en mezclas— porque el mapa del vivero
 * **es** la carga de cada sitio. El API lo resuelve con una agregación para la página entera.
 */
export interface LocationListItem extends Location {
  plantCount: number
}

/**
 * La localización en su propia ficha: el nombre más **cuántos ejemplares alberga**.
 *
 * El recuento solo viaja en la ficha, igual que en mezclas: en el catálogo sería una consulta por
 * fila, y aquí es la cifra que decide si la localización se puede retirar.
 */
export interface LocationDetail extends Location {
  plantCount: number
}

export interface Tag {
  id: string
  name: string
}
