export type MapStyleId =
  | 'none'
  | 'osm'
  | 'carto-voyager'
  | 'carto-light'
  | 'carto-dark'
  | 'wikimedia'
  | 'opentopo'
  | 'esri-street'
  | 'esri-gray'
  | 'esri-imagery'

export type MapStyle = {
  id: MapStyleId
  label: string
  url: string
  attribution: string
}

const MAP_STYLE_KEY = 'hqmin.mapstyle'

export const MAP_STYLES: MapStyle[] = [
  {
    id: 'none',
    label: 'Без карты',
    url: '',
    attribution: ''
  },
  {
    id: 'osm',
    label: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors'
  },
  {
    id: 'carto-voyager',
    label: 'Carto Voyager',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '© OpenStreetMap contributors © CARTO'
  },
  {
    id: 'carto-light',
    label: 'Carto Light',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '© OpenStreetMap contributors © CARTO'
  },
  {
    id: 'carto-dark',
    label: 'Carto Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '© OpenStreetMap contributors © CARTO'
  },
  {
    id: 'wikimedia',
    label: 'Wikimedia',
    url: 'https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors'
  },
  {
    id: 'opentopo',
    label: 'OpenTopoMap',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors © OpenTopoMap'
  },
  {
    id: 'esri-street',
    label: 'Esri Streets',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri'
  },
  {
    id: 'esri-gray',
    label: 'Esri Gray',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri'
  },
  {
    id: 'esri-imagery',
    label: 'Esri Imagery',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri'
  }
]

export function getMapStyleId(): MapStyleId {
  const raw = localStorage.getItem(MAP_STYLE_KEY)
  const found = MAP_STYLES.find(s => s.id === raw)
  return found ? found.id : 'osm'
}

export function getMapStyleById(id: MapStyleId): MapStyle {
  return MAP_STYLES.find(s => s.id === id) || MAP_STYLES[0]
}

export function setMapStyleId(id: MapStyleId) {
  localStorage.setItem(MAP_STYLE_KEY, id)
  window.dispatchEvent(new CustomEvent('hqmin.mapstyle', { detail: id }))
}
