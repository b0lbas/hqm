import type { FeatureCollection, Geometry, GeoJsonProperties } from 'geojson'

export type GeoFeatureCollection = FeatureCollection<Geometry, GeoJsonProperties>

export type Dataset = {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  folderId?: string
  geojson: GeoFeatureCollection
  idKey: string
  labelKey: string
  // regionId -> dataURL or http(s) url
  flags: Record<string, string>
}

export type QuizType = 'map-click' | 'multiple-choice' | 'image' | 'flag-mc'

export type Quiz = {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  datasetId: string
  folderId?: string
  type: QuizType
  // regionId -> image url (public)
  imageMap?: Record<string, string>
  settings: {
    questionCount: number
    optionsCount: number
    allowRepeat: boolean
    revealAnswer: boolean
    easyMode?: boolean // если true, угаданные регионы остаются залитыми
  }
  // optional explicit pool of region ids; if absent uses all
  pool?: string[]
}

export type Region = {
  id: string
  label: string
  hasFlag: boolean
}

export type Folder = {
  id: string
  name: string
  kind: 'quiz' | 'dataset'
  parentId?: string
  createdAt: number
  updatedAt: number
}
