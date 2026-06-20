import { NewsArticle } from '../types'

interface NewsCardProps {
  article: NewsArticle
  index: number
}

export default function NewsCard({ article, index }: NewsCardProps) {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block group"
    >
      <div className="flex gap-3 py-3 border-b border-navy-700 last:border-0 hover:bg-navy-700/30 -mx-2 px-2 rounded-lg transition-colors">
        <span className="text-gold-500 font-mono text-sm font-bold mt-0.5 shrink-0">{String(index + 1).padStart(2, '0')}</span>
        <div>
          <p className="text-sm font-medium text-gray-100 group-hover:text-gold-400 transition-colors leading-snug">
            {article.title}
          </p>
          {article.snippet && (
            <p className="text-xs text-gray-400 mt-1 leading-relaxed line-clamp-2">{article.snippet}</p>
          )}
          {article.published_date && (
            <p className="text-xs text-gray-500 mt-1">{article.published_date}</p>
          )}
        </div>
      </div>
    </a>
  )
}
