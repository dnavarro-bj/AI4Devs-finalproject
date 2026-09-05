// @vitest-environment node
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Los tokens son el origen único de la presentación (ADR-014). Este test es la barrera: un color
 * literal en cualquier `<style>` de la aplicación significa que alguien ha decidido un color fuera
 * del sistema, y entonces cambiar el token de marca ya no se propaga solo.
 */

const APP_DIR = join(import.meta.dirname, '..', 'app')

function vueFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return vueFiles(path)
    return path.endsWith('.vue') ? [path] : []
  })
}

function styleBlocks(source: string): string[] {
  return [...source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((match) => match[1] ?? '')
}

const LITERAL_COLOR = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/

describe('tokens como origen único de la presentación', () => {
  const offenders = vueFiles(APP_DIR).flatMap((file) =>
    styleBlocks(readFileSync(file, 'utf8'))
      .flatMap((block) => block.split('\n'))
      .filter((line) => LITERAL_COLOR.test(line))
      .map((line) => `${file.slice(APP_DIR.length + 1)}: ${line.trim()}`),
  )

  it('ningún componente declara un color literal en su estilo', () => {
    expect(offenders).toEqual([])
  })

  it('la hoja base no declara ningún color: todos vienen de tokens.css', () => {
    const base = readFileSync(join(APP_DIR, 'assets', 'css', 'base.css'), 'utf8')
    expect(base.split('\n').filter((line) => LITERAL_COLOR.test(line))).toEqual([])
  })

  /*
   * La otra mitad de la barrera: una variable que no está en `tokens.css` no falla, se ignora en
   * silencio y deja el estilo a medias. Aquí sí falla.
   */
  it('toda variable usada está declarada en tokens.css', () => {
    const tokens = readFileSync(join(APP_DIR, 'assets', 'css', 'tokens.css'), 'utf8')
    const declared = new Set([...tokens.matchAll(/(--[a-z0-9-]+):/g)].map((match) => match[1]))

    const sources = [
      ...vueFiles(APP_DIR).map((file) => [file.slice(APP_DIR.length + 1), readFileSync(file, 'utf8')] as const),
      ['assets/css/base.css', readFileSync(join(APP_DIR, 'assets', 'css', 'base.css'), 'utf8')] as const,
    ]

    const unknown = sources.flatMap(([name, source]) =>
      [...source.matchAll(/var\((--[a-z0-9-]+)/g)]
        .map((match) => match[1]!)
        .filter((variable) => !declared.has(variable))
        .map((variable) => `${name}: ${variable}`),
    )

    expect([...new Set(unknown)]).toEqual([])
  })
})
