import { openDB, type DBSchema } from 'idb'
import { nanoid } from 'nanoid'
import type { Dataset, Folder, Quiz } from './types'

const LEGACY_KEY = 'hqmin.v1'
const MIGRATED_KEY = 'hqmin.v1.migrated'

type LegacyDB = {
  datasets: Dataset[]
  quizzes: Quiz[]
  folders?: Folder[]
}

interface HqminDB extends DBSchema {
  datasets: {
    key: string
    value: Dataset
  }
  quizzes: {
    key: string
    value: Quiz
  }
  folders: {
    key: string
    value: Folder
  }
}

function safeParse(json: string | null): LegacyDB | null {
  if (!json) return null
  try {
    const obj = JSON.parse(json)
    if (!obj || typeof obj !== 'object') return null
    if (!Array.isArray(obj.datasets) || !Array.isArray(obj.quizzes)) return null
    return obj as LegacyDB
  } catch {
    return null
  }
}

let dbPromise: ReturnType<typeof openDB<HqminDB>> | null = null
let migrationPromise: Promise<void> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<HqminDB>('hqmin', 2, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('datasets')) db.createObjectStore('datasets', { keyPath: 'id' })
        if (!db.objectStoreNames.contains('quizzes')) db.createObjectStore('quizzes', { keyPath: 'id' })
        if (!db.objectStoreNames.contains('folders')) db.createObjectStore('folders', { keyPath: 'id' })
      }
    })
  }
  return dbPromise
}

async function migrateLegacyIfNeeded() {
  if (migrationPromise) return migrationPromise
  migrationPromise = (async () => {
    if (localStorage.getItem(MIGRATED_KEY)) return
    const raw = localStorage.getItem(LEGACY_KEY)
    const parsed = safeParse(raw)
    if (!parsed) {
      localStorage.setItem(MIGRATED_KEY, '1')
      return
    }
    const db = await getDB()
    const tx = db.transaction(['datasets', 'quizzes', 'folders'], 'readwrite')
    for (const d of parsed.datasets) tx.objectStore('datasets').put(d)
    for (const q of parsed.quizzes) tx.objectStore('quizzes').put(q)
    for (const f of parsed.folders || []) tx.objectStore('folders').put(f)
    await tx.done
    localStorage.setItem(MIGRATED_KEY, '1')
    localStorage.removeItem(LEGACY_KEY)
  })()
  return migrationPromise
}

async function getAllDatasetsSorted(): Promise<Dataset[]> {
  const db = await getDB()
  const list = await db.getAll('datasets')
  return list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
}

async function getAllQuizzesSorted(): Promise<Quiz[]> {
  const db = await getDB()
  const list = await db.getAll('quizzes')
  return list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
}

async function getAllFoldersSorted(): Promise<Folder[]> {
  const db = await getDB()
  const list = await db.getAll('folders')
  return list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
}

