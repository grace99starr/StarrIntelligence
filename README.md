# ⭐ Starr Intelligence

A personalized AI morning brief app built as a Father's Day gift for Brett Starr.

Every morning at 1 AM CST, an AI agent automatically generates a rich, personalized daily brief — delivered fresh at starr-intelligence.vercel.app.

## What's in the brief

- **🤖 AI News** — Top AI developments of the day
- **🔒 Cybersecurity** — Key threat intel and security stories
- **👔 CISO & Executive Moves** — Leadership moves and open roles in security
- **📸 Photo of the Day** — A random family photo from the library
- **🏀 Golden State Warriors** — Last game, next game, and news
- **🏅 Caitlin Clark / Indiana Fever** — Latest scores and news
- **⚽ CMU Women's Soccer** — Grace #33, Carnegie Mellon updates
- **💪 Health & Fitness** — Apple Watch data via Health Auto Export

## Stack

| Layer | Tech |
|---|---|
| Frontend | React + Vite + TypeScript + Tailwind CSS |
| Backend | FastAPI + Python |
| AI | Claude Opus 4.8 with adaptive thinking + tool use |
| Search | Tavily API |
| Scheduling | APScheduler (1 AM CST daily) |
| Database | SQLite on Railway persistent volume |
| Photos | Stored on Railway persistent volume |
| Deployment | Vercel (frontend) + Railway (backend) |

## Photo Library

Family photos are managed at `/photos` (password protected). Photos rotate daily — one is randomly selected for each brief.

## Health Data

Apple Watch data is pushed via Health Auto Export app using a webhook endpoint on the backend.

---

*Built with ❤️ by Grace — Father's Day 2026*

---

🤖 Built with [Claude Code](https://claude.ai/code)
