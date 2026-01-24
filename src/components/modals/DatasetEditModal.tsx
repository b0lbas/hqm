import React, { useMemo, useState } from 'react'
import type { Dataset } from '../../lib/types'
import { storage } from '../../lib/storage'
import { Button, Input, Modal, Select } from '../ui'

export default function DatasetEditModal({
  open,
  onClose,
  dataset
}: {
  open: boolean
  onClose: () => void
  dataset: Dataset | null
}) {
  const [name, setName] = useState('')
  const [idKey, setIdKey] = useState('')
  const [labelKey, setLabelKey] = useState('')

  React.useEffect(() => {
    if (!dataset) return
    setName(dataset.name)
    setIdKey(dataset.idKey)
    setLabelKey(dataset.labelKey)
  }, [dataset])

  const keys = useMemo(() => {
    if (!dataset) return [] as string[]
    const first = dataset.geojson.features[0] as any
    return Object.keys(first?.properties || {})
  }, [dataset])

  async function save() {
    if (!dataset) return
    const upd: Dataset = {
      ...dataset,
      name: name.trim() || dataset.name,
      idKey: idKey.trim() || dataset.idKey,
      labelKey: labelKey.trim() || dataset.labelKey,
      updatedAt: Date.now()
    }
    await storage.saveDataset(upd)
    onClose()
    window.location.reload()
  }

  if (!dataset) return null

  const keyOptions = keys.map(k => ({ value: k, label: k }))

  return (
    <Modal
      open={open}
      title={`Датасет: ${dataset.name}`}
      onClose={onClose}
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Закрыть</Button>
          <Button onClick={save}>Сохранить</Button>
        </div>
      }
    >
      <div className="grid gap-4">
        <div className="grid gap-2">
          <div className="text-sm font-medium">Название</div>
          <Input value={name} onChange={setName} placeholder="Название" />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="grid gap-2">
            <div className="text-sm font-medium">idKey</div>
            {keys.length ? <Select value={idKey} onChange={setIdKey} options={keyOptions} /> : <Input value={idKey} onChange={setIdKey} />}
          </div>
          <div className="grid gap-2">
            <div className="text-sm font-medium">labelKey</div>
            {keys.length ? <Select value={labelKey} onChange={setLabelKey} options={keyOptions} /> : <Input value={labelKey} onChange={setLabelKey} />}
          </div>
        </div>
      </div>
    </Modal>
  )
}
