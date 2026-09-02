<template>
  <div class="app">
    <NuxtRouteAnnouncer />
    <header class="app__header">
      <NuxtLink to="/plants" class="app__brand">Cactify</NuxtLink>
    </header>
    <main class="app__main">
      <NuxtPage />
    </main>
  </div>
</template>

<style>
/*
 * Layout único con unas pocas variables (decisión 8 del design). Sin dependencia de estilos:
 * cada una obligaría a regenerar `yarn.lock` y a mantenerla.
 */
:root {
  --color-text: #1f2421;
  --color-muted: #5d6b63;
  --color-border: #d8e0da;
  --color-surface: #ffffff;
  --color-bg: #f4f7f5;
  --color-accent: #2f6f4e;
  --color-danger: #a4342c;
  --space: 1rem;
  --radius: 6px;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--color-bg);
  color: var(--color-text);
  font: 16px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif;
}

.app__header {
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  padding: var(--space);
}

.app__brand {
  color: var(--color-accent);
  font-size: 1.25rem;
  font-weight: 600;
  text-decoration: none;
}

.app__main {
  margin: 0 auto;
  max-width: 60rem;
  padding: var(--space);
}

button {
  background: var(--color-accent);
  border: 1px solid var(--color-accent);
  border-radius: var(--radius);
  color: #fff;
  cursor: pointer;
  font: inherit;
  padding: 0.5rem 0.9rem;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

input,
select {
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font: inherit;
  padding: 0.45rem 0.6rem;
  width: 100%;
}

label {
  display: block;
  font-weight: 500;
  margin-bottom: 0.25rem;
}
</style>
