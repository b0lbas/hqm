import React from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import HomePage from './pages/HomePage'
import PlayPage from './pages/PlayPage'

export default function App() {
  const location = useLocation()
  const isPlay = location.pathname.startsWith('/play/')

  return (
    <div className="min-h-screen app-bg">
      <div className={isPlay ? 'mx-auto min-h-screen w-full' : 'mx-auto max-w-[1200px] px-4 py-4'}>
        <main className={isPlay ? '' : 'pt-2'}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/play/:quizId" element={<PlayPage />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