export const storage = {
  async getAllDatasets(): Promise<Dataset[]> {
    await migrateLegacyIfNeeded()
    return getAllDatasetsSorted()
  },
  async getDataset(id: string): Promise<Dataset | undefined> {
    await migrateLegacyIfNeeded()
    const db = await getDB()
    return db.get('datasets', id)
  },
  async saveDataset(dataset: Dataset) {
    await migrateLegacyIfNeeded()
    const db = await getDB()
    await db.put('datasets', dataset)
  },
  async deleteDataset(id: string) {
    await migrateLegacyIfNeeded()
    const db = await getDB()
    const tx = db.transaction(['datasets', 'quizzes'], 'readwrite')
    tx.objectStore('datasets').delete(id)
    const quizzes = await tx.objectStore('quizzes').getAll()
    for (const q of quizzes) {
      if (q.datasetId === id) tx.objectStore('quizzes').delete(q.id)
    }
    await tx.done
  },

  async getAllQuizzes(): Promise<Quiz[]> {
    await migrateLegacyIfNeeded()
    return getAllQuizzesSorted()
  },
  async getAllFolders(): Promise<Folder[]> {
    await migrateLegacyIfNeeded()
    return getAllFoldersSorted()
  },
  async getQuiz(id: string): Promise<Quiz | undefined> {
    await migrateLegacyIfNeeded()
    const db = await getDB()
    return db.get('quizzes', id)
  },
  async getFolder(id: string): Promise<Folder | undefined> {
    await migrateLegacyIfNeeded()
    const db = await getDB()
    return db.get('folders', id)
  },
  async saveQuiz(quiz: Quiz) {
    await migrateLegacyIfNeeded()
    const db = await getDB()
    await db.put('quizzes', quiz)
  },
  async saveFolder(folder: Folder) {
    await migrateLegacyIfNeeded()
    const db = await getDB()
    await db.put('folders', folder)
  },
  async deleteQuiz(id: string) {
    await migrateLegacyIfNeeded()
    const db = await getDB()
    await db.delete('quizzes', id)
  },
  async deleteFolder(id: string) {
    await migrateLegacyIfNeeded()
    const db = await getDB()
    const folder = await db.get('folders', id)
    await db.delete('folders', id)
    const now = Date.now()
    const kind = folder?.kind || 'quiz'
    const folders = await db.getAll('folders')
    for (const f of folders) {
      if (f.parentId === id) {
        await db.put('folders', { ...f, parentId: folder?.parentId, updatedAt: now })
      }
    }
    if (kind === 'quiz') {
      const quizzes = await db.getAll('quizzes')
      for (const q of quizzes) {
        if (q.folderId === id) {
          await db.put('quizzes', { ...q, folderId: folder?.parentId, updatedAt: now })
        }
      }
    }
    if (kind === 'dataset') {
      const datasets = await db.getAll('datasets')
      for (const d of datasets) {
        if (d.folderId === id) {
          await db.put('datasets', { ...d, folderId: folder?.parentId, updatedAt: now })
        }
      }
    }
  },

  async exportAll(): Promise<string> {
    await migrateLegacyIfNeeded()
    const [datasets, quizzes, folders] = await Promise.all([
      getAllDatasetsSorted(),
      getAllQuizzesSorted(),
      getAllFoldersSorted()
    ])
    return JSON.stringify({ datasets, quizzes, folders }, null, 2)
  },
  async importAll(json: string): Promise<{ ok: true } | { ok: false; error: string }> {
    const parsed = safeParse(json)
    if (!parsed) return { ok: false, error: 'Неверный JSON (ожидается формат HelloQuiz Minimal).' }
    const db = await getDB()
    const tx = db.transaction(['datasets', 'quizzes', 'folders'], 'readwrite')
    await tx.objectStore('datasets').clear()
    await tx.objectStore('quizzes').clear()
    await tx.objectStore('folders').clear()
    for (const d of parsed.datasets) tx.objectStore('datasets').put(d)
    for (const q of parsed.quizzes) tx.objectStore('quizzes').put(q)
    for (const f of parsed.folders || []) tx.objectStore('folders').put(f)
    await tx.done
    localStorage.setItem(MIGRATED_KEY, '1')
    localStorage.removeItem(LEGACY_KEY)
    return { ok: true }
  },

  async exportQuizBundle(quizId: string): Promise<string> {
    await migrateLegacyIfNeeded()
    const db = await getDB()
    const quiz = await db.get('quizzes', quizId)
    if (!quiz) throw new Error('Квиз не найден')
    const dataset = await db.get('datasets', quiz.datasetId)
    if (!dataset) throw new Error('Датасет не найден')
    const payload = {
      version: 1,
      exportedAt: Date.now(),
      dataset,
      quiz
    }
    return JSON.stringify(payload, null, 2)
  },

  async importQuizBundle(json: string): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      const parsed = JSON.parse(json)
      const dataset = parsed?.dataset as Dataset | undefined
      const quiz = parsed?.quiz as Quiz | undefined
      if (!dataset || !quiz) return { ok: false, error: 'Неверный файл: нужен dataset и quiz.' }
      if (!dataset.geojson || !dataset.idKey || !dataset.labelKey) {
        return { ok: false, error: 'Неверный dataset в файле.' }
      }

      const newDatasetId = nanoid()
      const newQuizId = nanoid()
      const now = Date.now()

      const datasetCopy: Dataset = {
        ...dataset,
        id: newDatasetId,
        createdAt: now,
        updatedAt: now
      }

      const quizCopy: Quiz = {
        ...quiz,
        id: newQuizId,
        datasetId: newDatasetId,
        createdAt: now,
        updatedAt: now
      }

      const db = await getDB()
      const tx = db.transaction(['datasets', 'quizzes'], 'readwrite')
      await tx.objectStore('datasets').put(datasetCopy)
      await tx.objectStore('quizzes').put(quizCopy)
      await tx.done
      return { ok: true }
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Не удалось импортировать файл.' }
    }
  }
}
