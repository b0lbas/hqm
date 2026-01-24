import React, { useEffect, useMemo, useState } from 'react'
import { nanoid } from 'nanoid'
import type { Dataset, Quiz, QuizType } from '../../lib/types'
import { storage } from '../../lib/storage'
import { Button, Input, Modal, Select } from '../ui'
import { extractRegions } from '../../lib/geo'

const TYPE_LABEL: Record<QuizType, string> = {
  'map-click': 'click',
  'multiple-choice': 'multiple choice',
  image: 'image',
  'flag-mc': 'image'
}

export default function QuizModal({
  open,
  onClose,
  onCreated,
  quiz
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
  quiz?: Quiz | null
}) {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [datasetId, setDatasetId] = useState<string>(datasets[0]?.id || '')
  const [name, setName] = useState('')
  const [type, setType] = useState<QuizType>('map-click')
  const [revealAnswer, setRevealAnswer] = useState(true)
  const [easyMode, setEasyMode] = useState(false)
  const [imageMap, setImageMap] = useState<Record<string, string>>({})
  const [imageSearch, setImageSearch] = useState('')

  useEffect(() => {
    let alive = true
    async function load() {
      const ds = await storage.getAllDatasets()
      if (!alive) return
      setDatasets(ds)
    }
    load()
    return () => {
      alive = false
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    if (quiz) {
      setDatasetId(quiz.datasetId)
      setName(quiz.name)
      setType(quiz.type)
      setRevealAnswer(Boolean(quiz.settings.revealAnswer))
      setEasyMode(Boolean(quiz.settings.easyMode))
      setImageMap(quiz.imageMap || {})
    } else {
      setDatasetId(datasets[0]?.id || '')
      setName('')
      setType('map-click')
      setRevealAnswer(true)
      setEasyMode(false)
      setImageMap({})
    }
  }, [open, quiz, datasets])

  const ds = datasets.find(d => d.id === datasetId)
  const regions = useMemo(() => (ds ? extractRegions(ds) : []), [ds])
  const filteredRegions = useMemo(() => {
    if (!imageSearch.trim()) return regions
    const s = imageSearch.toLowerCase()
    return regions.filter(r => r.label.toLowerCase().includes(s) || r.id.toLowerCase().includes(s))
  }, [regions, imageSearch])

  async function save() {
    if (!datasetId) {
      alert('Сначала создайте датасет.')
      return
    }
    const ds = datasets.find(d => d.id === datasetId)
    const qCount = Math.max(1, ds?.geojson?.features?.length || 1)
    const normalizedType = type === 'flag-mc' ? 'image' : type

    const now = Date.now()
    const base: Quiz = quiz
      ? { ...quiz }
      : {
          id: nanoid(),
          name: '',
          createdAt: now,
          updatedAt: now,
          datasetId,
          type: normalizedType,
          imageMap: normalizedType === 'image' ? imageMap : undefined,
          settings: {
            questionCount: qCount,
            optionsCount: 4,
            allowRepeat: false,
            revealAnswer,
            easyMode
          }
        }

    const upd: Quiz = {
      ...base,
      name: name.trim() || 'Без названия',
      datasetId,
      type: normalizedType,
      imageMap: normalizedType === 'image' ? imageMap : undefined,
      settings: {
        questionCount: qCount,
        optionsCount: 4,
        allowRepeat: false,
        revealAnswer,
        easyMode
      },
      updatedAt: now
    }

    await storage.saveQuiz(upd)
    onClose()
    onCreated()
    window.location.reload()
  }

  const datasetOptions = datasets.map(d => ({ value: d.id, label: `${d.name} (${d.geojson.features.length})` }))
  const typeOptions = (['map-click', 'multiple-choice', 'image'] as QuizType[])
    .map(t => ({ value: t, label: TYPE_LABEL[t] }))

  return (
    <Modal
      open={open}
      title={quiz ? 'Редактировать квиз' : 'Новый квиз'}
      onClose={onClose}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-slate-500"> </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose}>Отмена</Button>
            <Button onClick={save} disabled={!datasetId}>Сохранить</Button>
          </div>
        </div>
      }
    >
      <div className="grid gap-4">
        <div className="grid gap-2">
          <div className="text-sm font-medium">Датасет</div>
          <Select value={datasetId} onChange={setDatasetId} options={datasetOptions} />
        </div>

        <div className="grid gap-2">
          <div className="text-sm font-medium">Название</div>
          <Input value={name} onChange={setName} placeholder="Например: Spain provinces" />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="grid gap-2">
            <div className="text-sm font-medium">Тип</div>
            <Select value={type} onChange={v => setType(v as QuizType)} options={typeOptions} />
          </div>
        </div>

        <div className="grid gap-2">
          <div className="text-sm font-medium">Опции</div>
          <label className="flex items-center gap-2 rounded-xl bg-neutral-800/60 px-3 py-2 ring-1 ring-white/5">
            <input type="checkbox" checked={revealAnswer} onChange={e => setRevealAnswer(e.target.checked)} />
            <span className="text-sm text-slate-200">Показывать правильный ответ</span>
          </label>
          <label className="flex items-center gap-2 rounded-xl bg-neutral-800/60 px-3 py-2 ring-1 ring-white/5">
            <input type="checkbox" checked={easyMode} onChange={e => setEasyMode(e.target.checked)} />
            <span className="text-sm text-slate-200">Easy mode: угаданные регионы остаются залитыми</span>
          </label>
        </div>

        {type === 'image' || type === 'flag-mc' ? (
          <div className="grid gap-3">
            <div className="text-sm font-medium">Картинки (URL)</div>
            <Input value={imageSearch} onChange={setImageSearch} placeholder="Поиск по id или названию" />
            <div className="max-h-[280px] overflow-auto rounded-2xl bg-neutral-800/60 ring-1 ring-white/5">
              {filteredRegions.map(r => (
                <div key={r.id} className="flex items-center gap-3 border-b border-white/5 px-3 py-2 last:border-0">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-slate-200">{r.label}</div>
                    <div className="text-xs text-slate-500">{r.id}</div>
                  </div>
                  <input
                    value={imageMap[r.id] || ''}
                    onChange={e => {
                      const v = e.target.value
                      setImageMap(prev => ({ ...prev, [r.id]: v }))
                    }}
                    placeholder="https://..."
                    className="w-[260px] rounded-xl bg-neutral-900/70 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 outline-none ring-1 ring-white/5"
                  />
                </div>
              ))}
              {!filteredRegions.length ? (
                <div className="px-3 py-2 text-xs text-slate-500">Нет совпадений</div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  )
}
