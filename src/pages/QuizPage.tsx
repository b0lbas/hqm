import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { nanoid } from 'nanoid'
import { storage } from '../lib/storage'
import type { Dataset, Folder, Quiz } from '../lib/types'
import { Button, Card, CardBody, CardHeader, Pill, Modal, Input, Select } from '../components/ui'
import QuizModal from '../components/modals/QuizModal'

export default function QuizPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<Quiz | null>(null)

  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [dragOverId, setDragOverId] = useState<string | 'none' | null>(null)
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [folderModalOpen, setFolderModalOpen] = useState(false)
  const [folderName, setFolderName] = useState('')
  const [folderParentId, setFolderParentId] = useState<string>('root')

  useEffect(() => {
    let alive = true
    async function load() {
      const [ds, qs, fs] = await Promise.all([
        storage.getAllDatasets(),
        storage.getAllQuizzes(),
        storage.getAllFolders()
      ])
      if (!alive) return
      setDatasets(ds)
      setQuizzes(qs)
      setFolders(fs)
    }
    load()
    return () => {
      alive = false
    }
  }, [])

  const datasetName = useMemo(() => {
    const map = new Map(datasets.map(d => [d.id, d.name]))
    return (id: string) => map.get(id) || '—'
  }, [datasets])

  const quizzesByFolder = useMemo(() => {
    const map = new Map<string, Quiz[]>()
    for (const q of quizzes) {
      const key = q.folderId || 'none'
      const list = map.get(key) || []
      list.push(q)
      map.set(key, list)
    }
    return map
  }, [quizzes])

  const quizFolders = useMemo(() => folders.filter(f => f.kind === 'quiz' || !f.kind), [folders])
  const currentFolder = useMemo(
    () => quizFolders.find(f => f.id === currentFolderId) || null,
    [quizFolders, currentFolderId]
  )
  const folderChildren = useMemo(
    () => quizFolders.filter(f => (f.parentId || null) === currentFolderId),
    [quizFolders, currentFolderId]
  )
  const quizzesInCurrent = useMemo(
    () => quizzes.filter(q => (q.folderId || null) === currentFolderId),
    [quizzes, currentFolderId]
  )

  const renderQuizCard = (q: Quiz) => (
    <Card
      key={q.id}
      draggable
      onDragStart={e => {
        e.dataTransfer.setData('text/plain', `quiz:${q.id}`)
        e.dataTransfer.effectAllowed = 'move'
      }}
    >
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-base font-semibold">{q.name}</div>
            <div className="text-xs text-slate-500">Датасет: {datasetName(q.datasetId)} • Тип: {q.type}</div>
          </div>
          <div className="flex items-center gap-2">
            <Pill>{q.settings.questionCount} вопросов</Pill>
            <Link to={`/play/${q.id}`} className="inline-flex items-center justify-center rounded-xl bg-neutral-200 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-300">
              Играть
            </Link>
            <Button variant="secondary" onClick={() => {
              setEditing(q)
              setEditOpen(true)
            }}>Редактировать</Button>
            <Button variant="danger" onClick={() => del(q.id)}>Удалить</Button>
          </div>
        </div>
      </CardHeader>
      <CardBody>
        <div className="text-xs text-slate-500">
          {q.settings.optionsCount} вариантов • {q.settings.allowRepeat ? 'повторы ON' : 'повторы OFF'} • {q.pool?.length ? `${q.pool.length} id` : 'все регионы'}
        </div>
      </CardBody>
    </Card>
  )

  async function del(id: string) {
    if (!confirm('Удалить квиз?')) return
    await storage.deleteQuiz(id)
    window.location.reload()
  }

  function openCreateFolder() {
    setFolderName('')
    setFolderParentId(currentFolderId || 'root')
    setFolderModalOpen(true)
  }

  const folderPath = (id: string) => {
    const map = new Map(folders.map(f => [f.id, f]))
    const parts: string[] = []
    let cur = map.get(id)
    let guard = 0
    while (cur && guard < 20) {
      parts.unshift(cur.name)
      cur = cur.parentId ? map.get(cur.parentId) : undefined
      guard += 1
    }
    return parts.join(' / ')
  }

  const parentOptions = useMemo(() => {
    const opts = [{ value: 'root', label: '—' }]
    for (const f of quizFolders) {
      opts.push({ value: f.id, label: folderPath(f.id) || f.name })
    }
    return opts
  }, [quizFolders, folders])

  async function createFolder() {
    const name = folderName.trim()
    if (!name) return
    const now = Date.now()
    const parentId = folderParentId === 'root' ? undefined : folderParentId
    const folder: Folder = {
      id: nanoid(),
      name,
      kind: 'quiz',
      parentId,
      createdAt: now,
      updatedAt: now
    }
    await storage.saveFolder(folder)
    setFolders(prev => [folder, ...prev])
    setFolderModalOpen(false)
  }

  async function renameFolder(folder: Folder) {
    const name = (prompt('Новое название папки', folder.name) || '').trim()
    if (!name || name === folder.name) return
    const updated: Folder = { ...folder, name, updatedAt: Date.now() }
    await storage.saveFolder(updated)
    setFolders(prev => prev.map(f => (f.id === folder.id ? updated : f)))
  }

  async function deleteFolder(folder: Folder) {
    if (!confirm('Удалить папку?')) return
    await storage.deleteFolder(folder.id)
    setFolders(prev => prev.filter(f => f.id !== folder.id))
    setQuizzes(prev => prev.map(q => (q.folderId === folder.id ? { ...q, folderId: folder.parentId } : q)))
  }

  async function moveQuizToFolder(quizId: string, folderId?: string) {
    const q = quizzes.find(x => x.id === quizId)
    if (!q) return
    const updated: Quiz = { ...q, folderId, updatedAt: Date.now() }
    await storage.saveQuiz(updated)
    setQuizzes(prev => prev.map(x => (x.id === quizId ? updated : x)))
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-lg font-semibold">Квизы</div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={openCreateFolder}>＋ Новая папка</Button>
          <Button onClick={() => setCreateOpen(true)} disabled={!datasets.length}>＋ Новый квиз</Button>
        </div>
      </div>

      <div className="grid gap-4">
        {currentFolderId ? (
          <div
            className={`rounded-2xl ring-1 ring-white/5 p-3 ${dragOverId === 'parent' ? 'bg-neutral-800/70' : 'bg-neutral-900/40'}`}
            onClick={() => setCurrentFolderId(currentFolder?.parentId || null)}
            onDragOver={e => {
              e.preventDefault()
              setDragOverId('parent')
            }}
            onDragLeave={() => setDragOverId(null)}
            onDrop={e => {
              e.preventDefault()
              setDragOverId(null)
              const data = e.dataTransfer.getData('text/plain')
              if (data.startsWith('quiz:')) moveQuizToFolder(data.replace('quiz:', ''), currentFolder?.parentId)
            }}
          >
            <div className="flex items-center justify-between gap-2 px-2 py-1">
              <div className="text-sm font-semibold">..</div>
            </div>
          </div>
        ) : null}

        {folderChildren.map(folder => (
          <div
            key={folder.id}
            className={`rounded-2xl ring-1 ring-white/5 p-3 ${dragOverId === folder.id ? 'bg-neutral-800/70' : 'bg-neutral-900/40'}`}
            onDragOver={e => {
              e.preventDefault()
              setDragOverId(folder.id)
            }}
            onDragLeave={() => setDragOverId(null)}
            onDrop={e => {
              e.preventDefault()
              setDragOverId(null)
              const data = e.dataTransfer.getData('text/plain')
              if (data.startsWith('quiz:')) moveQuizToFolder(data.replace('quiz:', ''), folder.id)
            }}
          >
            <div className="flex items-center justify-between gap-2 px-2 py-1">
              <button
                className="flex items-center gap-2 text-sm font-semibold text-slate-200 hover:text-white"
                onClick={() => setCurrentFolderId(folder.id)}
              >
                <span className="inline-block h-3 w-3 rounded-sm border border-slate-400/80" />
                {folder.name}
              </button>
              <div className="flex items-center gap-2">
                <div className="text-xs text-slate-500">{(quizzesByFolder.get(folder.id) || []).length} квиз(ов)</div>
                <FolderMenu
                  onRename={() => renameFolder(folder)}
                  onDelete={() => deleteFolder(folder)}
                />
              </div>
            </div>
          </div>
        ))}

        {currentFolderId === null && (quizzesByFolder.get('none') || []).length ? (
          <div
            className={`rounded-2xl ring-1 ring-white/5 p-3 ${dragOverId === 'none' ? 'bg-neutral-800/70' : 'bg-neutral-900/40'}`}
            onDragOver={e => {
              e.preventDefault()
              setDragOverId('none')
            }}
            onDragLeave={() => setDragOverId(null)}
            onDrop={e => {
              e.preventDefault()
              setDragOverId(null)
              const data = e.dataTransfer.getData('text/plain')
              if (data.startsWith('quiz:')) moveQuizToFolder(data.replace('quiz:', ''), undefined)
            }}
          >
            <div className="grid gap-4 pt-2">
              {(quizzesByFolder.get('none') || []).length
                ? (quizzesByFolder.get('none') || []).map(renderQuizCard)
                : null}
            </div>
          </div>
        ) : currentFolderId !== null ? (
          <div className="grid gap-4">
              {quizzesInCurrent.length ? quizzesInCurrent.map(renderQuizCard) : null}
          </div>
        ) : null}

        {!quizzes.length && (
          <div className="rounded-2xl bg-neutral-800/60 p-6 text-sm text-slate-400 ring-1 ring-white/5">
            Пока нет квизов. Сначала создайте датасет, затем “Новый квиз”.
          </div>
        )}

        {!datasets.length && (
          <div className="rounded-2xl bg-neutral-800/60 p-6 text-sm text-slate-400 ring-1 ring-white/5">
            Сначала добавьте хотя бы один датасет (GeoJSON), иначе квиз создать нельзя.
          </div>
        )}
      </div>

      <QuizModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => {}} />
      <QuizModal open={editOpen} onClose={() => setEditOpen(false)} onCreated={() => {}} quiz={editing} />

      <Modal
        open={folderModalOpen}
        title="Новая папка"
        onClose={() => setFolderModalOpen(false)}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setFolderModalOpen(false)}>Отмена</Button>
            <Button onClick={createFolder} disabled={!folderName.trim()}>Создать</Button>
          </div>
        }
      >
        <div className="grid gap-4">
          <div className="grid gap-2">
            <div className="text-sm font-medium">Название</div>
            <Input value={folderName} onChange={setFolderName} placeholder="Например: Европа" />
          </div>
          <div className="grid gap-2">
            <div className="text-sm font-medium">Папка</div>
            <Select value={folderParentId} onChange={setFolderParentId} options={parentOptions} />
          </div>
        </div>
      </Modal>
    </div>
  )
}

function FolderMenu({
  onRename,
  onDelete
}: {
  onRename: () => void
  onDelete: () => void
}) {
  return (
    <details className="relative">
      <summary className="list-none cursor-pointer rounded-full px-2 py-1 text-sm text-slate-300 hover:text-white">
        ⋯
      </summary>
      <div className="absolute right-0 z-10 mt-2 w-36 rounded-xl bg-neutral-900/90 p-1 ring-1 ring-white/10">
        <button
          className="w-full rounded-lg px-3 py-2 text-left text-xs text-slate-200 hover:bg-neutral-800"
          onClick={e => {
            e.preventDefault()
            onRename()
            const d = (e.currentTarget.closest('details') as HTMLDetailsElement | null)
            d?.removeAttribute('open')
          }}
        >
          Переименовать
        </button>
        <button
          className="w-full rounded-lg px-3 py-2 text-left text-xs text-slate-200 hover:bg-neutral-800"
          onClick={e => {
            e.preventDefault()
            onDelete()
            const d = (e.currentTarget.closest('details') as HTMLDetailsElement | null)
            d?.removeAttribute('open')
          }}
        >
          Удалить
        </button>
      </div>
    </details>
  )
}
