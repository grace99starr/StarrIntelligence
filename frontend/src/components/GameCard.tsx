interface GameInfo {
  date?: string
  home_team?: string
  home_score?: string | number
  away_team?: string
  away_score?: string | number
  venue?: string
  headline?: string
  matchup?: string
  result?: string
  opponent?: string
  score?: string
}

interface GameCardProps {
  label: string
  game: GameInfo
  showScore?: boolean
}

export default function GameCard({ label, game, showScore = false }: GameCardProps) {
  const rawDate = game.date || ''
  const date = rawDate ? new Date(rawDate).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric'
  }) : ''

  // Build a display string — Claude sometimes returns matchup as a flat string
  const matchupLine = game.matchup
    || (game.away_team && game.home_team ? `${game.away_team} @ ${game.home_team}` : null)
    || (game.opponent ? `vs ${game.opponent}` : null)
    || ''

  const hasScore = showScore && (game.home_score !== undefined || game.away_score !== undefined || game.score !== undefined || game.result !== undefined)

  return (
    <div className="bg-[#1c1c1c] rounded-xl p-4">
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">{label}</p>

      {hasScore ? (
        <div>
          {game.away_team && game.home_team ? (
            <div className="flex items-center justify-between mb-1">
              <div className="text-center">
                <p className="text-xs text-gray-400 truncate max-w-[100px]">{game.away_team}</p>
                <p className="text-2xl font-bold text-gray-100">{game.away_score ?? '–'}</p>
              </div>
              <p className="text-gray-500 text-sm font-mono">vs</p>
              <div className="text-center">
                <p className="text-xs text-gray-400 truncate max-w-[100px]">{game.home_team}</p>
                <p className="text-2xl font-bold text-gray-100">{game.home_score ?? '–'}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-200 mb-1">{game.result || game.score || matchupLine}</p>
          )}
        </div>
      ) : (
        <div>
          <p className="text-sm text-gray-200">{matchupLine}</p>
          {game.venue && <p className="text-xs text-gray-400 mt-1">{game.venue}</p>}
        </div>
      )}

      {date && <p className="text-xs text-gold-500 mt-2">{date}</p>}
      {game.headline && <p className="text-xs text-gray-300 mt-1 italic">{game.headline}</p>}
    </div>
  )
}
