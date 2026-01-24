import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import GeoJsonMap from '../components/GeoJsonMap'
import { Card, CardBody, CardHeader, Pill } from '../components/ui'
import { storage } from '../lib/storage'
import type { Dataset, Quiz } from '../lib/types'
import { buildRegionMaps, generateQuestions, type Question } from '../lib/quizEngine'

type AnswerState =
  | { status: 'idle' }
  | { status: 'correct'; chosenId: string }
  | { status: 'wrong'; chosenId: string }

export default function PlayPage() {
  const { quizId } = useParams()
  const [loading, setLoading] = useState(true)
  const [quiz, setQuiz] = useState<Quiz | undefined>(undefined)
  const [dataset, setDataset] = useState<Dataset | undefined>(undefined)

  // easyMode: сохраняем угаданные регионы
  const [guessedIds, setGuessedIds] = useState<string[]>([])
  // missedIds: регионы, которые были целями, но игрок их не угадал
  const [missedIds, setMissedIds] = useState<string[]>([])

  useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true)
      if (!quizId) {
        setQuiz(undefined)
        setDataset(undefined)
        setLoading(false)
        return
      }
      const q = await storage.getQuiz(quizId)
      if (!alive) return
      setQuiz(q)
      if (q) {
        const ds = await storage.getDataset(q.datasetId)
        if (!alive) return
        setDataset(ds)
      } else {
        setDataset(undefined)
      }
      setLoading(false)
    }
    load()
    return () => {
      alive = false
    }
  }, [quizId])

  const { byId } = useMemo(() => {
    if (!dataset) return { byId: new Map() }
    const { byId } = buildRegionMaps(dataset)
    return { byId }
  }, [dataset])

  const { questions } = useMemo(() => {
    if (!dataset || !quiz) return { questions: [] as Question[], poolSize: 0 }
    return generateQuestions(dataset, quiz)
  }, [dataset, quiz])

  const [idx, setIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [answer, setAnswer] = useState<AnswerState>({ status: 'idle' })

  useEffect(() => {
    setIdx(0)
    setScore(0)
    setAnswer({ status: 'idle' })
    setGuessedIds([])
    setMissedIds([])
    console.debug('[PlayPage] reset state for quizId', quizId)
  }, [quizId])

  const q = questions[idx]
  const done = idx >= questions.length

  // easyMode: если включено, регионы из guessedIds всегда correct, а из missedIds всегда wrong
  const regionStates = useMemo(() => {
    if (!q || !quiz) return {}
    const map: Record<string, 'none' | 'target' | 'correct' | 'wrong'> = {}

    if (quiz.settings.easyMode) {
      for (const id of guessedIds) map[id] = 'correct'
      for (const id of missedIds) map[id] = 'wrong'
    }

    // For multiple-choice show the target only while answering.
    if (q.kind !== 'map-click' && answer.status === 'idle') {
      map[q.targetId] = 'target'
    }

    // If answered, mark target appropriately.
    // On wrong: do NOT highlight the chosen id; highlight target as wrong (player missed it).
    if (answer.status === 'wrong') {
      map[q.targetId] = 'wrong'
    }
    if (answer.status === 'correct') {
      map[q.targetId] = 'correct'
    }
    console.debug('[PlayPage] regionStates', map, 'guessedIds', guessedIds, 'missedIds', missedIds, 'easyMode', quiz.settings.easyMode)
    return map
  }, [q, answer, quiz, guessedIds])

  function next() {
    setAnswer({ status: 'idle' })
    setIdx(i => i + 1)
  }

  function submit(chosenId: string) {
    if (!q || done) return
    if (answer.status !== 'idle') return
    const correct = chosenId === q.targetId
    if (correct) setScore(s => s + 1)
    setAnswer({ status: correct ? 'correct' : 'wrong', chosenId })
  }

  useEffect(() => {
    if (!q || done) return
    if (answer.status === 'idle') return
    // easyMode: сохраняем persistent состояния после ответа
    if (quiz?.settings.easyMode) {
      if (answer.status === 'correct') {
        setGuessedIds(ids => ids.includes(q.targetId) ? ids : [...ids, q.targetId])
      } else if (answer.status === 'wrong') {
        // on wrong, persist the target as missed
        setMissedIds(ids => ids.includes(q.targetId) ? ids : [...ids, q.targetId])
      }
    }
    const t = window.setTimeout(() => {
      next()
    }, 1400)
    return () => window.clearTimeout(t)
  }, [answer.status, done, q, quiz?.settings.easyMode])

  // Keyboard shortcuts: 1..9 for options, Enter for next
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!q || done) return
      if (q.kind === 'map-click') {
        if (e.key === 'Enter' && answer.status !== 'idle') next()
        return
      }
      if (e.key >= '1' && e.key <= '9') {
        const i = Number(e.key) - 1
        const id = q.options?.[i]
        if (id) submit(id)
      }
      if (e.key === 'Enter' && answer.status !== 'idle') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [q, done, answer.status])

  if (loading) {
    return (
      <div className="rounded-2xl bg-neutral-800/60 p-6 text-sm text-slate-300 ring-1 ring-white/5">
        Загрузка…
      </div>
    )
  }
  if (!quiz) {
    return (
      <div className="rounded-2xl bg-neutral-800/60 p-6 text-sm text-slate-300 ring-1 ring-white/5">
        Квиз не найден. <Link to="/" className="text-white underline">Вернуться</Link>
      </div>
    )
  }
  if (!dataset) {
    return (
      <div className="rounded-2xl bg-neutral-800/60 p-6 text-sm text-slate-300 ring-1 ring-white/5">
        Датасет не найден. <Link to="/" className="text-white underline">Вернуться</Link>
      </div>
    )
  }

  if (!questions.length) {
    return (
      <div className="grid gap-4">
        <div className="rounded-2xl bg-neutral-800/60 p-6 text-sm text-slate-300 ring-1 ring-white/5">
          Невозможно сгенерировать вопросы: нет доступных регионов.
        </div>
        <Link to="/" className="text-slate-200 hover:text-white">← Назад</Link>
      </div>
    )
  }

  return (
    <div className="grid min-h-screen gap-4 px-4 py-4">
      <div className="text-sm text-slate-300">{quiz.name}</div>

      {done ? (
        <div className="flex flex-col items-center gap-4">
          <div className="text-sm text-slate-300">{quiz.name}</div>
          <div className="text-lg text-slate-200">
            Правильных ответов: {score} / {questions.length}
          </div>
          <div className="flex items-center gap-2">
            <Link to="/" className="rounded-xl bg-neutral-800/70 px-4 py-2 text-sm text-slate-200 ring-1 ring-white/5 hover:bg-neutral-700">
              Меню
            </Link>
            <button
              onClick={() => window.location.reload()}
              className="rounded-xl bg-neutral-700 px-4 py-2 text-sm text-slate-100 ring-1 ring-white/5 hover:bg-neutral-600"
            >
              Сыграть еще раз
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-[420px_1fr]">
          <Card className="h-fit">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">Вопрос {idx + 1}</div>
                </div>
              </div>
            </CardHeader>
            <CardBody>
              <QuestionBlock
                q={q}
                quiz={quiz}
                byId={byId}
                answer={answer}
                onChoose={submit}
              />
            </CardBody>
          </Card>

          <div className="min-h-[60vh] md:min-h-[calc(100vh-120px)]">
            <GeoJsonMap
              geojson={dataset.geojson}
              idKey={dataset.idKey}
              labelKey={dataset.labelKey}
              regionStates={regionStates}
              disabled={q.kind !== 'map-click' || answer.status !== 'idle'}
              onRegionClick={rid => submit(rid)}
              easyMode={!!quiz.settings.easyMode}
            />
          </div>
        </div>
      )}

    </div>
  )
}

