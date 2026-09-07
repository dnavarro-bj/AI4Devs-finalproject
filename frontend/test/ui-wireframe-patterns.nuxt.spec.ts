import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import UiChoiceCards from '../app/components/ui/UiChoiceCards.vue'
import UiDefinitionList from '../app/components/ui/UiDefinitionList.vue'
import UiDetailLayout from '../app/components/ui/UiDetailLayout.vue'
import UiEntityCell from '../app/components/ui/UiEntityCell.vue'
import UiEntityHero from '../app/components/ui/UiEntityHero.vue'
import UiEntityPicker from '../app/components/ui/UiEntityPicker.vue'
import UiFileItem from '../app/components/ui/UiFileItem.vue'
import UiIdentityCode from '../app/components/ui/UiIdentityCode.vue'
import UiLoadingState from '../app/components/ui/UiLoadingState.vue'
import UiOverflowMenu from '../app/components/ui/UiOverflowMenu.vue'
import UiProgressBar from '../app/components/ui/UiProgressBar.vue'
import UiSectionHeader from '../app/components/ui/UiSectionHeader.vue'
import UiSegmentedControl from '../app/components/ui/UiSegmentedControl.vue'
import UiStepper from '../app/components/ui/UiStepper.vue'
import UiStickyActionBar from '../app/components/ui/UiStickyActionBar.vue'
import UiSwitch from '../app/components/ui/UiSwitch.vue'
import UiTag from '../app/components/ui/UiTag.vue'

