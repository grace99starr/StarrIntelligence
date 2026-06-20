import { useState, useEffect, useCallback } from 'react'
import { Brief } from './types'
import Section from './components/Section'
import NewsCard from './components/NewsCard'
import GameCard from './components/GameCard'
import PhotoManager from './components/PhotoManager'

const API_BASE = import.meta.env.VITE_API_URL || ''

// Simple hash-based routing — /photos shows the photo manager
const isPhotosPage = window.location.pathname === '/photos'

export default function App() {
  if (isPhotosPage) return <PhotoManager />

  const [brief, setBrief] = useState<Brief | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const fetchBrief = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/brief`)
      const data = await res.json()
      if (data.brief) setBrief(data.brief)
      else setMessage(data.message || '')
    } catch {
      setError('Could not connect to backend. Make sure it\'s running.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBrief()
  }, [fetchBrief])

  // Poll for new brief while generating
  useEffect(() => {
    if (!generating) return
    const interval = setInterval(async () => {
      const res = await fetch(`${API_BASE}/api/status`)
      const data = await res.json()
      if (!data.running) {
        setGenerating(false)
        fetchBrief()
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [generating, fetchBrief])

  const handleGenerate = async () => {
    setGenerating(true)
    setError('')
    try {
      await fetch(`${API_BASE}/api/generate`, { method: 'POST' })
    } catch {
      setError('Failed to trigger generation.')
      setGenerating(false)
    }
  }

  const generatedTime = brief?.generated_at
    ? new Date(brief.generated_at).toLocaleString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric',
        hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago', timeZoneName: 'short'
      })
    : ''

  return (
    <div className="min-h-screen bg-navy-900 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-navy-900/95 backdrop-blur border-b border-navy-700">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-gold-400 text-xl">⭐</span>
            <div>
              <h1 className="text-sm font-bold tracking-widest text-white uppercase">Starr Intelligence</h1>
              <p className="text-xs text-gray-500">Executive Morning Brief</p>
            </div>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-gold-500 hover:bg-gold-400 disabled:bg-navy-600 disabled:text-gray-400 text-navy-900 font-semibold text-xs rounded-lg transition-colors"
          >
            {generating ? (
              <>
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Generating…
              </>
            ) : (
              <>↺ Generate Now</>
            )}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        {loading && (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400 text-sm">Loading your brief…</p>
          </div>
        )}

        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 text-red-300 text-sm mb-6">
            {error}
          </div>
        )}

        {!loading && !brief && (
          <div className="flex flex-col items-center justify-center py-32 gap-6 text-center">
            <div className="text-6xl">⭐</div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Good morning, Brett.</h2>
              <p className="text-gray-400 text-sm max-w-sm">
                {message || 'No brief has been generated yet. Click "Generate Now" to create today\'s brief.'}
              </p>
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-6 py-3 bg-gold-500 hover:bg-gold-400 text-navy-900 font-bold rounded-xl transition-colors"
            >
              {generating ? 'Generating…' : 'Generate First Brief'}
            </button>
          </div>
        )}

        {brief && (
          <div className="space-y-6">
            {/* Greeting + timestamp */}
            <div className="bg-gradient-to-r from-navy-700 to-navy-800 rounded-2xl p-6 border border-navy-600">
              <p className="text-xs text-gold-400 font-mono tracking-widest uppercase mb-3">{generatedTime}</p>
              <p className="text-xl font-medium text-gray-100 leading-relaxed">{brief.greeting}</p>
            </div>

            {/* 2-col grid for main content */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* AI News */}
              <Section icon="🤖" title="Artificial Intelligence" accent="border-blue-500">
                {brief.ai_news?.length > 0 ? (
                  brief.ai_news.map((a, i) => <NewsCard key={i} article={a} index={i} />)
                ) : (
                  <p className="text-gray-500 text-sm">No AI news today.</p>
                )}
              </Section>

              {/* Cybersecurity */}
              <Section icon="🔒" title="Cybersecurity" accent="border-red-500">
                {brief.cybersecurity_news?.length > 0 ? (
                  brief.cybersecurity_news.map((a, i) => <NewsCard key={i} article={a} index={i} />)
                ) : (
                  <p className="text-gray-500 text-sm">No cybersecurity news today.</p>
                )}
              </Section>

              {/* CISO Moves */}
              <Section icon="👔" title="CISO & Executive Moves" accent="border-purple-500">
                {brief.ciso_moves?.length > 0 ? (
                  brief.ciso_moves.map((a, i) => <NewsCard key={i} article={a} index={i} />)
                ) : (
                  <p className="text-gray-500 text-sm">No executive moves today.</p>
                )}
              </Section>

              {/* Family Photo */}
              <Section icon="📸" title="Photo of the Day" accent="border-pink-500" headerRight={<a href="/photos" className="text-xs text-gray-400 hover:text-gold-400 transition-colors underline underline-offset-2">Manage →</a>}>
                {brief.family_photo?.filename ? (
                  <div className="flex flex-col gap-3">
                    <a
                      href={`${API_BASE}/api/photo/${encodeURIComponent(brief.family_photo.filename)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block group"
                    >
                      <img
                        src={`${API_BASE}/api/photo/${encodeURIComponent(brief.family_photo.filename)}`}
                        alt="Family photo"
                        className="w-full object-cover rounded-xl max-h-72 group-hover:opacity-90 transition-opacity cursor-zoom-in"
                      />
                    </a>
                    {brief.family_photo.total_photos && (
                      <p className="text-xs text-gray-500 text-center">{brief.family_photo.total_photos} photos in library</p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-4xl mb-2">🐱</p>
                    <p className="text-gray-500 text-sm">Add family photos to the <code className="text-gold-400">photos/</code> folder to feature them here.</p>
                  </div>
                )}
              </Section>
            </div>

            {/* Warriors — full width */}
            <Section icon="🏀" title="Golden State Warriors" accent="border-yellow-400">
              <div className="flex items-center gap-3 mb-4">
                {brief.warriors?.record && (
                  <span className="text-xs bg-gold-500/20 text-gold-400 px-2 py-1 rounded-full font-mono">
                    {brief.warriors.record}
                  </span>
                )}
                <a
                  href="https://www.nba.com/schedule?team=GSW"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-400 hover:text-gold-400 transition-colors underline underline-offset-2"
                >
                  Full Schedule →
                </a>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {brief.warriors?.last_game && (
                  <GameCard label="Last Game" game={brief.warriors.last_game} showScore />
                )}
                {brief.warriors?.next_game && (
                  <GameCard label="Next Game" game={brief.warriors.next_game} />
                )}
              </div>
              {brief.warriors?.news?.map((a, i) => (
                <NewsCard key={i} article={a} index={i} />
              ))}
            </Section>

            {/* Caitlin Clark — full width */}
            <Section icon="🏅" title="Caitlin Clark / Indiana Fever" accent="border-yellow-300">
              <div className="mb-4">
                <a
                  href="https://www.wnba.com/team/indiana-fever/schedule"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-400 hover:text-gold-400 transition-colors underline underline-offset-2"
                >
                  Full Schedule →
                </a>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                {brief.caitlin_clark?.last_game && (
                  <GameCard label="Last Game" game={brief.caitlin_clark.last_game} showScore />
                )}
                {brief.caitlin_clark?.next_game && (
                  <GameCard label="Next Game" game={brief.caitlin_clark.next_game} />
                )}
              </div>
              {brief.caitlin_clark?.news?.map((a, i) => (
                <NewsCard key={i} article={a} index={i} />
              ))}
            </Section>

            {/* CMU Soccer */}
            <Section icon="⚽" title="CMU Women's Soccer — Grace #4" accent="border-red-500">
              <div className="flex items-center gap-4 mb-4">
                <a
                  href="https://athletics.cmu.edu/sports/wsoc/index"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-400 hover:text-gold-400 transition-colors underline underline-offset-2"
                >
                  CMU Athletics →
                </a>
                <a
                  href="https://athletics.cmu.edu/sports/wsoc/roster"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-400 hover:text-gold-400 transition-colors underline underline-offset-2"
                >
                  Roster & Stats →
                </a>
              </div>
              {brief.cmu_soccer?.news?.length > 0 ? (
                brief.cmu_soccer.news.map((a, i) => <NewsCard key={i} article={a} index={i} />)
              ) : (
                <p className="text-gray-500 text-sm">No recent CMU soccer news.</p>
              )}
            </Section>

            {/* Health / Workout */}
            <Section icon="💪" title="Fitness & Health" accent="border-green-500">
              {typeof brief.health_summary === 'string' ? (
                <p className="text-sm text-gray-300 leading-relaxed">{brief.health_summary}</p>
              ) : (
                <p className="text-gray-500 text-sm">No health data available yet.</p>
              )}
            </Section>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-navy-700 py-6 text-center">
        <p className="text-xs text-gray-500">
          Built by Grace&nbsp;•&nbsp;Father's Day 2026&nbsp;•&nbsp;
          <span className="text-gold-500">⭐ Starr Intelligence</span>
        </p>
      </footer>
    </div>
  )
}
