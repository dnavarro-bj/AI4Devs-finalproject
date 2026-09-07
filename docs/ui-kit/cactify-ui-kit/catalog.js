(function () {
  const search = document.getElementById('component-search')
  const count = document.getElementById('component-count')
  const cases = Array.from(document.querySelectorAll('.component-case'))
  const groups = Array.from(document.querySelectorAll('.catalog-group'))
  const dialog = document.getElementById('catalog-dialog')
  const openDialog = document.getElementById('catalog-open-dialog')
  const closeDialog = document.getElementById('catalog-close-dialog')
  const acceptDialog = document.getElementById('catalog-accept-dialog')
  const toast = document.getElementById('catalog-toast')
  let toastTimer

  function showToast(message) {
    window.clearTimeout(toastTimer)
    toast.textContent = message
    toast.classList.add('is-visible')
    toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 2200)
  }

  function filterComponents() {
    const query = search.value.trim().toLocaleLowerCase('es')
    let visible = 0
    cases.forEach((item) => {
      const matches = !query || item.dataset.component.toLocaleLowerCase('es').includes(query)
      item.hidden = !matches
      if (matches) visible += 1
    })
    groups.forEach((group) => {
      group.hidden = !Array.from(group.querySelectorAll('.component-case')).some((item) => !item.hidden)
    })
    count.textContent = `${visible} ${visible === 1 ? 'componente visible' : 'componentes visibles'}`
  }

  function setDialog(open) {
    dialog.hidden = !open
    if (open) window.setTimeout(() => acceptDialog.focus(), 0)
    else openDialog.focus()
  }

  search.addEventListener('input', filterComponents)
  document.querySelectorAll('[data-removable]').forEach((chip) => chip.addEventListener('click', () => {
    chip.remove()
    showToast('Filtro eliminado')
  }))
  document.querySelectorAll('[data-tabs] button').forEach((button) => button.addEventListener('click', () => {
    button.parentElement.querySelectorAll('button').forEach((item) => item.classList.toggle('is-active', item === button))
  }))
  document.querySelectorAll('[data-editor-nav] button').forEach((button) => button.addEventListener('click', () => {
    button.parentElement.querySelectorAll('button').forEach((item) => item.classList.toggle('is-active', item === button))
  }))
  document.querySelectorAll('.catalog-row-check').forEach((checkbox) => checkbox.addEventListener('change', () => {
    const selected = document.querySelectorAll('.catalog-row-check:checked').length
    document.querySelector('.table-selection strong span').textContent = selected
    document.querySelector('.table-selection').style.visibility = selected ? 'visible' : 'hidden'
  }))
  openDialog.addEventListener('click', () => setDialog(true))
  closeDialog.addEventListener('click', () => setDialog(false))
  acceptDialog.addEventListener('click', () => {
    setDialog(false)
    showToast('Tarea creada')
  })
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) setDialog(false)
  })
  document.getElementById('catalog-show-toast').addEventListener('click', () => showToast('Lectura guardada'))
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !dialog.hidden) setDialog(false)
  })
})()