function QuestionBlock({
  q,
  quiz,
  byId,
  answer,
  onChoose
}: {
  q: Question
  quiz: Quiz
  byId: Map<string, any>
  answer: AnswerState
  onChoose: (id: string) => void
}) {
  const target = byId.get(q.targetId)
  const targetLabel = target?.label || q.targetId

  if (q.kind === 'map-click') {
    const showImage = quiz.type === 'image' || quiz.type === 'flag-mc'
    const imageUrl = showImage ? (quiz.imageMap?.[q.targetId] || '') : ''
    return (
      <div className="grid gap-3">
        {showImage ? (
          <div className="rounded-2xl bg-neutral-800/60 p-4 ring-1 ring-white/5">
            <div className="flex items-center justify-center">
              {imageUrl ? (
                <img src={imageUrl} alt="image" className="h-44 w-64 rounded-2xl object-cover ring-1 ring-white/5" />
              ) : (
                <div className="h-44 w-64 rounded-2xl bg-neutral-800/60 ring-1 ring-white/5" />
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-neutral-800/60 p-4 text-xl font-semibold text-slate-100 ring-1 ring-white/5">
            {targetLabel}
          </div>
        )}
      </div>
    )
  }

  const options = q.options

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        {options.map((id, i) => {
          const r = byId.get(id)
          const label = r?.label || id

          const isChosen = answer.status !== 'idle' && (answer as any).chosenId === id
          const isCorrect = id === q.targetId

          const variant = answer.status === 'idle'
            ? 'secondary'
            : isChosen
              ? (isCorrect ? 'primary' : 'danger')
              : 'ghost'

          return (
            <button
              key={id}
              onClick={() => onChoose(id)}
              disabled={answer.status !== 'idle'}
              className={
                [
                  'w-full rounded-2xl px-4 py-3 text-left text-sm ring-1 ring-white/5 transition',
                  variant === 'secondary' ? 'bg-neutral-800/70 hover:bg-neutral-700 text-slate-100' : '',
                  variant === 'primary' ? 'bg-neutral-600 text-slate-100' : '',
                  variant === 'danger' ? 'bg-neutral-700 text-slate-100' : '',
                  variant === 'ghost' ? 'bg-transparent text-slate-400' : ''
                ].join(' ')
              }
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">{i + 1}. {label}</div>
                </div>
                {answer.status !== 'idle' && isChosen ? (
                  <div className="text-xs font-semibold">
                    {isCorrect ? '✔' : '✕'}
                  </div>
                ) : null}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
