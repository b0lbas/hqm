import type { Dataset, Region } from './types'

export function listPropertyKeys(datasetGeojson: any): string[] {
  const first = datasetGeojson?.features?.[0]
  const props = first?.properties
  if (!props || typeof props !== 'object') return []
  return Object.keys(props)
}

export function extractRegions(dataset: Dataset): Region[] {
  const { geojson, idKey, labelKey, flags } = dataset
  const regions: Region[] = []
  for (const f of geojson.features) {
    const p: any = (f as any).properties || {}
    const idVal = p[idKey]
    const labelVal = p[labelKey]
    if (idVal == null || labelVal == null) continue
    const id = String(idVal)
    const label = String(labelVal)
    regions.push({ id, label, hasFlag: Boolean(flags?.[id]) })
  }
  // stable sort by label
  regions.sort((a, b) => a.label.localeCompare(b.label, 'ru'))
  return regions
}

export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function uniqueBy<T, K>(arr: T[], key: (t: T) => K): T[] {
  const seen = new Set<K>()
  const out: T[] = []
  for (const t of arr) {
    const k = key(t)
    if (seen.has(k)) continue
    seen.add(k)
    out.push(t)
  }
  return out
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}
