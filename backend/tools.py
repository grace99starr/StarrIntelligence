import os
import random
import sqlite3
import json
import httpx
from datetime import datetime, timezone
from tavily import TavilyClient
from dotenv import load_dotenv

load_dotenv()

tavily = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))
PHOTOS_DIR = os.getenv("PHOTOS_DIR", "../photos")
BRIEF_DB = os.getenv("BRIEF_DB", "briefs.db")
HEALTH_WEBHOOK_SECRET = os.getenv("HEALTH_WEBHOOK_SECRET", "")

TOOL_DEFINITIONS = [
    {
        "name": "search_news",
        "description": "Search for recent news articles on a given topic using Tavily. Use this to get AI news, cybersecurity news, and CISO executive leadership news.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "The search query"},
                "max_results": {"type": "integer", "description": "Number of results (1-5)", "default": 3}
            },
            "required": ["query"]
        }
    },
    {
        "name": "get_warriors_score",
        "description": "Get the Golden State Warriors' most recent game score and schedule info from ESPN.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": []
        }
    },
    {
        "name": "get_caitlin_clark_update",
        "description": "Get the latest news and stats for Caitlin Clark and the Indiana Fever from ESPN and news sources.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": []
        }
    },
    {
        "name": "get_family_photo",
        "description": "Select 3 random family photos to feature in today's brief. Returns a list of filenames.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": []
        }
    },
    {
        "name": "get_health_data",
        "description": "Retrieve the most recent health and workout data submitted from the Apple Watch / Health Auto Export app.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": []
        }
    }
]


def search_news(query: str, max_results: int = 3) -> dict:
    try:
        response = tavily.search(
            query=query,
            max_results=max_results,
            search_depth="advanced",
            include_answer=True
        )
        articles = []
        for r in response.get("results", []):
            articles.append({
                "title": r.get("title"),
                "url": r.get("url"),
                "snippet": r.get("content", "")[:300],
                "published_date": r.get("published_date")
            })
        return {
            "answer": response.get("answer"),
            "articles": articles
        }
    except Exception as e:
        return {"error": str(e), "articles": []}


def get_warriors_score() -> dict:
    try:
        # ESPN unofficial scoreboard API
        url = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/11"
        with httpx.Client(timeout=10) as client:
            r = client.get(url)
            team_data = r.json()

        # Get recent schedule
        schedule_url = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/11/schedule"
        with httpx.Client(timeout=10) as client:
            r = client.get(schedule_url)
            schedule = r.json()

        events = schedule.get("events", [])
        completed = [e for e in events if e.get("competitions", [{}])[0].get("status", {}).get("type", {}).get("completed", False)]
        upcoming = [e for e in events if not e.get("competitions", [{}])[0].get("status", {}).get("type", {}).get("completed", False)]

        result = {}

        if completed:
            last = completed[-1]
            comp = last.get("competitions", [{}])[0]
            competitors = comp.get("competitors", [])
            home = next((c for c in competitors if c.get("homeAway") == "home"), {})
            away = next((c for c in competitors if c.get("homeAway") == "away"), {})
            result["last_game"] = {
                "date": last.get("date"),
                "home_team": home.get("team", {}).get("displayName"),
                "home_score": home.get("score"),
                "away_team": away.get("team", {}).get("displayName"),
                "away_score": away.get("score"),
                "headline": comp.get("notes", [{}])[0].get("headline", "") if comp.get("notes") else ""
            }

        if upcoming:
            nxt = upcoming[0]
            comp = nxt.get("competitions", [{}])[0]
            competitors = comp.get("competitors", [])
            home = next((c for c in competitors if c.get("homeAway") == "home"), {})
            away = next((c for c in competitors if c.get("homeAway") == "away"), {})
            result["next_game"] = {
                "date": nxt.get("date"),
                "home_team": home.get("team", {}).get("displayName"),
                "away_team": away.get("team", {}).get("displayName"),
                "venue": comp.get("venue", {}).get("fullName")
            }

        record = team_data.get("team", {}).get("record", {}).get("items", [])
        if record:
            result["record"] = record[0].get("summary", "")

        return result
    except Exception as e:
        return {"error": str(e)}


def get_caitlin_clark_update() -> dict:
    try:
        # WNBA scoreboard
        url = "https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/teams/5/schedule"
        with httpx.Client(timeout=10) as client:
            r = client.get(url)
            schedule = r.json()

        events = schedule.get("events", [])
        completed = [e for e in events if e.get("competitions", [{}])[0].get("status", {}).get("type", {}).get("completed", False)]
        upcoming = [e for e in events if not e.get("competitions", [{}])[0].get("status", {}).get("type", {}).get("completed", False)]

        result = {}

        if completed:
            last = completed[-1]
            comp = last.get("competitions", [{}])[0]
            competitors = comp.get("competitors", [])
            home = next((c for c in competitors if c.get("homeAway") == "home"), {})
            away = next((c for c in competitors if c.get("homeAway") == "away"), {})
            result["last_game"] = {
                "date": last.get("date"),
                "home_team": home.get("team", {}).get("displayName"),
                "home_score": home.get("score"),
                "away_team": away.get("team", {}).get("displayName"),
                "away_score": away.get("score"),
            }

        if upcoming:
            nxt = upcoming[0]
            comp = nxt.get("competitions", [{}])[0]
            competitors = comp.get("competitors", [])
            home = next((c for c in competitors if c.get("homeAway") == "home"), {})
            away = next((c for c in competitors if c.get("homeAway") == "away"), {})
            result["next_game"] = {
                "date": nxt.get("date"),
                "home_team": home.get("team", {}).get("displayName"),
                "away_team": away.get("team", {}).get("displayName"),
            }

        # Also grab a news search
        news = search_news("Caitlin Clark Indiana Fever game", max_results=2)
        result["news"] = news.get("articles", [])

        return result
    except Exception as e:
        return {"error": str(e)}


def get_family_photo() -> dict:
    photos_path = os.path.abspath(PHOTOS_DIR)
    if not os.path.isdir(photos_path):
        return {"error": "Photos directory not found", "filename": None}

    extensions = {".jpg", ".jpeg", ".png", ".gif", ".heic", ".webp"}
    photos = [f for f in os.listdir(photos_path) if os.path.splitext(f.lower())[1] in extensions]

    if not photos:
        return {"error": "No photos found in directory", "filenames": []}

    count = min(3, len(photos))
    chosen = random.sample(photos, count)
    return {"filenames": chosen, "total_photos": len(photos)}


def get_health_data() -> dict:
    conn = sqlite3.connect(BRIEF_DB)
    try:
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute("""
            SELECT data, received_at FROM health_data
            ORDER BY received_at DESC LIMIT 1
        """)
        row = cur.fetchone()
        if row:
            return {
                "data": json.loads(row["data"]),
                "received_at": row["received_at"]
            }
        return {"data": None, "message": "No health data submitted yet. Set up Health Auto Export on iPhone to push data here."}
    except sqlite3.OperationalError:
        return {"data": None, "message": "Health data table not yet created."}
    finally:
        conn.close()


def dispatch_tool(name: str, inputs: dict) -> str:
    if name == "search_news":
        result = search_news(inputs["query"], inputs.get("max_results", 3))
    elif name == "get_warriors_score":
        result = get_warriors_score()
    elif name == "get_caitlin_clark_update":
        result = get_caitlin_clark_update()
    elif name == "get_family_photo":
        result = get_family_photo()
    elif name == "get_health_data":
        result = get_health_data()
    else:
        result = {"error": f"Unknown tool: {name}"}
    return json.dumps(result)
