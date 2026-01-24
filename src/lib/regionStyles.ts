export type RegionStyleId =
  | 'navy'
  | 'red'
  | 'dark-red'
  | 'black'
  | 'white'
  | 'white-on-black'
  | 'black-on-white'
  | 'slate'
  | 'sand'
  | 'emerald'
  | 'indigo'
  | 'purple'
  | 'orange'
  | 'teal'
  | 'steel'
  | 'forest'
  | 'rose'
  | 'amber'

export type RegionStyle = {
  id: RegionStyleId
  label: string
  fill: string
  stroke: string
}

const REGION_STYLE_KEY = 'hqmin.regionstyle'

export const REGION_STYLES: RegionStyle[] = [
  { id: 'navy', label: 'Ночной синий', fill: 'rgba(15,23,42,0.85)', stroke: 'rgba(148,163,184,0.55)' },
  { id: 'red', label: 'Классический красный', fill: 'rgba(185,28,28,0.75)', stroke: 'rgba(254,202,202,0.9)' },
  { id: 'dark-red', label: 'Глубокий бордовый', fill: 'rgba(88,0,0,0.85)', stroke: 'rgba(248,113,113,0.8)' },
  { id: 'black', label: 'Графит', fill: 'rgba(2,6,23,0.95)', stroke: 'rgba(148,163,184,0.35)' },
  { id: 'white', label: 'Светлая карта', fill: 'rgba(248,250,252,0.95)', stroke: 'rgba(15,23,42,0.35)' },
  { id: 'white-on-black', label: 'Светлый контур', fill: 'rgba(248,250,252,0.95)', stroke: 'rgba(2,6,23,0.9)' },
  { id: 'black-on-white', label: 'Тёмный контур', fill: 'rgba(2,6,23,0.95)', stroke: 'rgba(248,250,252,0.6)' },
  { id: 'slate', label: 'Сланцевый', fill: 'rgba(30,41,59,0.85)', stroke: 'rgba(203,213,225,0.6)' },
  { id: 'sand', label: 'Песочный', fill: 'rgba(214,197,164,0.85)', stroke: 'rgba(120,86,52,0.6)' },
  { id: 'emerald', label: 'Изумрудный', fill: 'rgba(6,95,70,0.85)', stroke: 'rgba(110,231,183,0.8)' },
  { id: 'indigo', label: 'Индиго', fill: 'rgba(49,46,129,0.85)', stroke: 'rgba(165,180,252,0.8)' },
  { id: 'purple', label: 'Фиолетовый', fill: 'rgba(76,29,149,0.85)', stroke: 'rgba(216,180,254,0.8)' },
  { id: 'orange', label: 'Тёплый оранжевый', fill: 'rgba(154,52,18,0.85)', stroke: 'rgba(253,186,116,0.8)' },
  { id: 'teal', label: 'Бирюзовый', fill: 'rgba(13,148,136,0.85)', stroke: 'rgba(153,246,228,0.8)' },
  { id: 'steel', label: 'Сталь', fill: 'rgba(30,58,138,0.8)', stroke: 'rgba(191,219,254,0.8)' },
  { id: 'forest', label: 'Лесной', fill: 'rgba(20,83,45,0.85)', stroke: 'rgba(134,239,172,0.8)' },
  { id: 'rose', label: 'Розовый', fill: 'rgba(159,18,57,0.85)', stroke: 'rgba(253,164,175,0.85)' },
  { id: 'amber', label: 'Янтарный', fill: 'rgba(180,83,9,0.85)', stroke: 'rgba(252,211,77,0.85)' }
]

export function getRegionStyleId(): RegionStyleId {
  const raw = localStorage.getItem(REGION_STYLE_KEY)
  const found = REGION_STYLES.find(s => s.id === raw)
  return found ? found.id : 'navy'
}

export function getRegionStyleById(id: RegionStyleId): RegionStyle {
  return REGION_STYLES.find(s => s.id === id) || REGION_STYLES[0]
}

export function setRegionStyleId(id: RegionStyleId) {
  localStorage.setItem(REGION_STYLE_KEY, id)
  window.dispatchEvent(new CustomEvent('hqmin.regionstyle', { detail: id }))
}