describe('patrones extraídos del wireframe', () => {
  it('presenta el identificador permanente completo y distingue el pendiente', () => {
    const normal = mount(UiIdentityCode, { props: { value: 'CAT-GRUSS-01' } })
    const pending = mount(UiIdentityCode, { props: { value: 'CAT · T-15', pending: true } })
    expect(normal.find('code').text()).toBe('CAT-GRUSS-01')
    expect(pending.classes()).toContain('is-pending')
  })

  it('compone una portada de entidad sin conocer su dominio', () => {
    const wrapper = mount(UiEntityHero, {
      props: { title: 'Echinocactus grusonii', subtitle: 'Asiento de suegra' },
      slots: { identity: '<span>CAT-GRUSS</span>', actions: '<button>Editar</button>' },
    })
    expect(wrapper.find('h1').text()).toBe('Echinocactus grusonii')
    expect(wrapper.text()).toContain('CAT-GRUSS')
    expect(wrapper.text()).toContain('Editar')
  })

  it('mantiene junta la identidad compacta de una entidad', () => {
    const wrapper = mount(UiEntityCell, { props: { code: 'CAT-GRUSS-01', title: 'Bola verde', detail: 'A3' } })
    expect(wrapper.find('code').text()).toBe('CAT-GRUSS-01')
    expect(wrapper.text()).toContain('Bola verde')
    expect(wrapper.text()).toContain('A3')
  })

  it('una etiqueta removible nombra y comunica su retirada', async () => {
    const wrapper = mount(UiTag, { props: { label: 'Pleno sol', removable: true } })
    expect(wrapper.find('button').attributes('aria-label')).toBe('Quitar Pleno sol')
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('remove')).toHaveLength(1)
  })

  it('presenta una ficha clave valor y admite personalizar valores', () => {
    const wrapper = mount(UiDefinitionList, { props: { items: [{ key: 'code', label: 'Código', value: 'CAT-GRUSS' }] } })
    expect(wrapper.find('dt').text()).toBe('Código')
    expect(wrapper.find('dd').text()).toBe('CAT-GRUSS')
  })

  it('separa contenido principal y lateral sin contenido de dominio', () => {
    const wrapper = mount(UiDetailLayout, { slots: { default: 'Principal', aside: 'Lateral' } })
    expect(wrapper.find('main').text()).toBe('Principal')
    expect(wrapper.find('aside').text()).toBe('Lateral')
  })

  it('la cabecera de sección mantiene título contexto y acción', () => {
    const wrapper = mount(UiSectionHeader, { props: { title: 'Condiciones', description: 'Valores heredados', count: 7 }, slots: { actions: '<button>Editar</button>' } })
    expect(wrapper.find('h2').text()).toContain('Condiciones 7')
    expect(wrapper.text()).toContain('Valores heredados')
  })

  it('la carga se anuncia como estado', () => {
    const wrapper = mount(UiLoadingState, { props: { label: 'Cargando la especie…' } })
    expect(wrapper.attributes('role')).toBe('status')
    expect(wrapper.text()).toContain('Cargando la especie')
  })

  it('el menú de más acciones declara su relación y comunica la elegida', async () => {
    const wrapper = mount(UiOverflowMenu, { props: { items: [{ value: 'remove', label: 'Retirar', danger: true }] } })
    await wrapper.find('.overflow-menu__trigger').trigger('click')
    expect(wrapper.find('[role="menu"]').exists()).toBe(true)
    await wrapper.find('[role="menuitem"]').trigger('click')
    expect(wrapper.emitted('select')?.[0]).toEqual(['remove'])
  })

  it('la barra persistente mantiene mensaje y acciones', () => {
    const wrapper = mount(UiStickyActionBar, { props: { message: 'Cambios sin guardar' }, slots: { actions: '<button>Guardar</button>' } })
    expect(wrapper.text()).toContain('Cambios sin guardar')
    expect(wrapper.text()).toContain('Guardar')
  })

  it('el selector segmentado es una elección exclusiva accesible', async () => {
    const wrapper = mount(UiSegmentedControl, { props: { label: 'Entorno', modelValue: 'inside', options: [{ value: 'inside', label: 'Interior' }, { value: 'outside', label: 'Exterior' }] } })
    await wrapper.findAll('input')[1]!.setValue(true)
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['outside'])
  })

  it('el interruptor comunica su valor booleano', async () => {
    const wrapper = mount(UiSwitch, { props: { label: 'Alertas', modelValue: false } })
    await wrapper.find('input').setValue(true)
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([true])
  })

  it('las tarjetas de elección no dependen solo del dibujo', async () => {
    const wrapper = mount(UiChoiceCards, { props: { label: 'Exposición', modelValue: 'shade', options: [{ value: 'shade', label: 'Semisombra', mark: '◐' }, { value: 'sun', label: 'Sol', mark: '☀' }] } })
    expect(wrapper.text()).toContain('Semisombra')
    await wrapper.findAll('input')[1]!.setValue(true)
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['sun'])
  })

  it('el proceso marca el paso actual y los ya completados', () => {
    const wrapper = mount(UiStepper, { props: { steps: ['Subir', 'Revisar', 'Importar'], current: 1 } })
    expect(wrapper.find('[aria-current="step"]').text()).toContain('Revisar')
    expect(wrapper.findAll('li')[0]!.classes()).toContain('is-done')
  })

  it('el progreso expone valor y límites además de la anchura visual', () => {
    const wrapper = mount(UiProgressBar, { props: { value: 120, max: 180, label: 'Capacidad' } })
    const bar = wrapper.find('[role="progressbar"]')
    expect(bar.attributes('aria-valuenow')).toBe('120')
    expect(bar.attributes('aria-valuemax')).toBe('180')
    expect(wrapper.text()).toContain('67%')
  })

  it('el selector buscable filtra y comunica la entidad elegida', async () => {
    const wrapper = mount(UiEntityPicker, { props: { label: 'Especie', query: 'gruss', options: [{ value: 'gruss', code: 'CAT-GRUSS', title: 'Echinocactus grusonii' }, { value: 'mammi', code: 'CAT-MAMMI', title: 'Mammillaria' }] } })
    expect(wrapper.findAll('[role="option"]')).toHaveLength(1)
    await wrapper.find('[role="option"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['gruss'])
  })

  it('el archivo conserva nombre, detalle y retirada accesible', async () => {
    const wrapper = mount(UiFileItem, { props: { name: 'inventario.csv', size: '184 KB', status: 'Validado', removable: true } })
    expect(wrapper.text()).toContain('inventario.csv')
    expect(wrapper.find('button').attributes('aria-label')).toBe('Quitar inventario.csv')
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('remove')).toHaveLength(1)
  })
})
