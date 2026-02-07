import React, { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { nanoid } from 'nanoid'
import { storage } from '../lib/storage'
import type { Dataset, Folder, Quiz } from '../lib/types'
import { Card, CardBody, CardHeader, Button, Pill, Modal, Select, Input } from '../components/ui'
import DatasetModal from '../components/modals/DatasetModal'
import QuizModal from '../components/modals/QuizModal'
import DatasetEditModal from '../components/modals/DatasetEditModal'
import { MAP_STYLES, getMapStyleById, getMapStyleId, setMapStyleId, type MapStyleId } from '../lib/mapTiles'
import { REGION_STYLES, getRegionStyleId, setRegionStyleId, type RegionStyleId } from '../lib/regionStyles'

const TYPE_LABEL: Record<string, string> = {
  'map-click': 'click',
  'multiple-choice': 'multiple choice',
  image: 'image',
  'flag-mc': 'image'
}

export default function HomePage() {
  const [datasetOpen, setDatasetOpen] = useState(false)
  const [quizOpen, setQuizOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [mapStyle, setMapStyle] = useState<MapStyleId>(getMapStyleId())
  const [regionStyle, setRegionStyle] = useState<RegionStyleId>(getRegionStyleId())
  const [editDatasetOpen, setEditDatasetOpen] = useState(false)
  const [editQuizOpen, setEditQuizOpen] = useState(false)
  const [editingDataset, setEditingDataset] = useState<Dataset | null>(null)
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null)
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [folderModalOpen, setFolderModalOpen] = useState(false)
  const [folderName, setFolderName] = useState('')
  const [folderKind, setFolderKind] = useState<'quiz' | 'dataset'>('quiz')
  const [folderParentId, setFolderParentId] = useState<string>('root')
  const [datasetFolderId, setDatasetFolderId] = useState<string | null>(null)
  const [quizFolderId, setQuizFolderId] = useState<string | null>(null)
  const [dragOverDatasetId, setDragOverDatasetId] = useState<string | 'none' | 'parent' | null>(null)
  const [dragOverQuizId, setDragOverQuizId] = useState<string | 'none' | 'parent' | null>(null)
  const importRef = useRef<HTMLInputElement | null>(null)

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

  const counts = useMemo(() => ({
    datasets: datasets.length,
    quizzes: quizzes.length
  }), [datasets.length, quizzes.length])

  const datasetFolders = useMemo(() => folders.filter(f => f.kind === 'dataset'), [folders])
  const quizFolders = useMemo(() => folders.filter(f => f.kind === 'quiz' || !f.kind), [folders])

  const currentDatasetFolder = useMemo(
    () => datasetFolders.find(f => f.id === datasetFolderId) || null,
    [datasetFolders, datasetFolderId]
  )
  const currentQuizFolder = useMemo(
    () => quizFolders.find(f => f.id === quizFolderId) || null,
    [quizFolders, quizFolderId]
  )

  const datasetFolderChildren = useMemo(
    () => datasetFolders.filter(f => (f.parentId || null) === datasetFolderId),
    [datasetFolders, datasetFolderId]
  )
  const quizFolderChildren = useMemo(
    () => quizFolders.filter(f => (f.parentId || null) === quizFolderId),
    [quizFolders, quizFolderId]
  )

  const datasetsInCurrent = useMemo(
    () => datasets.filter(d => (d.folderId || null) === datasetFolderId),
    [datasets, datasetFolderId]
  )
  const quizzesInCurrent = useMemo(
    () => quizzes.filter(q => (q.folderId || null) === quizFolderId),
    [quizzes, quizFolderId]
  )

  async function exportQuiz(q: Quiz) {
    try {
      const json = await storage.exportQuizBundle(q.id)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${q.name || 'quiz'}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      alert(e?.message || 'Не удалось экспортировать квиз.')
    }
  }

  async function onImportFile(file: File | null) {
    if (!file) return
    try {
      const text = await file.text()
      const res = await storage.importQuizBundle(text)
      if (!res.ok) {
        alert(res.error)
        return
      }
      window.location.reload()
    } catch (e: any) {
      alert(e?.message || 'Не удалось импортировать файл.')
    } finally {
      if (importRef.current) importRef.current.value = ''
    }
  }

  function openCreateFolder() {
    const kind: Folder['kind'] = quizFolderId ? 'quiz' : datasetFolderId ? 'dataset' : 'quiz'
    setFolderKind(kind)
    setFolderParentId(kind === 'dataset' ? (datasetFolderId || 'root') : (quizFolderId || 'root'))
    setFolderName('')
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
    const list = (folderKind === 'dataset' ? datasetFolders : quizFolders)
    const opts = [{ value: 'root', label: '—' }]
    for (const f of list) {
      opts.push({ value: f.id, label: folderPath(f.id) || f.name })
    }
    return opts
  }, [folderKind, datasetFolders, quizFolders, folders])

  async function createFolder() {
    const name = folderName.trim()
    if (!name) return
    const now = Date.now()
    const parentId = folderParentId === 'root' ? undefined : folderParentId
    const folder: Folder = {
      id: nanoid(),
      name,
      kind: folderKind,
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
    if (folder.kind === 'dataset') {
      setDatasets(prev => prev.map(d => (d.folderId === folder.id ? { ...d, folderId: folder.parentId } : d)))
    }
    if (folder.kind === 'quiz') {
      setQuizzes(prev => prev.map(q => (q.folderId === folder.id ? { ...q, folderId: folder.parentId } : q)))
    }
  }

  async function moveDatasetToFolder(datasetId: string, folderId?: string) {
    const d = datasets.find(x => x.id === datasetId)
    if (!d) return
    const updated: Dataset = { ...d, folderId, updatedAt: Date.now() }
    await storage.saveDataset(updated)
    setDatasets(prev => prev.map(x => (x.id === datasetId ? updated : x)))
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
        <div className="flex w-full flex-col items-center justify-center gap-2 sm:w-auto sm:flex-row sm:items-center">
          <input
            ref={importRef}
            type="file"
            accept=".json,application/json"
            onChange={e => onImportFile(e.target.files?.[0] || null)}
            className="hidden"
          />
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2">
            <Button onClick={() => setDatasetOpen(true)}>＋ Новый датасет</Button>
            <Button variant="secondary" onClick={() => setQuizOpen(true)} disabled={datasets.length === 0}>＋ Новый квиз</Button>
            <Button variant="secondary" onClick={openCreateFolder}>＋ Новая папка</Button>
            <Button variant="secondary" onClick={() => importRef.current?.click()}>Импорт квиза</Button>
          </div>
          <Button variant="ghost" onClick={() => setSettingsOpen(true)} className="sm:ml-2">Настройки</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Датасеты</div>
              </div>
              <Pill>{counts.datasets}</Pill>
            </div>
          </CardHeader>
          <CardBody>
            <div className="grid gap-2">
              {datasetFolderId ? (
                <div
                  className={`rounded-xl ring-1 ring-white/5 px-3 py-2 ${dragOverDatasetId === 'parent' ? 'bg-neutral-800/70' : 'bg-neutral-800/40'}`}
                  onClick={() => setDatasetFolderId(currentDatasetFolder?.parentId || null)}
                  onDragOver={e => {
                    e.preventDefault()
                    setDragOverDatasetId('parent')
                  }}
                  onDragLeave={() => setDragOverDatasetId(null)}
                  onDrop={e => {
                    e.preventDefault()
                    setDragOverDatasetId(null)
                    const data = e.dataTransfer.getData('text/plain')
                    if (data.startsWith('dataset:')) {
                      moveDatasetToFolder(data.replace('dataset:', ''), currentDatasetFolder?.parentId)
                    }
                  }}
                >
                  <div className="text-sm font-semibold">..</div>
                </div>
              ) : null}

              {datasetFolderChildren.map(folder => (
                <div
                  key={folder.id}
                  className={`rounded-xl ring-1 ring-white/5 px-3 py-2 ${dragOverDatasetId === folder.id ? 'bg-neutral-800/70' : 'bg-neutral-800/40'}`}
                  onDragOver={e => {
                    e.preventDefault()
                    setDragOverDatasetId(folder.id)
                  }}
                  onDragLeave={() => setDragOverDatasetId(null)}
                  onDrop={e => {
                    e.preventDefault()
                    setDragOverDatasetId(null)
                    const data = e.dataTransfer.getData('text/plain')
                    if (data.startsWith('dataset:')) {
                      moveDatasetToFolder(data.replace('dataset:', ''), folder.id)
                    }
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <button
                      className="flex items-center gap-2 text-sm font-semibold text-slate-200 hover:text-white"
                      onClick={() => setDatasetFolderId(folder.id)}
                    >
                      <span className="inline-block h-3 w-3 rounded-sm border border-slate-400/80" />
                      {folder.name}
                    </button>
                    <FolderMenu
                      onRename={() => renameFolder(folder)}
                      onDelete={() => deleteFolder(folder)}
                    />
                  </div>
                </div>
              ))}

              {datasetFolderId === null && datasetsInCurrent.length ? (
                <div
                  className={`rounded-xl ring-1 ring-white/5 p-2 ${dragOverDatasetId === 'none' ? 'bg-neutral-800/70' : 'bg-neutral-800/40'}`}
                  onDragOver={e => {
                    e.preventDefault()
                    setDragOverDatasetId('none')
                  }}
                  onDragLeave={() => setDragOverDatasetId(null)}
                  onDrop={e => {
                    e.preventDefault()
                    setDragOverDatasetId(null)
                    const data = e.dataTransfer.getData('text/plain')
                    if (data.startsWith('dataset:')) {
                      moveDatasetToFolder(data.replace('dataset:', ''), undefined)
                    }
                  }}
                >
                  <div className="grid gap-2">
                    {datasetsInCurrent.map(d => (
                      <div
                        key={d.id}
                        draggable
                        onDragStart={e => {
                          e.dataTransfer.setData('text/plain', `dataset:${d.id}`)
                          e.dataTransfer.effectAllowed = 'move'
                        }}
                        className="flex items-center justify-between gap-3 rounded-xl bg-neutral-800/60 px-3 py-2 ring-1 ring-white/5"
                      >
                        <div>
                          <div className="text-sm font-medium">{d.name}</div>
                          <div className="text-xs text-slate-500">{d.geojson.features.length} объектов • id: {d.idKey} • label: {d.labelKey}</div>
                        </div>
                        <ActionMenu
                          onEdit={() => {
                            setEditingDataset(d)
                            setEditDatasetOpen(true)
                          }}
                          onDelete={async () => {
                            if (!confirm('Удалить датасет? (Связанные квизы тоже удалятся)')) return
                            await storage.deleteDataset(d.id)
                            window.location.reload()
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : datasetFolderId !== null ? (
                <div className="grid gap-2">
                  {datasetsInCurrent.map(d => (
                    <div
                      key={d.id}
                      draggable
                      onDragStart={e => {
                        e.dataTransfer.setData('text/plain', `dataset:${d.id}`)
                        e.dataTransfer.effectAllowed = 'move'
                      }}
                      className="flex items-center justify-between gap-3 rounded-xl bg-neutral-800/60 px-3 py-2 ring-1 ring-white/5"
                    >
                      <div>
                        <div className="text-sm font-medium">{d.name}</div>
                        <div className="text-xs text-slate-500">{d.geojson.features.length} объектов • id: {d.idKey} • label: {d.labelKey}</div>
                      </div>
                      <ActionMenu
                        onEdit={() => {
                          setEditingDataset(d)
                          setEditDatasetOpen(true)
                        }}
                        onDelete={async () => {
                          if (!confirm('Удалить датасет? (Связанные квизы тоже удалятся)')) return
                          await storage.deleteDataset(d.id)
                          window.location.reload()
                        }}
                      />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Квизы</div>
              </div>
              <Pill>{counts.quizzes}</Pill>
            </div>
          </CardHeader>
          <CardBody>
            <div className="grid gap-2">
              {quizFolderId ? (
                <div
                  className={`rounded-xl ring-1 ring-white/5 px-3 py-2 ${dragOverQuizId === 'parent' ? 'bg-neutral-800/70' : 'bg-neutral-800/40'}`}
                  onClick={() => setQuizFolderId(currentQuizFolder?.parentId || null)}
                  onDragOver={e => {
                    e.preventDefault()
                    setDragOverQuizId('parent')
                  }}
                  onDragLeave={() => setDragOverQuizId(null)}
                  onDrop={e => {
                    e.preventDefault()
                    setDragOverQuizId(null)
                    const data = e.dataTransfer.getData('text/plain')
                    if (data.startsWith('quiz:')) {
                      moveQuizToFolder(data.replace('quiz:', ''), currentQuizFolder?.parentId)
                    }
                  }}
                >
                  <div className="text-sm font-semibold">..</div>
                </div>
              ) : null}

              {quizFolderChildren.map(folder => (
                <div
                  key={folder.id}
                  className={`rounded-xl ring-1 ring-white/5 px-3 py-2 ${dragOverQuizId === folder.id ? 'bg-neutral-800/70' : 'bg-neutral-800/40'}`}
                  onDragOver={e => {
                    e.preventDefault()
                    setDragOverQuizId(folder.id)
                  }}
                  onDragLeave={() => setDragOverQuizId(null)}
                  onDrop={e => {
                    e.preventDefault()
                    setDragOverQuizId(null)
                    const data = e.dataTransfer.getData('text/plain')
                    if (data.startsWith('quiz:')) {
                      moveQuizToFolder(data.replace('quiz:', ''), folder.id)
                    }
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <button
                      className="flex items-center gap-2 text-sm font-semibold text-slate-200 hover:text-white"
                      onClick={() => setQuizFolderId(folder.id)}
                    >
                      <span className="inline-block h-3 w-3 rounded-sm border border-slate-400/80" />
                      {folder.name}
                    </button>
                    <FolderMenu
                      onRename={() => renameFolder(folder)}
                      onDelete={() => deleteFolder(folder)}
                    />
                  </div>
                </div>
              ))}

              {quizFolderId === null && quizzesInCurrent.length ? (
                <div
                  className={`rounded-xl ring-1 ring-white/5 p-2 ${dragOverQuizId === 'none' ? 'bg-neutral-800/70' : 'bg-neutral-800/40'}`}
                  onDragOver={e => {
                    e.preventDefault()
                    setDragOverQuizId('none')
                  }}
                  onDragLeave={() => setDragOverQuizId(null)}
                  onDrop={e => {
                    e.preventDefault()
                    setDragOverQuizId(null)
                    const data = e.dataTransfer.getData('text/plain')
                    if (data.startsWith('quiz:')) {
                      moveQuizToFolder(data.replace('quiz:', ''), undefined)
                    }
                  }}
                >
                  <div className="grid gap-2">
                    {quizzesInCurrent.map(q => (
                      <div
                        key={q.id}
                        draggable
                        onDragStart={e => {
                          e.dataTransfer.setData('text/plain', `quiz:${q.id}`)
                          e.dataTransfer.effectAllowed = 'move'
                        }}
                        className="flex items-center justify-between gap-3 rounded-xl bg-neutral-800/60 px-3 py-2 ring-1 ring-white/5"
                      >
                        <div>
                          <div className="text-sm font-medium">{q.name}</div>
                          <div className="text-xs text-slate-500">{TYPE_LABEL[q.type] || q.type} • {q.settings.questionCount} вопросов</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <a href={`/play/${q.id}`} className="text-xs text-slate-300 hover:text-white">Играть</a>
                          <ActionMenu
                            onEdit={() => {
                              setEditingQuiz(q)
                              setEditQuizOpen(true)
                            }}
                            onExport={() => exportQuiz(q)}
                            onDelete={async () => {
                              if (!confirm('Удалить квиз?')) return
                              await storage.deleteQuiz(q.id)
                              window.location.reload()
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : quizFolderId !== null ? (
                <div className="grid gap-2">
                  {quizzesInCurrent.map(q => (
                    <div
                      key={q.id}
                      draggable
                      onDragStart={e => {
                        e.dataTransfer.setData('text/plain', `quiz:${q.id}`)
                        e.dataTransfer.effectAllowed = 'move'
                      }}
                      className="flex items-center justify-between gap-3 rounded-xl bg-neutral-800/60 px-3 py-2 ring-1 ring-white/5"
                    >
                      <div>
                        <div className="text-sm font-medium">{q.name}</div>
                        <div className="text-xs text-slate-500">{TYPE_LABEL[q.type] || q.type} • {q.settings.questionCount} вопросов</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a href={`/play/${q.id}`} className="text-xs text-slate-300 hover:text-white">Играть</a>
                        <ActionMenu
                          onEdit={() => {
                            setEditingQuiz(q)
                            setEditQuizOpen(true)
                          }}
                          onExport={() => exportQuiz(q)}
                          onDelete={async () => {
                            if (!confirm('Удалить квиз?')) return
                            await storage.deleteQuiz(q.id)
                            window.location.reload()
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </CardBody>
        </Card>
      </div>

      <DatasetModal open={datasetOpen} onClose={() => setDatasetOpen(false)} onCreated={() => {}} />
      <QuizModal open={quizOpen} onClose={() => setQuizOpen(false)} onCreated={() => {}} />
      <DatasetEditModal open={editDatasetOpen} onClose={() => setEditDatasetOpen(false)} dataset={editingDataset} />
      <QuizModal open={editQuizOpen} onClose={() => setEditQuizOpen(false)} onCreated={() => {}} quiz={editingQuiz} />

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
            <div className="text-sm font-medium">Тип</div>
            <Select
              value={folderKind}
              onChange={v => setFolderKind(v as 'quiz' | 'dataset')}
              options={[
                { value: 'quiz', label: 'Квизы' },
                { value: 'dataset', label: 'Датасеты' }
              ]}
            />
          </div>
          <div className="grid gap-2">
            <div className="text-sm font-medium">Папка</div>
            <Select value={folderParentId} onChange={setFolderParentId} options={parentOptions} />
          </div>
        </div>
      </Modal>

      <Modal
        open={settingsOpen}
        title="Настройки"
        onClose={() => setSettingsOpen(false)}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setSettingsOpen(false)}>Закрыть</Button>
          </div>
        }
      >
        <div className="grid gap-4">
          <div className="text-sm font-medium">Карта</div>
          <Select
            value={mapStyle}
            onChange={v => {
              const id = v as MapStyleId
              setMapStyle(id)
              setMapStyleId(id)
            }}
            options={MAP_STYLES.map(s => ({ value: s.id, label: s.label }))}
          />
          <MapStylePreview id={mapStyle} />

          <div className="text-sm font-medium pt-2">Цвет регионов</div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {REGION_STYLES.map(style => {
              const active = style.id === regionStyle
              return (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => {
                    setRegionStyle(style.id)
                    setRegionStyleId(style.id)
                  }}
                  className={`flex items-center justify-center rounded-xl p-2 ring-1 transition ${active ? 'ring-white/30 bg-neutral-800/60' : 'ring-white/5 hover:bg-neutral-800/40'}`}
                >
                  <span
                    className="h-8 w-8 rounded-lg"
                    style={{
                      backgroundColor: (style.fillOpacity ?? 1) === 0 ? 'transparent' : style.fill,
                      border: `2px solid ${style.stroke}`
                    }}
                  />
                </button>
              )
            })}
          </div>
        </div>
      </Modal>
    </div>
  )
}

function MapStylePreview({ id }: { id: MapStyleId }) {
  const ref = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const tileRef = useRef<L.TileLayer | null>(null)

  useEffect(() => {
    if (!ref.current) return
    if (mapRef.current) return

    const map = L.map(ref.current, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: true,
      dragging: true,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false
    })

    map.setView([20, 0], 2)
    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const style = getMapStyleById(id)
    if (tileRef.current) tileRef.current.remove()
    if (!style.url) {
      tileRef.current = null
      return
    }
    tileRef.current = L.tileLayer(style.url, { maxZoom: 19, attribution: style.attribution })
    tileRef.current.addTo(map)
    setTimeout(() => map.invalidateSize(), 0)
  }, [id])

  return (
    <div
      ref={ref}
      className="h-56 w-full rounded-xl ring-1 ring-white/5"
    />
  )
}


function ActionMenu({
  onEdit,
  onExport,
  onDelete
}: {
  onEdit: () => void
  onExport?: () => void
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
            onEdit()
            const d = (e.currentTarget.closest('details') as HTMLDetailsElement | null)
            d?.removeAttribute('open')
          }}
        >
          Изменить
        </button>
        {onExport ? (
          <button
            className="w-full rounded-lg px-3 py-2 text-left text-xs text-slate-200 hover:bg-neutral-800"
            onClick={e => {
              e.preventDefault()
              onExport()
              const d = (e.currentTarget.closest('details') as HTMLDetailsElement | null)
              d?.removeAttribute('open')
            }}
          >
            Экспорт
          </button>
        ) : null}
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
