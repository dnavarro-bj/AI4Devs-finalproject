## ADDED Requirements

### Requirement: Enlace «Ver todos» en los grupos de la búsqueda global

`UiGlobalSearch` SHALL admitir que un grupo declare un **enlace de continuación** opcional `{ label, to }` y SHALL pintarlo al final de ese grupo como una opción más del recorrido del teclado, activable y anunciada como las demás. Un grupo sin él SHALL pintarse como hasta ahora. El componente SHALL seguir sin acceder a datos: recibe el enlace ya construido.

#### Scenario: Grupo con continuación

- **WHEN** se monta con un grupo que trae `more: { label: 'Ver los 37 resultados', to: '/plants?q=x' }`
- **THEN** el enlace aparece al final del grupo y se puede alcanzar con las flechas

#### Scenario: Activarlo

- **WHEN** se elige el enlace
- **THEN** emite la selección con su `to` y la lista se cierra

#### Scenario: Grupo sin continuación

- **WHEN** un grupo no declara `more`
- **THEN** no se pinta ningún enlace y el recorrido es el de antes

#### Scenario: Sin resultados

- **WHEN** no hay ningún resultado
- **THEN** el componente dice que no hay resultados y no pinta enlaces
