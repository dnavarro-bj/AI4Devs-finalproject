// @vitest-environment node
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * El límite entre capas de [ADR-015](../../docs/adr/ADR-015-arquitectura-del-frontend.md), como
 * test y no como acuerdo.
 *
 * Es el mismo mecanismo que `design-tokens.spec.ts` usa para ADR-014: una regla que solo está
 * escrita se rompe; una que falla en la suite, no. Y es la razón por la que los módulos de `src/`
 * se importan explícitamente en lugar de auto-importarse — con auto-import no habría sentencia de
 * importación que inspeccionar.
 */

const ROOT = join(import.meta.dirname, '..')

function sources(dir: string, exts = ['.ts', '.vue']): string[] {
  let out: string[] = []
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) out = out.concat(sources(path, exts))
    else if (exts.some((ext) => path.endsWith(ext)) && !path.includes('.test.')) out.push(path)
  }
  return out
}

/** Las rutas de todos los `import ... from '...'` de un fichero. */
function importsOf(file: string): string[] {
  const source = readFileSync(file, 'utf8')
  return [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((match) => match[1]!)
}

const relative = (file: string) => file.slice(ROOT.length + 1)

const FEATURES = join(ROOT, 'src', 'features')
const SHARED = join(ROOT, 'src', 'shared')
const KIT = join(ROOT, 'app', 'components', 'ui')

describe('límites entre capas', () => {
  it('ningún componente importa un service: pasa por su composable', () => {
    const offenders = sources(FEATURES)
      .filter((file) => file.includes('/components/'))
      .flatMap((file) => importsOf(file)
        .filter((path) => path.includes('.service'))
        .map((path) => `${relative(file)} → ${path}`))

    expect(offenders).toEqual([])
  })

  it('ningún service importa un store ni un composable', () => {
    const offenders = sources(FEATURES)
      .filter((file) => file.includes('/services/'))
      .flatMap((file) => importsOf(file)
        .filter((path) => path.includes('.store') || /\/use[A-Z]/.test(path))
        .map((path) => `${relative(file)} → ${path}`))

    expect(offenders).toEqual([])
  })

  it('ninguna pantalla ni componente ve un ApiError: el service lo traduce a DomainError', () => {
    const offenders = [...sources(join(ROOT, 'app')), ...sources(FEATURES)]
      .filter((file) => !file.startsWith(SHARED))
      .flatMap((file) => importsOf(file)
        .filter((path) => path.includes('httpClient'))
        .map((path) => `${relative(file)} → ${path}`))
      // El service sí lo necesita: es quien lo captura.
      .filter((entry) => !entry.includes('/services/'))

    expect(offenders).toEqual([])
  })

  it('el UI kit no depende de ninguna feature: invertiría la dependencia', () => {
    const offenders = sources(KIT)
      .flatMap((file) => importsOf(file)
        .filter((path) => path.startsWith('@features') || path.includes('/features/'))
        .map((path) => `${relative(file)} → ${path}`))

    expect(offenders).toEqual([])
  })

  it('`shared` no depende de ninguna feature: es la capa de abajo', () => {
    const offenders = sources(SHARED)
      .flatMap((file) => importsOf(file)
        .filter((path) => path.startsWith('@features') || path.includes('/features/'))
        .map((path) => `${relative(file)} → ${path}`))

    expect(offenders).toEqual([])
  })

  it('la lógica ya no vive en `app/`: solo pantallas, armazón y kit', () => {
    const strays = readdirSync(join(ROOT, 'app'))
      .filter((entry) => ['composables', 'utils', 'types', 'stores', 'fixtures'].includes(entry))

    expect(strays).toEqual([])
  })

  it('`app/components/` solo contiene el kit', () => {
    expect(readdirSync(join(ROOT, 'app', 'components'))).toEqual(['ui'])
  })
})
