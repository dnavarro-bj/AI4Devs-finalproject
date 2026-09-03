(function () {
  const sidebar = document.getElementById('kit-sidebar')
  const scrim = document.getElementById('sidebar-scrim')
  const menuButton = document.getElementById('menu-button')
  const closeSidebarButton = document.getElementById('sidebar-close')
  const navLinks = Array.from(document.querySelectorAll('.kit-nav a'))
  const sections = Array.from(document.querySelectorAll('[data-section]'))
  const toast = document.getElementById('toast')
  const aiDialog = document.getElementById('ai-dialog')
  let toastTimer

  function showToast(message) {
    window.clearTimeout(toastTimer)
    toast.textContent = message
    toast.classList.add('is-visible')
    toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 2200)
  }

  function closeSidebar() {
    sidebar.classList.remove('is-open')
    scrim.classList.remove('is-visible')
  }

  function setActiveLink(id) {
    navLinks.forEach((link) => link.classList.toggle('is-active', link.hash === `#${id}`))
  }

  menuButton.addEventListener('click', () => {
    sidebar.classList.add('is-open')
    scrim.classList.add('is-visible')
  })
  closeSidebarButton.addEventListener('click', closeSidebar)
  scrim.addEventListener('click', closeSidebar)
  navLinks.forEach((link) => link.addEventListener('click', closeSidebar))

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
      if (visible) setActiveLink(visible.target.id)
    }, { rootMargin: '-20% 0px -65%', threshold: [0, 0.25, 0.6] })
    sections.forEach((section) => observer.observe(section))
  }

  document.querySelectorAll('[data-copy]').forEach((swatch) => {
    swatch.addEventListener('click', async () => {
      const value = swatch.dataset.copy
      try {
        await navigator.clipboard.writeText(value)
        showToast(`${value.toUpperCase()} copiado`)
      } catch (_) {
        showToast(`Color ${value.toUpperCase()}`)
      }
    })
  })

  const rowChecks = Array.from(document.querySelectorAll('.row-check'))
  const selectAll = document.getElementById('select-all')
  const selectionBar = document.getElementById('selection-bar')
  const selectedCount = document.getElementById('selected-count')

  function updateSelection() {
    const count = rowChecks.filter((checkbox) => checkbox.checked).length
    selectedCount.textContent = count
    selectionBar.classList.toggle('is-visible', count > 0)
    selectAll.checked = count === rowChecks.length
    selectAll.indeterminate = count > 0 && count < rowChecks.length
  }

  selectAll.addEventListener('change', () => {
    rowChecks.forEach((checkbox) => { checkbox.checked = selectAll.checked })
    updateSelection()
  })
  rowChecks.forEach((checkbox) => checkbox.addEventListener('change', updateSelection))

  document.querySelectorAll('.filter-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      chip.remove()
      showToast('Filtro eliminado')
    })
  })

  function openAiDialog() {
    aiDialog.hidden = false
    window.setTimeout(() => document.getElementById('accept-ai').focus(), 0)
  }

  function closeAiDialog() {
    aiDialog.hidden = true
    document.getElementById('open-ai').focus()
  }

  document.getElementById('open-ai').addEventListener('click', openAiDialog)
  document.getElementById('close-ai').addEventListener('click', closeAiDialog)
  document.getElementById('accept-ai').addEventListener('click', closeAiDialog)
  aiDialog.addEventListener('click', (event) => {
    if (event.target === aiDialog) closeAiDialog()
  })

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (!aiDialog.hidden) closeAiDialog()
      else closeSidebar()
    }
  })
})()
