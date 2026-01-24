import React, { useMemo, useState } from 'react'
import { nanoid } from 'nanoid'
import type { GeoFeatureCollection, Dataset } from '../../lib/types'
import { storage } from '../../lib/storage'
import { listPropertyKeys } from '../../lib/geo'
import { Button, Input, Modal, Select } from '../ui'

function guessKeys(keys: string[]): { idKey: string; labelKey: string } {
  const lower = keys.map(k => k.toLowerCase())
  const pick = (candidates: string[], fallback: string) => {
    for (const c of candidates) {
      const idx = lower.indexOf(c)
      if (idx >= 0) return keys[idx]
    }
    return keys[0] || fallback
  }
  return {
    idKey: pick(['id', 'code', 'iso', 'iso2', 'iso3', 'gid', 'geoid'], 'id'),
    labelKey: pick(['name', 'nam', 'title', 'label', 'admin'], 'name')
  }
}

export default function DatasetModal({
  open,
  onClose,
  onCreated
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const [fileName, setFileName] = useState<string>('')
  const [raw, setRaw] = useState<GeoFeatureCollection | null>(null)
  const [error, setError] = useState<string>('')
  const [name, setName] = useState('')
  const [idKey, setIdKey] = useState('id')
  const [labelKey, setLabelKey] = useState('name')

  const keys = useMemo(() => (raw ? listPropertyKeys(raw) : []), [raw])

  function reset() {
    setFileName('')
    setRaw(null)
    setError('')
    setName('')
    setIdKey('id')
    setLabelKey('name')
  }

  async function onFile(f: File | null) {
    setError('')
    setRaw(null)
    if (!f) return
    setFileName(f.name)
    try {
      const text = await f.text()
      const json = JSON.parse(text)

      let fc: any = json
      if (json?.type === 'Feature') {
        fc = { type: 'FeatureCollection', features: [json] }
      }
      if (json?.type === 'GeometryCollection') {
        throw new Error('GeometryCollection не поддерживается. Нужен FeatureCollection.')
      }
      if (fc?.type !== 'FeatureCollection' || !Array.isArray(fc.features)) {
        throw new Error('Ожидается GeoJSON FeatureCollection.')
      }
      if (!fc.features.length) {
        throw new Error('FeatureCollection пустой.')
      }

      const propKeys = listPropertyKeys(fc)
      const guessed = guessKeys(propKeys)

      setRaw(fc)
      setIdKey(guessed.idKey)
      setLabelKey(guessed.labelKey)
      setName(f.name.replace(/\.geojson$/i, '').replace(/\.json$/i, ''))
    } catch (e: any) {
      setError(e?.message || 'Не удалось прочитать GeoJSON')
    }
  }

  async function create() {
    if (!raw) return
    const ds: Dataset = {
      id: nanoid(),
      name: name.trim() || 'Без названия',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      geojson: raw,
      idKey: idKey.trim() || 'id',
      labelKey: labelKey.trim() || 'name',
      flags: {}
    }
    await storage.saveDataset(ds)
    onClose()
    onCreated()
    reset()
    window.location.reload()
  }

  const keyOptions = useMemo(() => {
    const list = keys.length ? keys : ['id', 'name']
    return list.map(k => ({ value: k, label: k }))
  }, [keys])

  return (
    <Modal
      open={open}
      title="Новый датасет (GeoJSON)"
      onClose={() => {
        onClose()
        reset()
      }}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-slate-500">
            {raw ? `${raw.features.length} объектов` : 'Загрузите GeoJSON FeatureCollection'}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => {
              onClose()
              reset()
            }}>Отмена</Button>
            <Button onClick={create} disabled={!raw || !!error}>Создать</Button>
          </div>
        </div>
      }
    >
      <div className="grid gap-4">
        <div className="grid gap-2">
          <div className="text-sm font-medium">1) GeoJSON файл</div>
          <div className="rounded-2xl bg-neutral-800/60 p-4 ring-1 ring-white/5">
            <input
              type="file"
              accept=".json,.geojson,application/geo+json,application/json"
              onChange={e => onFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-slate-300 file:mr-4 file:rounded-xl file:border-0 file:bg-neutral-700 file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-100 hover:file:bg-neutral-600"
            />
            {fileName ? <div className="mt-2 text-xs text-slate-500">{fileName}</div> : null}
            {error ? <div className="mt-2 text-sm text-rose-300">{error}</div> : null}
          </div>
        </div>

        <div className="grid gap-2">
          <div className="text-sm font-medium">2) Название датасета</div>
          <Input value={name} onChange={setName} placeholder="Например: Municipalities of Spain" />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="grid gap-2">
            <div className="text-sm font-medium">3) Ключ id</div>
            {keys.length ? (
              <Select value={idKey} onChange={setIdKey} options={keyOptions} />
            ) : (
              <Input value={idKey} onChange={setIdKey} placeholder="id" />
            )}
            <div className="text-xs text-slate-500">properties.{idKey} → уникальный идентификатор</div>
          </div>

          <div className="grid gap-2">
            <div className="text-sm font-medium">4) Ключ label</div>
            {keys.length ? (
              <Select value={labelKey} onChange={setLabelKey} options={keyOptions} />
            ) : (
              <Input value={labelKey} onChange={setLabelKey} placeholder="name" />
            )}
            <div className="text-xs text-slate-500">properties.{labelKey} → то, что показываем пользователю</div>
          </div>
        </div>

        <div className="rounded-2xl bg-neutral-800/60 p-4 text-xs text-slate-500 ring-1 ring-white/5">
          Подсказка: если в GeoJSON нет удобного id — добавьте его в свойствах заранее (в QGIS, Mapshaper и т.п.).
        </div>
      </div>
    </Modal>
  )
}
