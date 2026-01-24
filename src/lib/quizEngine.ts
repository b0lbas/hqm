import type { Dataset, Quiz, Region } from './types'
import { extractRegions, pickRandom, shuffle } from './geo'

export type Question =
  | { kind: 'map-click'; targetId: string }
  | { kind: 'multiple-choice'; targetId: string; options: string[] }

export function buildRegionMaps(dataset: Dataset) {
  const regions = extractRegions(dataset)
  const byId = new Map<string, Region>()
  for (const r of regions) byId.set(r.id, r)
  return { regions, byId }
}

function buildPool(quiz: Quiz, regions: Region[], requireImages: boolean): Region[] {
  let pool = regions
  if (requireImages) {
    const images = quiz.imageMap || {}
    pool = pool.filter(r => Boolean(images[r.id]))
  }
  return pool
}

export function generateQuestions(dataset: Dataset, quiz: Quiz): { questions: Question[]; poolSize: number } {
  const regions = extractRegions(dataset)
  const requireImages = quiz.type === 'image' || quiz.type === 'flag-mc'
  const pool = buildPool(quiz, regions, requireImages)
  const poolSize = pool.length

  const count = Math.max(1, poolSize)
  const optionsCount = 4

  if (!pool.length) {
    return { questions: [], poolSize }
  }

  const questions: Question[] = []

  const poolIds = pool.map(r => r.id)
  const labelById = new Map(pool.map(r => [r.id, r.label || r.id]))
  const uniqueOrder = shuffle(poolIds)

  const pickTarget = (i: number) => uniqueOrder[i % uniqueOrder.length]

  for (let i = 0; i < count; i++) {
    const targetId = pickTarget(i)

    if (quiz.type === 'map-click' || quiz.type === 'image' || quiz.type === 'flag-mc') {
      questions.push({ kind: 'map-click', targetId })
      continue
    }

    const opts = new Set<string>()
    const usedLabels = new Set<string>()
    const targetLabel = labelById.get(targetId) || targetId
    opts.add(targetId)
    usedLabels.add(targetLabel)

    const maxOptions = Math.min(optionsCount, poolIds.length)
    let guard = 0
    while (opts.size < maxOptions && guard < poolIds.length * 5) {
      const id = pickRandom(poolIds)
      const label = labelById.get(id) || id
      guard += 1
      if (opts.has(id)) continue
      if (usedLabels.has(label)) continue
      opts.add(id)
      usedLabels.add(label)
    }

    const options = shuffle(Array.from(opts))

    if (quiz.type === 'multiple-choice') {
      questions.push({ kind: 'multiple-choice', targetId, options })
    } else {
      questions.push({ kind: 'multiple-choice', targetId, options })
    }
  }

  return { questions, poolSize }
}
