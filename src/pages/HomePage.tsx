import React, { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { storage } from '../lib/storage'
import type { Dataset, Quiz } from '../lib/types'
import { Card, CardBody, CardHeader, Button, Pill, Modal, Select } from '../components/ui'
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
  const importRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    let alive = true
    async function load() {
      const [ds, qs] = await Promise.all([storage.getAllDatasets(), storage.getAllQuizzes()])
      if (!alive) return
      setDatasets(ds)
      setQuizzes(qs)
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

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-slate-400">Датасеты и квизы</div>
        <div className="flex items-center gap-2">
          <input
            ref={importRef}
            type="file"
            accept=".json,application/json"
            onChange={e => onImportFile(e.target.files?.[0] || null)}
            className="hidden"
          />
          <Button onClick={() => setDatasetOpen(true)}>＋ Новый датасет</Button>
          <Button variant="secondary" onClick={() => setQuizOpen(true)} disabled={datasets.length === 0}>＋ Новый квиз</Button>
          <Button variant="secondary" onClick={() => importRef.current?.click()}>Импорт квиза</Button>
          <Button variant="ghost" onClick={() => setSettingsOpen(true)}>Настройки</Button>
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
              {datasets.map(d => (
                <div key={d.id} className="flex items-center justify-between gap-3 rounded-xl bg-neutral-800/60 px-3 py-2 ring-1 ring-white/5">
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
              {!datasets.length && (
                <div className="text-sm text-slate-500">Нажмите “Новый датасет”, чтобы загрузить GeoJSON.</div>
              )}
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
              {quizzes.map(q => (
                <div key={q.id} className="flex items-center justify-between gap-3 rounded-xl bg-neutral-800/60 px-3 py-2 ring-1 ring-white/5">
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
              {!quizzes.length && (
                <div className="text-sm text-slate-500">Создайте квиз и запускните его здесь.</div>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      <DatasetModal open={datasetOpen} onClose={() => setDatasetOpen(false)} onCreated={() => {}} />
      <QuizModal open={quizOpen} onClose={() => setQuizOpen(false)} onCreated={() => {}} />
      <DatasetEditModal open={editDatasetOpen} onClose={() => setEditDatasetOpen(false)} dataset={editingDataset} />
      <QuizModal open={editQuizOpen} onClose={() => setEditQuizOpen(false)} onCreated={() => {}} quiz={editingQuiz} />

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
