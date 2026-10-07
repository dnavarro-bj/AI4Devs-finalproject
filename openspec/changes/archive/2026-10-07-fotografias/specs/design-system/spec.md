## ADDED Requirements

### Requirement: Galería gestionable

`UiMediaGallery` SHALL admitir un **modo de gestión** opcional: cada imagen ofrece, por un menú accesible por teclado, **elegir como principal**, **editar su texto alternativo**, **editarla** y **borrarla**, y la galería permite **reordenar** por teclado además de con el ratón. El componente NO SHALL ejecutar ninguna de esas acciones: las **emite**, y quien lo usa decide qué hace (el kit no accede a datos). Una imagen en curso de subida o con error SHALL mostrar su estado con texto. Sin el modo de gestión, el comportamiento actual —ampliar y marcar la principal— SHALL conservarse, y todo texto alternativo SHALL seguir siendo obligatorio.

#### Scenario: Acciones por imagen

- **WHEN** la galería está en modo de gestión y se abre el menú de una imagen
- **THEN** ofrece principal, texto alternativo y borrar, y cada acción emite su evento con el identificador de la imagen

#### Scenario: Reordenar por teclado

- **WHEN** el usuario mueve una imagen con el teclado
- **THEN** se emite el nuevo orden completo y el foco se queda en la imagen movida

#### Scenario: Sin modo de gestión

- **WHEN** se usa la galería sin el modo de gestión
- **THEN** no hay menús ni reordenación y las imágenes se pueden ampliar como antes

#### Scenario: Imagen subiendo o con error

- **WHEN** una imagen está subiéndose o ha fallado
- **THEN** su estado se dice con texto y no solo con color

### Requirement: Portada con recuento

El kit SHALL ofrecer **`UiCoverPhoto`**: una portada con su imagen —o un hueco que dice «Sin fotografía» si no hay—, su **texto alternativo obligatorio** y un **recuento** («8 fotos») que, activado, emite un evento para abrir la galería. SHALL aceptar tamaños para la cabecera de una ficha y para una miniatura de lista, un solo elemento raíz y ninguna lectura de datos. Existe porque la portada aparece en la ficha del ejemplar y en la de la especie.

#### Scenario: Con imagen y recuento

- **WHEN** se muestra con una imagen y un recuento de 8
- **THEN** pinta la imagen con su texto alternativo y «8 fotos» como control activable

#### Scenario: Sin fotografía

- **WHEN** no hay imagen
- **THEN** dice «Sin fotografía» y no deja un hueco en blanco

#### Scenario: Una sola foto

- **WHEN** el recuento es 1
- **THEN** dice «1 foto»

#### Scenario: Abrir la galería

- **WHEN** el usuario activa el recuento
- **THEN** se emite el evento que abre la galería
