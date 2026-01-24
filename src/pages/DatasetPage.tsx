import React, { useEffect, useState } from 'react'
import { storage } from '../lib/storage'
import { Button, Card, CardBody, CardHeader, Pill } from '../components/ui'
import DatasetModal from '../components/modals/DatasetModal'
import DatasetEditModal from '../components/modals/DatasetEditModal'
import type { Dataset } from '../lib/types'

export default function DatasetPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<Dataset | null>(null)

  const [datasets, setDatasets] = useState<Dataset[]>([])

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
  }, [])

  async function del(id: string) {
    if (!confirm('Удалить датасет? (Связанные квизы тоже удалятся)')) return
    await storage.deleteDataset(id)
    window.location.reload()
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-lg font-semibold">Датасеты</div>
        </div>
        <Button onClick={() => setCreateOpen(true)}>＋ Новый датасет</Button>
      </div>

      <div className="grid gap-4">
        {datasets.map(d => (
          <Card key={d.id}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-base font-semibold">{d.name}</div>
                  <div className="text-xs text-slate-500">{d.geojson.features.length} объектов • idKey: {d.idKey} • labelKey: {d.labelKey}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Pill>{Object.keys(d.flags).length} флагов</Pill>
                  <Button variant="secondary" onClick={() => {
                    setEditing(d)
                    setEditOpen(true)
                  }}>Редактировать</Button>
                  <Button variant="danger" onClick={() => del(d.id)}>Удалить</Button>
                </div>
              </div>
            </CardHeader>
            <CardBody>
              <div className="text-xs text-slate-500">
                Создан: {new Date(d.createdAt).toLocaleString('ru-RU')} • Обновлён: {new Date(d.updatedAt).toLocaleString('ru-RU')}
              </div>
            </CardBody>
          </Card>
        ))}

        {!datasets.length && (
          <div className="rounded-2xl bg-neutral-800/60 p-6 text-sm text-slate-400 ring-1 ring-white/5">
            Пока нет ни одного датасета. Нажмите “Новый датасет” и загрузите GeoJSON.
          </div>
        )}
      </div>

      <DatasetModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => {}} />
      <DatasetEditModal open={editOpen} onClose={() => setEditOpen(false)} dataset={editing} />
    </div>
  )
}
