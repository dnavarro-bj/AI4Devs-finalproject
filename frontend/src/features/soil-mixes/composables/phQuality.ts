/**
 * La lectura cualitativa de un rango de pH: «ligeramente ácido» dice más que «5,8–6,8» a quien no
 * tiene la escala memorizada, que es casi todo el mundo.
 *
 * Vive en la feature y no en el kit porque es **conocimiento de cultivo**, no de presentación: un
 * componente del kit que supiera de pH dejaría de ser genérico.
 *
 * **Clasifica por el punto medio del rango**, no por sus extremos: una mezcla de 5,8 a 6,8 es
 * ligeramente ácida aunque su máximo roce el neutro, y clasificarla por el mínimo la haría parecer
 * más ácida de lo que es.
 *
 * Función pura: se prueba en los bordes sin montar nada.
 */
export type PhQuality = 'Ácido' | 'Ligeramente ácido' | 'Neutro' | 'Alcalino'

/** Los tramos, por su límite superior. El último recoge todo lo que quede por encima. */
const BANDS: { upTo: number, quality: PhQuality }[] = [
  { upTo: 5.5, quality: 'Ácido' },
  { upTo: 6.8, quality: 'Ligeramente ácido' },
  { upTo: 7.2, quality: 'Neutro' },
]

export function phQuality(min: number, max: number): PhQuality {
  const mid = (min + max) / 2
  return BANDS.find((band) => mid < band.upTo)?.quality ?? 'Alcalino'
}
