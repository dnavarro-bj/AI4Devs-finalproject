/**
 * Entrega al navegador un archivo ya descargado: un enlace temporal con `download`, que se pulsa y
 * se retira, y la dirección del blob se libera para no retener el archivo en memoria.
 *
 * Toca el DOM, así que lo llama un composable y **nunca** un componente. Vive en `shared` porque
 * cualquier feature que descargue un archivo lo necesita.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  try {
    link.click()
  } finally {
    link.remove()
    URL.revokeObjectURL(url)
  }
}
