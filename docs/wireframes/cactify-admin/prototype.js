(function () {
  const prototype = document.getElementById('prototype')
  const screens = Array.from(document.querySelectorAll('[data-screen]'))
  const navItems = Array.from(document.querySelectorAll('.nav-item'))
  const sidebar = document.getElementById('sidebar')
  const sidebarScrim = document.getElementById('sidebar-scrim')
  const menuButton = document.getElementById('menu-button')
  const sidebarClose = document.getElementById('sidebar-close')
  const searchDialog = document.getElementById('search-dialog')
  const searchButton = document.getElementById('global-search')
  const searchInput = document.getElementById('search-input')
  const taskDialog = document.getElementById('task-dialog')
  const taskForm = document.getElementById('task-form')
  const careRecordDialog = document.getElementById('care-record-dialog')
  const careRecordForm = document.getElementById('care-record-form')
  const aiDialog = document.getElementById('ai-dialog')
  const moveDialog = document.getElementById('move-dialog')
  const moveForm = document.getElementById('move-form')
  const tagDialog = document.getElementById('tag-dialog')
  const tagForm = document.getElementById('tag-form')
  const tagMergeDialog = document.getElementById('tag-merge-dialog')
  const tagMergeForm = document.getElementById('tag-merge-form')
  const toast = document.getElementById('toast')
  let toastTimer
  let editingTaskSource = null

  function closeSidebar() {
    sidebar.classList.remove('is-open')
    sidebarScrim.classList.remove('is-visible')
  }

  function openSidebar() {
    sidebar.classList.add('is-open')
    sidebarScrim.classList.add('is-visible')
  }

  function setActiveNav(page, moduleName) {
    navItems.forEach((item) => {
      const matchesPage = item.dataset.page === page
      const matchesModule = moduleName && item.dataset.module === moduleName
      item.classList.toggle('is-active', Boolean(matchesPage || matchesModule))
    })
  }

  function showPage(page) {
    screens.forEach((screen) => screen.classList.toggle('is-visible', screen.dataset.screen === page))
    const parentPage = page.startsWith('plant-') ? 'plants' : page.startsWith('species-') ? 'species' : page.startsWith('location-') ? 'locations' : page.startsWith('soil-mix-') ? 'soil-mixes' : page.startsWith('tag-') ? 'tags' : page
    setActiveNav(parentPage)
    closeSidebar()
    window.scrollTo({ top: 0, behavior: 'auto' })
    const titles = {
      dashboard: 'Dashboard',
      plants: 'Plantas',
      'plant-detail': 'CAT-GRUSS-01',
      'plant-create': 'Añadir planta',
      tasks: 'Tareas',
      alerts: 'Alertas',
      species: 'Especies',
      'species-detail': 'Echinocactus grusonii',
      'species-editor': 'Editar especie',
      locations: 'Localizaciones',
      'location-detail': 'Bancada norte',
      'location-editor': 'Editar localización',
      'soil-mixes': 'Mezclas de sustrato',
      'soil-mix-detail': 'Mineral drenante',
      'soil-mix-editor': 'Editar mezcla',
      tags: 'Etiquetas',
      'tag-detail': 'Globular',
      transfer: 'Importar / exportar',
      settings: 'Configuración'
    }
    document.title = `Cactify — ${titles[page] || page}`
  }

  function showToast(message) {
    window.clearTimeout(toastTimer)
    toast.textContent = message
    toast.classList.add('is-visible')
    toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 2400)
  }

  function openSearch() {
    searchDialog.hidden = false
    window.setTimeout(() => searchInput.focus(), 0)
  }

  function closeSearch() {
    searchDialog.hidden = true
    searchButton.focus()
  }

  function openCareRecordDialog() {
    careRecordDialog.hidden = false
    updateCareRecordState()
    window.setTimeout(() => document.getElementById('care-humidity').focus(), 0)
  }

  function closeCareRecordDialog() {
    careRecordDialog.hidden = true
  }

  function openAiDialog(variant = 'existing') {
    const isNew = variant === 'new'
    const careValue = (id, unit = '') => {
      const value = document.getElementById(id).value
      return value === '' ? '—' : `${value.replace('.', ',')}${unit}`
    }
    const values = isNew ? [careValue('care-humidity', '%'), careValue('care-temperature', ' °C'), careValue('care-light', ' h'), careValue('care-ph'), careValue('care-water', ' ml')] : ['31%', '24 °C', '10 h', '6,2', '—']
    document.querySelectorAll('.ai-source-reading span').forEach((value, index) => { value.textContent = values[index] })
    const risk = aiDialog.querySelector('.risk-badge')
    risk.textContent = isNew ? 'Riesgo medio' : 'Riesgo bajo'
    risk.classList.toggle('risk-badge--medium', isNew)
    risk.classList.toggle('risk-badge--low', !isNew)
    aiDialog.querySelector('.ai-verdict .priority').textContent = isNew ? 'Atender pronto' : 'Rutina'
    aiDialog.querySelector('.ai-verdict h3').textContent = isNew ? 'Posible estrés hídrico leve' : 'Condiciones estables'
    aiDialog.querySelector('.ai-verdict p').textContent = isNew ? 'La humedad está por debajo del rango efectivo y la temperatura se acerca al máximo recomendado. El pH y las horas de luz son adecuados.' : 'Las medidas están dentro de los rangos efectivos. El tiempo desde el último riego todavía encaja en la pauta de la especie.'
    aiDialog.querySelector('.recommended-action strong').textContent = isNew ? 'Comprueba el sustrato a 3–4 cm y, si está completamente seco, riega 350–450 ml a primera hora. Mantén la exposición actual.' : 'Mantén la pauta actual y vuelve a revisar la humedad antes del próximo riego, dentro de 5–7 días.'
    aiDialog.querySelector('.ai-basis li:first-child').textContent = isNew ? 'Lectura del 3 sep 2026, 09:40' : 'Lectura del 21 ago 2026, 18:06'
    if (isNew) {
      const summary = document.querySelector('.ai-summary-card')
      const summaryRisk = summary.querySelector('.risk-badge')
      summaryRisk.textContent = 'Riesgo medio'
      summaryRisk.classList.remove('risk-badge--low')
      summaryRisk.classList.add('risk-badge--medium')
      summary.querySelector('h2').textContent = 'Posible estrés hídrico leve'
      summary.querySelector(':scope > p').textContent = 'La humedad está por debajo del rango efectivo y la temperatura se acerca al máximo recomendado.'
      summary.querySelector('.ai-action-summary strong').textContent = 'Comprobar el sustrato y valorar un riego de 350–450 ml.'
      summary.querySelector('footer > span').textContent = 'Basada en la lectura de ahora'
    }
    aiDialog.hidden = false
    window.setTimeout(() => document.getElementById('accept-ai-dialog').focus(), 0)
  }

  function closeAiDialog() {
    aiDialog.hidden = true
  }

  function updateCareRecordState() {
    const inputs = Array.from(careRecordForm.querySelectorAll('.measurement-input input'))
    const count = inputs.filter((input) => input.value !== '').length
    document.getElementById('care-record-state').textContent = count ? `${count} ${count === 1 ? 'valor preparado' : 'valores preparados'} · ninguno se guarda hasta confirmar.` : 'Introduce al menos una medición o una cantidad de riego.'
    document.getElementById('save-care-record').disabled = count === 0
  }

  function openTaskDialog(mode = 'new', source) {
    const isEdit = mode === 'edit'
    searchDialog.hidden = true
    careRecordDialog.hidden = true
    aiDialog.hidden = true
    const fromLocation = document.querySelector('[data-screen="location-detail"]').classList.contains('is-visible')
    const destination = taskForm.querySelector('.field-button')
    const sourceItem = source && source.closest('.agenda-item')
    const sourceText = source ? source.textContent.trim() : ''
    const sourceTitle = source && (sourceItem?.querySelector('h3')?.textContent || sourceText.replace(/^\d{2}:\d{2}\s*·\s*/, ''))
    const sourceType = sourceItem?.querySelector('.task-meta > span:first-child')?.textContent || sourceText
    const editType = sourceType.includes('Riego') ? 'Riego' : sourceType.includes('Poda') ? 'Poda de raíces' : sourceType.includes('Maceta') || sourceType.includes('Macetas') ? 'Cambio de maceta' : sourceType.includes('Sombreo') || sourceType.includes('Protección solar') ? 'Protección frente al sol intenso' : 'Otra'
    editingTaskSource = isEdit ? source : null
    taskForm.dataset.mode = mode
    document.getElementById('task-dialog-title').textContent = isEdit ? 'Editar tarea' : 'Nueva tarea'
    document.getElementById('task-submit').textContent = isEdit ? 'Guardar cambios' : 'Crear tarea'
    document.getElementById('task-dialog-impact').textContent = isEdit ? 'La actividad quedará registrada, pero todavía no contará como cuidado realizado.' : 'La tarea no registra un cuidado hasta que se complete.'
    document.getElementById('task-title-input').value = isEdit ? (sourceTitle || 'Revisar raíces antes del trasplante') : fromLocation ? 'Revisar Bancada norte' : 'Regar bandejas A3 y A4'
    taskForm.querySelectorAll('select')[0].value = isEdit ? editType : 'Riego'
    taskForm.querySelectorAll('select')[1].value = isEdit && sourceItem?.querySelector('.priority--high') ? 'Alta' : 'Normal'
    taskForm.querySelector('input[type="date"]').value = isEdit ? '2026-09-05' : '2026-09-03'
    taskForm.querySelector('input[type="time"]').value = isEdit ? '08:30' : '09:00'
    destination.querySelector('strong').textContent = isEdit ? (sourceItem?.querySelector('p')?.textContent || 'Destino y plantas de la tarea') : fromLocation ? 'Invernadero 1 / Bancada norte' : 'Invernadero 1 / Bandejas A3 y A4'
    destination.querySelector('small').textContent = isEdit ? 'El alcance se conserva aunque cambie la planificación' : fromLocation ? '183 plantas afectadas, incluidas sublocalizaciones' : '31 plantas afectadas'
    taskDialog.hidden = false
    window.setTimeout(() => taskDialog.querySelector('select').focus(), 0)
  }

  function closeTaskDialog() {
    taskDialog.hidden = true
  }

  function openMoveDialog() {
    moveDialog.hidden = false
    window.setTimeout(() => moveDialog.querySelector('input[type="search"]').focus(), 0)
  }

  function closeMoveDialog() {
    moveDialog.hidden = true
  }

  function normalizeTagName(value) {
    return value.trim().replace(/\s+/g, ' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  }

  function openTagDialog(mode) {
    const isRename = mode === 'rename'
    tagForm.dataset.mode = mode
    document.getElementById('tag-dialog-title').textContent = isRename ? 'Renombrar etiqueta' : 'Nueva etiqueta'
    document.getElementById('tag-name').value = isRename ? 'Globular' : ''
    document.getElementById('tag-dialog-impact').textContent = isRename ? 'El nuevo nombre se actualizará en 218 plantas.' : 'La nueva etiqueta estará disponible al editar cualquier planta.'
    updateTagPreview()
    tagDialog.hidden = false
    window.setTimeout(() => document.getElementById('tag-name').focus(), 0)
  }

  function closeTagDialog() {
    tagDialog.hidden = true
  }

  function openTagMergeDialog() {
    tagMergeDialog.hidden = false
    window.setTimeout(() => tagMergeDialog.querySelector('select').focus(), 0)
  }

  function closeTagMergeDialog() {
    tagMergeDialog.hidden = true
  }

  function updateTagPreview() {
    const name = document.getElementById('tag-name').value.trim() || 'Nueva etiqueta'
    document.getElementById('tag-preview').textContent = name
    document.getElementById('tag-normalized-preview').textContent = `Se guardará como “${normalizeTagName(name)}” para evitar duplicados.`
  }

  function openSpeciesEditor(mode) {
    const isNew = mode === 'new'
    const form = document.getElementById('species-form')
    form.dataset.mode = mode
    document.getElementById('species-editor-title').textContent = isNew ? 'Nueva especie' : 'Editar especie'
    document.getElementById('species-editor-crumb').textContent = isNew ? 'Nueva especie' : 'Echinocactus grusonii'
    document.getElementById('species-editor-impact').textContent = isNew
      ? 'El código de la especie se utilizará para generar los códigos de sus plantas.'
      : 'Los cambios afectarán a 21 plantas que heredan esta pauta.'
    document.getElementById('species-scientific-name').value = isNew ? '' : 'Echinocactus grusonii'
    document.getElementById('species-common-name').value = isNew ? '' : 'Asiento de suegra'
    const speciesCode = document.getElementById('species-code')
    speciesCode.value = isNew ? '' : 'CAT-GRUSS'
    speciesCode.readOnly = !isNew
    speciesCode.closest('.code-field').querySelector('small').textContent = isNew ? 'Se usará para generar los códigos de sus plantas.' : 'Código bloqueado porque la especie tiene 23 plantas asociadas.'
    document.getElementById('species-description').value = isNew ? '' : 'Cactus globular de crecimiento lento, reconocible por sus costillas marcadas y espinas doradas.'
    form.classList.toggle('is-new', isNew)
    document.getElementById('species-editor-cancel').dataset.page = isNew ? 'species' : 'species-detail'
    showPage('species-editor')
  }

  function openLocationEditor(mode) {
    const isEdit = mode === 'edit'
    const isChild = mode === 'child'
    document.getElementById('location-editor-title').textContent = isEdit ? 'Editar Bancada norte' : 'Nueva localización'
    document.getElementById('location-editor-crumb').textContent = isEdit ? 'Editar Bancada norte' : 'Nueva localización'
    document.getElementById('location-editor-subtitle').textContent = isEdit ? 'Actualiza su posición o características sin perder el historial asociado.' : 'Sitúala dentro del vivero para que plantas, tareas y alertas hereden una ruta clara.'
    document.getElementById('location-parent-name').textContent = isEdit || isChild ? 'Invernadero 1' : 'Toda la colección'
    document.getElementById('location-name').value = isEdit ? 'Bancada norte' : isChild ? 'Nueva bandeja' : 'Bancada este'
    const locationCode = document.getElementById('location-code')
    const codePrefix = isEdit || isChild ? 'LOC-I1-' : 'LOC-'
    locationCode.value = isEdit ? 'BN' : isChild ? 'A5' : 'BE'
    locationCode.dataset.prefix = codePrefix
    document.getElementById('location-code-preview').textContent = `Ruta técnica prevista: ${codePrefix}${locationCode.value}`
    document.getElementById('location-capacity').value = isEdit ? '250' : isChild ? '60' : '180'
    document.getElementById('location-description').value = isEdit ? 'Bancada norte, junto al lateral con malla fija de sombreo.' : isChild ? 'Bandeja dentro de la bancada norte.' : 'Bancada junto a la entrada este, segunda desde el pasillo central.'
    document.getElementById('location-path-preview').textContent = isEdit ? 'Bancada norte' : isChild ? 'Nueva bandeja' : 'Bancada este'
    document.getElementById('location-editor-impact-title').textContent = isEdit ? 'Esta ubicación contiene 183 plantas' : `Se creará dentro de ${isChild ? 'Bancada norte' : 'Toda la colección'}`
    document.getElementById('location-editor-impact').textContent = isEdit ? 'Los cambios de nombre o de padre actualizarán su ruta en plantas, tareas e historial.' : 'Podrás mover plantas aquí después de guardar la localización.'
    document.getElementById('location-editor-footer').textContent = isEdit ? 'Los movimientos de ubicación conservarán su historial.' : 'La nueva localización estará vacía.'
    document.getElementById('location-editor-cancel').dataset.page = isEdit ? 'location-detail' : 'locations'
    showPage('location-editor')
  }

  function openSoilEditor(mode) {
    const isNew = mode === 'new'
    document.getElementById('soil-form').dataset.mode = mode
    document.getElementById('soil-mix-editor-title').textContent = isNew ? 'Nueva mezcla' : 'Editar Mineral drenante'
    document.getElementById('soil-mix-editor-crumb').textContent = isNew ? 'Nueva mezcla' : 'Editar Mineral drenante'
    document.getElementById('soil-name').value = isNew ? '' : 'Mineral drenante'
    document.getElementById('soil-description').value = isNew ? '' : 'Pauta base para cactus de clima seco que necesitan evacuación rápida del agua y baja retención.'
    document.getElementById('soil-organic').value = '20'
    document.getElementById('soil-mineral').value = '80'
    document.getElementById('soil-ph-min').value = '5.8'
    document.getElementById('soil-ph-max').value = '6.8'
    document.getElementById('soil-editor-impact').textContent = isNew ? 'La nueva mezcla estará disponible en el catálogo.' : 'Los cambios afectarán a la recomendación de 42 especies y 612 plantas.'
    document.getElementById('soil-editor-cancel').dataset.page = isNew ? 'soil-mixes' : 'soil-mix-detail'
    validateSoilForm()
    showPage('soil-mix-editor')
  }

  function setImportStage(stage) {
    document.querySelectorAll('[data-import-stage]').forEach((panel) => panel.classList.toggle('is-visible', panel.dataset.importStage === stage))
    const activeStep = stage === 'upload' ? 1 : stage === 'review' ? 2 : 3
    document.querySelectorAll('[data-import-step-indicator]').forEach((step) => {
      const stepNumber = Number(step.dataset.importStepIndicator)
      step.classList.toggle('is-current', stepNumber === activeStep)
      step.classList.toggle('is-done', stepNumber < activeStep || stage === 'complete')
    })
    if (stage === 'upload') {
      const summary = document.querySelector('.validation-summary')
      summary.children[0].querySelector('strong').textContent = '231'
      summary.children[1].querySelector('strong').textContent = '12'
      summary.children[2].querySelector('strong').textContent = '5'
      const blocker = document.querySelector('.import-blocker')
      blocker.classList.remove('is-fixed')
      blocker.children[0].textContent = '!'
      blocker.querySelector('strong').textContent = 'Corrige 5 filas antes de continuar'
      blocker.querySelector('small').textContent = 'Puedes descargar solo los errores y volver a cargar el archivo corregido.'
      blocker.querySelector('button').hidden = false
      document.getElementById('import-ready-copy').textContent = '5 errores bloquean la importación.'
      document.getElementById('apply-import').disabled = true
    }
  }

  function updateSettingsCodePreview() {
    const prefix = document.getElementById('settings-prefix').value.trim().toUpperCase() || 'CAT'
    const separator = document.getElementById('settings-separator').value
    const digits = Number(document.getElementById('settings-digits').value)
    document.getElementById('settings-code-preview').textContent = `${prefix}${separator}GRUSS${separator}${String(1).padStart(digits, '0')}`
  }

  function openPlantEditor(mode = 'new') {
    const isEdit = mode !== 'new'
    const code = isEdit ? 'CAT-GRUSS-01' : 'CAT-GRUSS-24'
    const form = document.getElementById('plant-form')
    form.dataset.mode = mode
    document.getElementById('plant-create-title').textContent = isEdit ? `Editar ${code}` : 'Añadir planta'
    document.getElementById('plant-editor-crumb').textContent = isEdit ? code : 'Añadir planta'
    document.getElementById('plant-editor-intro').textContent = isEdit ? 'Actualiza los datos propios del ejemplar sin alterar su historial ni regenerar su código.' : 'Registra un ejemplar y deja preparado su seguimiento desde el primer día.'
    document.getElementById('plant-code-preview').textContent = code
    document.getElementById('plant-code-field').textContent = code
    updatePlantSpecies(document.querySelector('[data-plant-species]'))
    document.getElementById('plant-nickname').value = isEdit ? 'Asiento de suegra' : 'Grusonii nuevo'
    document.getElementById('plant-state-label').textContent = isEdit ? 'Estado' : 'Estado inicial'
    document.getElementById('plant-photos-legend').textContent = isEdit ? 'Fotografías' : 'Fotografías iniciales'
    document.getElementById('plant-photos-copy').textContent = isEdit ? 'Añade nuevas imágenes, cambia la principal o conserva el archivo visual del ejemplar.' : 'Son opcionales. Si las añades ahora, la principal identificará la planta en el inventario.'
    document.querySelector('.generated-code-block > div:nth-child(2) > p').textContent = isEdit ? 'El código está bloqueado porque identifica físicamente este ejemplar y enlaza todo su historial.' : 'Se asignará al guardar usando el siguiente número disponible. No volverá a utilizarse, aunque la planta se archive.'
    document.querySelector('.locked-code small').textContent = isEdit ? 'Código permanente' : 'Generado automáticamente'
    document.getElementById('plant-editor-impact').innerHTML = isEdit ? `<strong>${code}</strong> conservará su código y todo su historial.` : `<strong>${code}</strong> se asignará definitivamente al guardar.`
    document.getElementById('plant-editor-cancel').dataset.page = isEdit ? 'plant-detail' : 'plants'
    document.getElementById('plant-save-another').hidden = isEdit
    document.getElementById('plant-save-primary').textContent = isEdit ? 'Guardar cambios' : 'Guardar y abrir ficha'
    document.querySelectorAll('[data-plant-editor-section]').forEach((button, index) => button.classList.toggle('is-active', mode === 'care' ? button.dataset.plantEditorSection === 'plant-care' : index === 0))
    showPage('plant-create')
    document.title = isEdit ? `Cactify — Editar ${code}` : 'Cactify — Añadir planta'
    if (mode === 'care') window.setTimeout(() => document.getElementById('plant-editor-plant-care').scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
  }

  prototype.addEventListener('click', (event) => {
    const pageControl = event.target.closest('[data-page]')
    if (pageControl) showPage(pageControl.dataset.page)

    if (event.target.closest('[data-open-task]')) openTaskDialog('new')
    if (event.target.closest('[data-open-care-record]')) openCareRecordDialog()
    const aiControl = event.target.closest('[data-open-ai]')
    if (aiControl) {
      if (aiControl.classList.contains('ai-inline-result--pending')) {
        aiControl.classList.remove('ai-inline-result--pending')
        aiControl.querySelector('small').textContent = 'Recomendación de IA · riesgo medio'
        aiControl.querySelector('strong').textContent = 'Posible estrés hídrico leve; conviene comprobar el sustrato.'
        aiControl.querySelector('b').textContent = 'Ver análisis'
      }
      openAiDialog(aiControl.dataset.aiVariant || 'existing')
    }
    if (event.target.closest('[data-open-task-from-ai]')) {
      closeAiDialog()
      openTaskDialog('new')
      document.getElementById('task-title-input').value = 'Comprobar sustrato y valorar riego'
      taskForm.querySelectorAll('select')[0].value = 'Riego'
      document.getElementById('task-dialog-impact').textContent = 'Creada desde la recomendación de la lectura del 3 sep 2026.'
    }
    const taskEditControl = event.target.closest('[data-open-task-edit]')
    if (taskEditControl) openTaskDialog('edit', taskEditControl)
    if (event.target.closest('[data-open-move]')) openMoveDialog()
    const plantEditorControl = event.target.closest('[data-open-plant-editor]')
    if (plantEditorControl) openPlantEditor(plantEditorControl.dataset.openPlantEditor)
    const speciesEditorControl = event.target.closest('[data-open-species-editor]')
    if (speciesEditorControl) openSpeciesEditor(speciesEditorControl.dataset.openSpeciesEditor)
    const locationEditorControl = event.target.closest('[data-open-location-editor]')
    if (locationEditorControl) openLocationEditor(locationEditorControl.dataset.openLocationEditor)
    const soilEditorControl = event.target.closest('[data-open-soil-editor]')
    if (soilEditorControl) openSoilEditor(soilEditorControl.dataset.openSoilEditor)
    const tagDialogControl = event.target.closest('[data-open-tag-dialog]')
    if (tagDialogControl) openTagDialog(tagDialogControl.dataset.openTagDialog)
    if (event.target.closest('[data-open-tag-merge]')) openTagMergeDialog()
    if (event.target.closest('[data-close-search]')) searchDialog.hidden = true

    if (event.target.closest('[data-demo-import]')) setImportStage('review')
    if (event.target.closest('[data-reset-import]')) setImportStage('upload')
    if (event.target.closest('[data-fix-import]')) {
      const summary = document.querySelector('.validation-summary')
      summary.children[0].querySelector('strong').textContent = '236'
      summary.children[1].querySelector('strong').textContent = '12'
      summary.children[2].querySelector('strong').textContent = '0'
      const blocker = document.querySelector('.import-blocker')
      blocker.classList.add('is-fixed')
      blocker.children[0].textContent = '✓'
      blocker.querySelector('strong').textContent = 'Archivo listo para importar'
      blocker.querySelector('small').textContent = 'Los 5 errores se han corregido; conserva los 12 avisos para revisión posterior.'
      blocker.querySelector('button').hidden = true
      document.getElementById('import-ready-copy').textContent = '248 filas preparadas; 12 incluyen avisos.'
      document.getElementById('apply-import').disabled = false
      showToast('Validación completada sin errores bloqueantes')
    }
    if (event.target.closest('#apply-import')) {
      setImportStage('complete')
      showToast('248 plantas importadas')
    }
    if (event.target.closest('[data-download-template]')) showToast('Plantilla plantas.csv preparada')
    if (event.target.closest('[data-download-errors]')) showToast('errores-importacion.csv preparado')
    if (event.target.closest('[data-download-last], [data-download-export]')) showToast('Descarga preparada')
    if (event.target.closest('[data-test-ai]')) showToast('Conexión verificada correctamente')

    const locationSummaryControl = event.target.closest('[data-location-summary]')
    if (locationSummaryControl) {
      const summaries = {
        all: ['Toda la colección', 'El trabajo se concentra en los dos invernaderos. La zona exterior está al día.'],
        'greenhouse-1': ['Invernadero 1', '486 plantas repartidas en dos bancadas y seis zonas de trabajo.'],
        outside: ['Zona exterior', '407 plantas en cuatro mesas. No hay alertas abiertas en esta zona.']
      }
      const summary = summaries[locationSummaryControl.dataset.locationSummary]
      document.getElementById('location-overview-title').textContent = summary[0]
      document.getElementById('location-overview-copy').textContent = summary[1]
      document.querySelectorAll('[data-location-summary]').forEach((candidate) => candidate.classList.toggle('is-selected', candidate === locationSummaryControl))
    }

    const completeButton = event.target.closest('[data-complete-task]')
    if (completeButton) {
      const task = completeButton.closest('.task-row, .agenda-item')
      const completed = task.classList.toggle('is-complete')
      completeButton.textContent = completed ? '✓' : '○'
      completeButton.setAttribute('aria-label', completed ? 'Reabrir tarea' : 'Completar tarea')
      showToast(completed ? 'Tarea completada y cuidado preparado para el historial' : 'Tarea reabierta')
    }
  })

  document.querySelectorAll('[data-settings-panel]').forEach((panelButton) => {
    panelButton.addEventListener('click', () => {
      document.querySelectorAll('[data-settings-panel]').forEach((candidate) => candidate.classList.toggle('is-active', candidate === panelButton))
      document.querySelectorAll('[data-settings-content]').forEach((panel) => panel.classList.toggle('is-visible', panel.dataset.settingsContent === panelButton.dataset.settingsPanel))
    })
  })

  document.getElementById('export-form').addEventListener('change', (event) => {
    const content = document.querySelector('[name="export-content"]:checked').value
    const estimates = {
      'Inventario completo': '4,8 MB · 1.284 plantas',
      'Plantas filtradas': '620 KB · 86 plantas',
      'Etiquetas físicas': '54 hojas A4 · 1.284 etiquetas'
    }
    document.getElementById('export-estimate').textContent = estimates[content]
    if (event.target.value === 'Etiquetas físicas') document.getElementById('export-format').value = 'PDF · etiquetas para imprimir'
  })

  document.getElementById('export-form').addEventListener('submit', (event) => {
    event.preventDefault()
    const content = document.querySelector('[name="export-content"]:checked').value
    const format = document.getElementById('export-format').value
    const extension = format.startsWith('PDF') ? 'pdf' : format.startsWith('XLSX') ? 'xlsx' : 'csv'
    const slug = content === 'Etiquetas físicas' ? 'etiquetas' : content === 'Plantas filtradas' ? 'seleccion' : 'inventario'
    document.getElementById('export-file-name').textContent = `cactify-${slug}-2026-09-03.${extension}`
    document.getElementById('export-result').hidden = false
    showToast('Exportación generada')
  })

  const settingsForm = document.getElementById('settings-form')
  settingsForm.addEventListener('input', (event) => {
    document.getElementById('settings-state').textContent = 'Cambios sin guardar'
    if (['settings-prefix', 'settings-digits', 'settings-separator'].includes(event.target.id)) updateSettingsCodePreview()
  })
  settingsForm.addEventListener('change', () => {
    document.getElementById('settings-state').textContent = 'Cambios sin guardar'
  })
  settingsForm.addEventListener('submit', (event) => {
    event.preventDefault()
    document.getElementById('settings-state').textContent = 'Todos los cambios guardados'
    showToast('Configuración guardada')
  })

  document.querySelectorAll('[data-task-view]').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('[data-task-view]').forEach((candidate) => candidate.classList.toggle('is-active', candidate === tab))
      document.querySelectorAll('[data-task-panel]').forEach((panel) => panel.classList.toggle('is-visible', panel.dataset.taskPanel === tab.dataset.taskView))
    })
  })

  document.querySelectorAll('[data-species-group]').forEach((groupButton) => {
    groupButton.addEventListener('click', () => {
      const group = groupButton.dataset.speciesGroup
      const label = groupButton.querySelector('strong').textContent
      const expectedCount = groupButton.querySelector('small').textContent
      document.querySelectorAll('[data-species-group]').forEach((candidate) => candidate.classList.toggle('is-selected', candidate === groupButton))
      document.querySelectorAll('.species-table tbody tr').forEach((row) => {
        row.hidden = group !== 'all' && !row.dataset.groups.split(' ').includes(group)
      })
      document.getElementById('species-filter-note').textContent = group === 'all' ? 'Mostrando las 74 especies' : `Grupo «${label}»: ${expectedCount}`
    })
  })

  document.querySelectorAll('[data-editor-section]').forEach((sectionButton) => {
    sectionButton.addEventListener('click', () => {
      document.querySelectorAll('[data-editor-section]').forEach((candidate) => candidate.classList.toggle('is-active', candidate === sectionButton))
      document.getElementById(`editor-${sectionButton.dataset.editorSection}`).scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  })

  document.querySelectorAll('[data-plant-editor-section]').forEach((sectionButton) => {
    sectionButton.addEventListener('click', () => {
      document.querySelectorAll('[data-plant-editor-section]').forEach((candidate) => candidate.classList.toggle('is-active', candidate === sectionButton))
      document.getElementById(`plant-editor-${sectionButton.dataset.plantEditorSection}`).scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  })

  document.querySelectorAll('[data-soil-editor-section]').forEach((sectionButton) => {
    sectionButton.addEventListener('click', () => {
      document.querySelectorAll('[data-soil-editor-section]').forEach((candidate) => candidate.classList.toggle('is-active', candidate === sectionButton))
      document.getElementById(`soil-editor-${sectionButton.dataset.soilEditorSection}`).scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  })

  document.querySelectorAll('.month-selector button').forEach((monthButton) => {
    monthButton.addEventListener('click', () => {
      monthButton.classList.toggle('is-selected')
      if (monthButton.closest('[data-month-group="flowering"]')) monthButton.classList.toggle('is-flower', monthButton.classList.contains('is-selected'))
    })
  })

  function updatePlantSpecies(option) {
    const careProfiles = {
      'CAT-GRUSS-24': ['Pleno sol', '8–35 °C', 'Cada 15–25 días', 'Mineral drenante'],
      'CAT-ASTRO-18': ['Semisombra', '10–32 °C', 'Cada 12–20 días', 'Mineral fino']
    }
    const careProfile = careProfiles[option.dataset.code]
    document.querySelectorAll('[data-plant-species]').forEach((candidate) => {
      const selected = candidate === option
      candidate.classList.toggle('is-selected', selected)
      candidate.setAttribute('aria-checked', String(selected))
    })
    const isEdit = document.getElementById('plant-form').dataset.mode !== 'new'
    const effectiveCode = isEdit ? document.getElementById('plant-code-field').textContent : option.dataset.code
    document.getElementById('plant-code-preview').textContent = effectiveCode
    document.getElementById('plant-code-field').textContent = effectiveCode
    document.getElementById('plant-species-preview').textContent = option.dataset.scientific
    document.getElementById('care-species-name').innerHTML = `<em>${option.dataset.scientific}</em>`
    document.querySelectorAll('.inherited-care-summary dd').forEach((value, index) => { value.textContent = careProfile[index] })
    const careThumb = document.querySelector('.inherited-care-summary .species-thumb')
    careThumb.classList.toggle('species-thumb--astro', option.dataset.code.startsWith('CAT-ASTRO'))
    careThumb.textContent = option.dataset.code.startsWith('CAT-ASTRO') ? '✣' : '✺'
    document.querySelector('.plant-editor-actions > span strong').textContent = effectiveCode
    document.querySelector('.location-compatibility em').textContent = option.dataset.scientific
  }

  document.querySelectorAll('[data-plant-species]').forEach((option) => {
    option.addEventListener('click', () => updatePlantSpecies(option))
  })

  document.getElementById('year-only').addEventListener('change', (event) => {
    const month = document.getElementById('plant-germination-month')
    month.disabled = event.target.checked
    month.closest('label').classList.toggle('is-disabled', event.target.checked)
  })

  document.getElementById('care-override-toggle').addEventListener('click', (event) => {
    const button = event.currentTarget
    const enabled = button.getAttribute('aria-checked') !== 'true'
    button.setAttribute('aria-checked', String(enabled))
    document.getElementById('plant-overrides').hidden = !enabled
  })

  document.querySelectorAll('.override-row label input').forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      const control = checkbox.closest('.override-row').querySelector(':scope > select, :scope > input, .unit-input input')
      control.disabled = !checkbox.checked
    })
  })

  document.querySelector('[data-add-plant-photos]').addEventListener('click', () => {
    const drop = document.getElementById('plant-photo-drop')
    drop.classList.add('has-photos')
    drop.querySelector('strong').textContent = '2 fotografías preparadas'
    drop.querySelector('small').textContent = 'La primera se utilizará como imagen principal.'
    showToast('Fotografías añadidas al borrador')
  })

  function updateSelection() {
    const selectors = Array.from(document.querySelectorAll('.inventory-table tbody .row-selector'))
    const count = selectors.filter((selector) => selector.checked).length
    document.getElementById('selected-count').textContent = String(count)
    document.getElementById('selection-bar').classList.toggle('is-visible', count > 0)
  }

  document.querySelectorAll('.inventory-table .row-selector').forEach((selector, index) => {
    selector.addEventListener('change', () => {
      if (index === 0) {
        document.querySelectorAll('.inventory-table tbody .row-selector').forEach((rowSelector) => {
          rowSelector.checked = selector.checked
        })
      }
      updateSelection()
    })
  })

  function updateTagSelection() {
    const selectors = Array.from(document.querySelectorAll('.tag-table tbody .tag-selector'))
    const count = selectors.filter((selector) => selector.checked).length
    document.getElementById('tag-selected-count').textContent = String(count)
    document.getElementById('tag-selection-bar').classList.toggle('is-visible', count > 0)
  }

  document.querySelectorAll('.tag-table .tag-selector').forEach((selector, index) => {
    selector.addEventListener('change', () => {
      if (index === 0) {
        document.querySelectorAll('.tag-table tbody .tag-selector').forEach((rowSelector) => { rowSelector.checked = selector.checked })
      }
      updateTagSelection()
    })
  })

  menuButton.addEventListener('click', openSidebar)
  sidebarClose.addEventListener('click', closeSidebar)
  sidebarScrim.addEventListener('click', closeSidebar)
  searchButton.addEventListener('click', openSearch)

  searchDialog.addEventListener('click', (event) => {
    if (event.target === searchDialog) closeSearch()
  })

  taskDialog.addEventListener('click', (event) => {
    if (event.target === taskDialog) closeTaskDialog()
  })

  careRecordDialog.addEventListener('click', (event) => {
    if (event.target === careRecordDialog) closeCareRecordDialog()
  })

  aiDialog.addEventListener('click', (event) => {
    if (event.target === aiDialog) closeAiDialog()
  })

  tagDialog.addEventListener('click', (event) => {
    if (event.target === tagDialog) closeTagDialog()
  })

  tagMergeDialog.addEventListener('click', (event) => {
    if (event.target === tagMergeDialog) closeTagMergeDialog()
  })

  document.getElementById('close-task-dialog').addEventListener('click', closeTaskDialog)
  document.getElementById('cancel-task').addEventListener('click', closeTaskDialog)
  document.getElementById('close-care-record').addEventListener('click', closeCareRecordDialog)
  document.getElementById('cancel-care-record').addEventListener('click', closeCareRecordDialog)
  document.getElementById('close-ai-dialog').addEventListener('click', closeAiDialog)
  document.getElementById('accept-ai-dialog').addEventListener('click', closeAiDialog)
  document.getElementById('close-move-dialog').addEventListener('click', closeMoveDialog)
  document.getElementById('cancel-move').addEventListener('click', closeMoveDialog)
  document.getElementById('close-tag-dialog').addEventListener('click', closeTagDialog)
  document.getElementById('cancel-tag').addEventListener('click', closeTagDialog)
  document.getElementById('close-tag-merge').addEventListener('click', closeTagMergeDialog)
  document.getElementById('cancel-tag-merge').addEventListener('click', closeTagMergeDialog)
  document.getElementById('tag-name').addEventListener('input', updateTagPreview)

  careRecordForm.querySelectorAll('.measurement-input input').forEach((input) => input.addEventListener('input', updateCareRecordState))

  moveDialog.addEventListener('click', (event) => {
    if (event.target === moveDialog) closeMoveDialog()
  })

  document.querySelectorAll('[data-destination]').forEach((destination) => {
    destination.addEventListener('change', () => {
      document.getElementById('move-destination-label').textContent = destination.dataset.destination
    })
  })

  document.getElementById('location-name').addEventListener('input', (event) => {
    document.getElementById('location-path-preview').textContent = event.target.value || 'Nueva localización'
  })

  document.getElementById('location-code').addEventListener('input', (event) => {
    document.getElementById('location-code-preview').textContent = `Ruta técnica prevista: ${event.target.dataset.prefix || 'LOC-'}${event.target.value.toUpperCase() || '…'}`
  })

  function validateSoilForm() {
    const organic = Number(document.getElementById('soil-organic').value)
    const mineral = Number(document.getElementById('soil-mineral').value)
    const phMin = Number(document.getElementById('soil-ph-min').value)
    const phMax = Number(document.getElementById('soil-ph-max').value)
    const total = organic + mineral
    const compositionValid = organic >= 0 && organic <= 100 && mineral >= 0 && mineral <= 100 && total === 100
    const phValid = phMin >= 0 && phMax <= 14 && phMin <= phMax
    const compositionState = document.getElementById('soil-composition-state')
    const totalState = document.getElementById('soil-total')
    const phState = document.getElementById('soil-ph-state')
    document.getElementById('soil-wheel-organic').textContent = String(organic)
    document.getElementById('soil-wheel-mineral').textContent = String(mineral)
    document.getElementById('soil-wheel-preview').style.background = `conic-gradient(#71877e 0 ${Math.max(0, Math.min(100, mineral))}%, #aa8a62 ${Math.max(0, Math.min(100, mineral))}% 100%)`
    compositionState.querySelector('strong').textContent = compositionValid ? 'Composición válida' : 'La receta debe sumar 100%'
    compositionState.querySelector('small').textContent = `${organic}% orgánico + ${mineral}% mineral = ${total}%`
    compositionState.classList.toggle('is-invalid', !compositionValid)
    totalState.textContent = `${total}%`
    totalState.classList.toggle('is-invalid', !compositionValid)
    phState.textContent = phValid ? `Rango válido · ${phMax < 6.5 ? 'ácido' : phMin > 7 ? 'alcalino' : 'cercano a neutro'}` : 'El pH mínimo no puede superar al máximo'
    phState.classList.toggle('is-invalid', !phValid)
    document.getElementById('soil-save').disabled = !(compositionValid && phValid)
    return compositionValid && phValid
  }

  ;['soil-organic', 'soil-mineral', 'soil-ph-min', 'soil-ph-max'].forEach((id) => {
    document.getElementById(id).addEventListener('input', validateSoilForm)
  })

  function escapeHtml(value) {
    return value.replace(/[&<>"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[character])
  }

  careRecordForm.addEventListener('submit', (event) => {
    event.preventDefault()
    const value = (id, suffix = '') => {
      const raw = document.getElementById(id).value
      return raw === '' ? '—' : `${raw.replace('.', ',')}${suffix}`
    }
    const humidity = value('care-humidity', '%')
    const temperature = value('care-temperature', ' °C')
    const light = value('care-light', ' h')
    const ph = value('care-ph')
    const water = value('care-water', ' ml')
    const note = escapeHtml(document.getElementById('care-note').value.trim() || 'Lectura manual de seguimiento.')
    const generateAi = document.getElementById('care-generate-ai').checked
    const timelineEvent = document.createElement('article')
    timelineEvent.className = 'timeline-event timeline-event--reading'
    timelineEvent.innerHTML = `<div class="timeline-mark timeline-mark--reading">∿</div><div class="event-card"><header><div><span class="event-type">Lectura de cultivo</span><h3>${note}</h3></div><time>3 sep 2026 · 09:40</time></header><div class="reading-values"><span><small>Humedad</small><strong>${humidity}</strong></span><span><small>Temperatura</small><strong>${temperature}</strong></span><span><small>Luz</small><strong>${light}</strong></span><span><small>pH</small><strong>${ph}</strong></span><span><small>Riego</small><strong>${water}</strong></span></div>${generateAi ? '<button class="ai-inline-result" type="button" data-open-ai data-ai-variant="new"><span>✦</span><span><small>Recomendación de IA · riesgo medio</small><strong>Posible estrés hídrico leve; conviene comprobar el sustrato.</strong></span><b>Ver análisis</b></button>' : '<button class="ai-inline-result ai-inline-result--pending" type="button" data-open-ai data-ai-variant="new"><span>✦</span><span><small>Sin recomendación</small><strong>Genera un análisis usando esta lectura y los rangos efectivos.</strong></span><b>Generar</b></button>'}</div>`
    document.querySelector('.timeline').prepend(timelineEvent)
    document.querySelector('.state-grid > div:nth-child(3) strong').textContent = `${temperature} · ${humidity}`
    document.querySelector('.state-grid > div:nth-child(3) small').textContent = 'Ahora'
    if (water !== '—') {
      document.querySelector('.state-grid > div:first-child strong').textContent = `Ahora · ${water}`
      document.querySelector('.state-grid > div:first-child small').textContent = 'Registrado manualmente'
    }
    closeCareRecordDialog()
    showToast('Lectura guardada en el historial')
    if (generateAi) openAiDialog('new')
  })

  taskForm.addEventListener('submit', (event) => {
    event.preventDefault()
    const isEdit = event.currentTarget.dataset.mode === 'edit'
    if (isEdit && editingTaskSource) {
      const item = editingTaskSource.closest('.agenda-item')
      if (item) {
        item.querySelector('h3').textContent = document.getElementById('task-title-input').value
        const time = item.querySelector('time')
        time.querySelector('strong').textContent = taskForm.querySelector('input[type="time"]').value || 'Flexible'
        time.querySelector('small').textContent = '5 sep'
      } else {
        editingTaskSource.textContent = document.getElementById('task-title-input').value
      }
    }
    closeTaskDialog()
    showPage('tasks')
    showToast(isEdit ? 'Tarea actualizada' : 'Tarea creada para 31 plantas')
  })

  document.getElementById('species-form').addEventListener('submit', (event) => {
    event.preventDefault()
    showPage('species-detail')
    showToast('Especie guardada')
  })

  document.getElementById('plant-form').addEventListener('submit', (event) => {
    event.preventDefault()
    const isEdit = event.currentTarget.dataset.mode !== 'new'
    const code = document.getElementById('plant-code-field').textContent
    const selectedSpecies = document.querySelector('[data-plant-species].is-selected')
    const nickname = document.getElementById('plant-nickname').value || selectedSpecies.dataset.common
    if (!isEdit && event.submitter && event.submitter.value === 'another') {
      const nextCode = code.replace(/(\d+)$/, (number) => String(Number(number) + 1).padStart(number.length, '0'))
      document.getElementById('plant-nickname').value = ''
      document.getElementById('plant-code-preview').textContent = nextCode
      document.getElementById('plant-code-field').textContent = nextCode
      document.querySelector('.plant-editor-actions > span strong').textContent = nextCode
      window.scrollTo({ top: 0, behavior: 'auto' })
      showToast(`${code} guardada. Puedes registrar el siguiente ejemplar.`)
      return
    }
    const detail = document.querySelector('[data-screen="plant-detail"]')
    detail.querySelector('.specimen-identity code').textContent = code
    detail.querySelector('.breadcrumbs li[aria-current="page"]').textContent = code
    document.getElementById('plant-title').textContent = nickname
    detail.querySelector('.specimen-identity > p').innerHTML = `<em>${selectedSpecies.dataset.scientific}</em> · Invernadero 1 / Bancada norte / A3`
    showPage('plant-detail')
    document.title = `Cactify — ${code}`
    showToast(isEdit ? `${code} actualizada` : `${code} guardada`)
  })

  document.getElementById('location-form').addEventListener('submit', (event) => {
    event.preventDefault()
    showPage('location-detail')
    showToast('Localización guardada')
  })

  document.getElementById('soil-form').addEventListener('submit', (event) => {
    event.preventDefault()
    if (!validateSoilForm()) return
    const name = document.getElementById('soil-name').value
    const description = document.getElementById('soil-description').value
    const organic = Number(document.getElementById('soil-organic').value)
    const mineral = Number(document.getElementById('soil-mineral').value)
    const phMin = document.getElementById('soil-ph-min').value.replace('.', ',')
    const phMax = document.getElementById('soil-ph-max').value.replace('.', ',')
    const detail = document.querySelector('[data-screen="soil-mix-detail"]')
    const isNew = event.currentTarget.dataset.mode === 'new'
    document.getElementById('soil-mix-detail-title').textContent = name
    detail.querySelector('.breadcrumbs li[aria-current="page"]').textContent = name
    detail.querySelector('.soil-hero > div:nth-child(2) > p').textContent = description
    detail.querySelector('.soil-wheel').style.background = `conic-gradient(#71877e 0 ${mineral}%, #aa8a62 ${mineral}% 100%)`
    detail.querySelector('.soil-wheel > span').innerHTML = `${organic}<small>/${mineral}</small>`
    const recipeParts = detail.querySelectorAll('.recipe-bar > *')
    recipeParts[0].style.width = `${organic}%`
    recipeParts[0].querySelector('strong').textContent = `${organic}%`
    recipeParts[1].style.width = `${mineral}%`
    recipeParts[1].querySelector('strong').textContent = `${mineral}%`
    const facts = detail.querySelectorAll('.soil-facts dd')
    ;[`${organic}%`, `${mineral}%`, phMin, phMax].forEach((value, index) => { facts[index].textContent = value })
    detail.querySelector('.soil-property-grid strong').textContent = `${phMin}–${phMax}`
    if (isNew) {
      const status = detail.querySelector('.soil-hero .status')
      status.textContent = 'Sin asignar'
      status.classList.remove('status--ok')
      status.classList.add('status--warning')
      detail.querySelectorAll('.soil-use-line strong').forEach((count) => { count.textContent = '0' })
      detail.querySelector('.soil-species-usage .section-heading p').textContent = 'Todavía no hay especies ni plantas asociadas.'
      detail.querySelectorAll('.soil-species-usage .related-plant-row').forEach((row) => { row.hidden = true })
      detail.querySelector('.soil-empty-usage').hidden = false
      detail.querySelector('.soil-impact p').textContent = 'Esta receta todavía no afecta a ninguna especie ni planta.'
    }
    showPage('soil-mix-detail')
    document.title = `Cactify — ${name}`
    showToast(`Mezcla «${name}» guardada`)
  })

  moveForm.addEventListener('submit', (event) => {
    event.preventDefault()
    const destination = document.getElementById('move-destination-label').textContent
    closeMoveDialog()
    showToast(`31 plantas movidas a ${destination}`)
  })

  tagForm.addEventListener('submit', (event) => {
    event.preventDefault()
    const name = document.getElementById('tag-name').value.trim()
    const normalized = normalizeTagName(name)
    const isRename = event.currentTarget.dataset.mode === 'rename'
    closeTagDialog()
    if (isRename) {
      document.getElementById('tag-detail-title').textContent = name
      const detail = document.querySelector('[data-screen="tag-detail"]')
      detail.querySelector('.breadcrumbs li[aria-current="page"]').textContent = name
      detail.querySelector('.tag-normalized').textContent = `Nombre normalizado: ${normalized}`
      detail.querySelector('.tag-facts dd').textContent = name
      detail.querySelector('.tag-facts code').textContent = normalized
      showPage('tag-detail')
      document.title = `Cactify — ${name}`
      showToast(`Etiqueta renombrada como «${name}»`)
      return
    }
    showPage('tags')
    showToast(`Etiqueta «${name}» creada`)
  })

  tagMergeForm.addEventListener('submit', (event) => {
    event.preventDefault()
    closeTagMergeDialog()
    const duplicateRow = document.querySelector('.tag-row--duplicate')
    if (duplicateRow) duplicateRow.hidden = true
    document.querySelector('#tags-title .heading-count').textContent = '12'
    const tagsNavCount = document.querySelector('.nav-item[data-page="tags"] small')
    if (tagsNavCount) tagsNavCount.textContent = '12'
    const tagsFooterCount = document.querySelector('[data-screen="tags"] .table-footer > span')
    if (tagsFooterCount) tagsFooterCount.textContent = '1–6 de 12 etiquetas'
    const duplicateCallout = document.querySelector('.tag-duplicate-callout')
    if (duplicateCallout) {
      duplicateCallout.disabled = true
      duplicateCallout.removeAttribute('data-open-tag-merge')
      duplicateCallout.children[0].textContent = '0'
      duplicateCallout.querySelector('strong').textContent = 'Sin duplicados pendientes'
      duplicateCallout.querySelector('small').textContent = 'Catálogo revisado'
    }
    showPage('tags')
    showToast('Etiquetas combinadas en «Semillero propio»')
  })

  document.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault()
      openSearch()
    }
    if (event.key === 'Escape') {
      if (!aiDialog.hidden) closeAiDialog()
      else if (!careRecordDialog.hidden) closeCareRecordDialog()
      else if (!tagMergeDialog.hidden) closeTagMergeDialog()
      else if (!tagDialog.hidden) closeTagDialog()
      else if (!moveDialog.hidden) closeMoveDialog()
      else if (!taskDialog.hidden) closeTaskDialog()
      else if (!searchDialog.hidden) closeSearch()
      else closeSidebar()
    }
  })
})()
