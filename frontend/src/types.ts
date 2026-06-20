export interface NewsArticle {
  title: string
  url: string
  snippet: string
  published_date?: string
}

export interface GameInfo {
  date?: string
  home_team?: string
  home_score?: string
  away_team?: string
  away_score?: string
  venue?: string
  headline?: string
}

export interface Brief {
  greeting: string
  ai_news: NewsArticle[]
  cybersecurity_news: NewsArticle[]
  ciso_moves: NewsArticle[]
  warriors: {
    record?: string
    last_game?: GameInfo
    next_game?: GameInfo
    news?: NewsArticle[]
  }
  caitlin_clark: {
    last_game?: GameInfo
    next_game?: GameInfo
    news?: NewsArticle[]
  }
  family_photo: {
    filename: string | null
    total_photos?: number
  }
  cmu_soccer: {
    news?: NewsArticle[]
    athletics_url?: string
    roster_url?: string
  }
  health_summary: string
  generated_at: string
  _db_created_at?: string
}
