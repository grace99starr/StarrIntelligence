import os
import json
import sqlite3
from datetime import datetime, timezone
from typing import Optional
import anthropic
from dotenv import load_dotenv
from tools import TOOL_DEFINITIONS, dispatch_tool

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
BRIEF_DB = os.getenv("BRIEF_DB", "/tmp/briefs.db")

SYSTEM_PROMPT = """You are generating the morning executive intelligence brief for Brett Starr.

Brett is:
- A serial entrepreneur and founder of a retained executive search firm focused on placing CISOs and senior security leaders
- Deeply immersed in AI and cybersecurity — he reads broadly and wants the real signal, not hype
- A devoted dad who loves watching his daughter Grace play soccer at Carnegie Mellon University
- A passionate family man and photographer — he loves capturing moments with his family and their cats
- A fitness enthusiast who tracks macros and workouts via his Apple Watch
- A die-hard Golden State Warriors fan
- A huge Caitlin Clark and Indiana Fever fan

Your job is to generate a rich, personalized morning brief in JSON format. Use the available tools to fetch today's data, then compile everything.

REQUIRED SECTIONS in your JSON output:
1. greeting — a warm, personal morning greeting for Brett
2. ai_news — 3 of the most important AI developments today, with titles, summaries, and URLs
3. cybersecurity_news — 3 key cybersecurity/threat intel stories
4. ciso_moves — executive leadership moves, open CISO roles, or industry people news (search for this)
5. warriors — object with keys: record (string), last_game (object with away_team, home_team, away_score, home_score, date), next_game (object with away_team, home_team, date, venue), news (array of articles)
6. caitlin_clark — object with keys: last_game (object with away_team, home_team, away_score, home_score, date), next_game (object with away_team, home_team, date), news (array of articles)
6b. cmu_soccer — object with keys: news (array of articles), athletics_url (string), roster_url (string)
7. family_photo — object with key "filename" (single photo filename string from the get_family_photo tool) and "total_photos" (integer)
8. health_summary — workout and macro summary if data is available, otherwise an encouraging note
9. generated_at — ISO timestamp

Tone: Direct, smart, a little warm. Brett is sophisticated — no fluff, give him the real substance. But keep a personal touch since this is from his daughter Grace.

After gathering all data with tools, output ONLY a valid JSON object with those exact keys. Do not wrap in markdown code blocks."""


def init_db():
    os.makedirs(os.path.dirname(BRIEF_DB), exist_ok=True)
    conn = sqlite3.connect(BRIEF_DB)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS briefs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT UNIQUE,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS health_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            data TEXT NOT NULL,
            received_at TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()


def generate_brief() -> dict:
    """Run the Claude agentic loop and return the parsed brief."""
    messages = [
        {
            "role": "user",
            "content": f"Generate today's morning brief. Today's date is {datetime.now().strftime('%A, %B %d, %Y')}. Use all your tools to gather fresh data, then produce the complete JSON brief."
        }
    ]

    while True:
        response = client.messages.create(
            model="claude-opus-4-8",
            max_tokens=8000,
            thinking={"type": "adaptive"},
            system=SYSTEM_PROMPT,
            tools=TOOL_DEFINITIONS,
            messages=messages
        )

        # Collect tool uses from this response
        tool_uses = [b for b in response.content if b.type == "tool_use"]

        if not tool_uses:
            # No more tool calls — extract the final JSON from text blocks
            text_blocks = [b for b in response.content if b.type == "text" and b.text.strip()]
            if text_blocks:
                raw = text_blocks[-1].text
                # Extract the JSON object — find first { and last }
                start = raw.find("{")
                end = raw.rfind("}")
                if start != -1 and end != -1:
                    raw = raw[start:end + 1]
                brief = json.loads(raw)
                return brief
            # No non-empty text block yet — keep looping (Claude may need another turn)
            messages.append({"role": "assistant", "content": response.content})
            messages.append({"role": "user", "content": "Please now output the complete JSON brief based on all the data you've gathered."})
            continue

        # Add Claude's response to messages
        messages.append({"role": "assistant", "content": response.content})

        # Execute all tool calls and build results
        tool_results = []
        for tool_use in tool_uses:
            result_str = dispatch_tool(tool_use.name, tool_use.input)
            tool_results.append({
                "type": "tool_result",
                "tool_use_id": tool_use.id,
                "content": result_str
            })

        messages.append({"role": "user", "content": tool_results})


def save_brief(brief: dict) -> None:
    today = datetime.now().strftime("%Y-%m-%d")
    conn = sqlite3.connect(BRIEF_DB)
    conn.execute("""
        INSERT OR REPLACE INTO briefs (date, content, created_at)
        VALUES (?, ?, ?)
    """, (today, json.dumps(brief), datetime.now(timezone.utc).isoformat()))
    conn.commit()
    conn.close()


def get_latest_brief() -> Optional[dict]:
    conn = sqlite3.connect(BRIEF_DB)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("SELECT content, created_at FROM briefs ORDER BY created_at DESC LIMIT 1")
    row = cur.fetchone()
    conn.close()
    if row:
        brief = json.loads(row["content"])
        brief["_db_created_at"] = row["created_at"]
        return brief
    return None


def run_generation() -> dict:
    """Called by scheduler and manual trigger."""
    init_db()
    brief = generate_brief()
    save_brief(brief)
    return brief
