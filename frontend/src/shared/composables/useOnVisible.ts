import { onBeforeUnmount, watch, type Ref } from 'vue'

/**
 * Llama a `callback` cada vez que `target` entra en pantalla: la base del scroll infinito. Sin
 * `IntersectionObserver` (renderizado de servidor, entornos de test) no hace nada, y el botón que
 * acompañe al centinela sigue siendo la vía manual.
 */
export function useOnVisible(target: Ref<HTMLElement | null>, callback: () => void) {
  let observer: IntersectionObserver | undefined

  const stop = watch(
    target,
    (element) => {
      observer?.disconnect()
      observer = undefined
      if (!element || typeof IntersectionObserver === 'undefined') return
      observer = new IntersectionObserver((hits) => {
        if (hits.some((hit) => hit.isIntersecting)) callback()
      })
      observer.observe(element)
    },
    { immediate: true, flush: 'post' },
  )

  onBeforeUnmount(() => {
    stop()
    observer?.disconnect()
  })
}
