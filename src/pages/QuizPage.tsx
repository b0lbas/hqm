import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { storage } from '../lib/storage'
import type { Dataset, Quiz } from '../lib/types'
import { Button, Card, CardBody, CardHeader, Pill } from '../components/ui'
import QuizModal from '../components/modals/QuizModal'

export default function QuizPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<Quiz | null>(null)

  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [quizzes, setQuizzes] = useState<Quiz[]>([])

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

  const datasetName = useMemo(() => {
    const map = new Map(datasets.map(d => [d.id, d.name]))
    return (id: string) => map.get(id) || '—'
  }, [datasets])

  async function del(id: string) {
    if (!confirm('Удалить квиз?')) return
    await storage.deleteQuiz(id)
    window.location.reload()
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-lg font-semibold">Квизы</div>
        </div>
        <Button onClick={() => setCreateOpen(true)} disabled={!datasets.length}>＋ Новый квиз</Button>
      </div>

      <div className="grid gap-4">
        {quizzes.map(q => (
          <Card key={q.id}>
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
        ))}

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
    </div>
  )
}
