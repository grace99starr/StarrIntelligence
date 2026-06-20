import os
import json
import sqlite3
import hmac
import hashlib
from datetime import datetime, timezone
from contextlib import asynccontextmanager

import aiofiles
from fastapi import FastAPI, HTTPException, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from dotenv import load_dotenv

from agent import init_db, run_generation, get_latest_brief
from tools import BRIEF_DB

load_dotenv()

PHOTOS_DIR = os.path.abspath(os.getenv("PHOTOS_DIR", "../photos"))
HEALTH_SECRET = os.getenv("HEALTH_WEBHOOK_SECRET", "")

scheduler = AsyncIOScheduler()
generation_status = {"running": False, "last_error": None}


async def scheduled_generation():
    if generation_status["running"]:
        return
    generation_status["running"] = True
    generation_status["last_error"] = None
    try:
        run_generation()
    except Exception as e:
        generation_status["last_error"] = str(e)
    finally:
        generation_status["running"] = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    # 1 AM CST = 7 AM UTC
    scheduler.add_job(
        scheduled_generation,
        CronTrigger(hour=7, minute=0, timezone="UTC"),
        id="daily_brief",
        replace_existing=True
    )
    scheduler.start()
    yield
    scheduler.shutdown()


app = FastAPI(title="Starr Intelligence API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/brief")
async def get_brief():
    brief = get_latest_brief()
    if not brief:
        return {"brief": None, "message": "No brief generated yet. Click 'Generate Now' or wait for the 1 AM auto-generation."}
    return {"brief": brief}


@app.post("/api/generate")
async def trigger_generation(background_tasks: BackgroundTasks):
    if generation_status["running"]:
        return {"status": "already_running", "message": "Brief generation is already in progress."}
    background_tasks.add_task(scheduled_generation)
    return {"status": "started", "message": "Generating brief... check back in about 30 seconds."}


@app.get("/api/status")
async def get_status():
    return {
        "running": generation_status["running"],
        "last_error": generation_status["last_error"],
        "scheduler_running": scheduler.running
    }


@app.get("/api/photos")
async def list_photos():
    if not os.path.isdir(PHOTOS_DIR):
        return {"photos": []}
    extensions = {".jpg", ".jpeg", ".png", ".gif", ".heic", ".webp"}
    files = [f for f in os.listdir(PHOTOS_DIR) if os.path.splitext(f.lower())[1] in extensions]
    photos = [{"filename": f, "url": f"/api/photo/{f}"} for f in sorted(files)]
    return {"photos": photos}


@app.post("/api/photos/upload")
async def upload_photos(request: Request, files: list = None):
    from fastapi import UploadFile, File
    auth = request.headers.get("Authorization", "")
    if HEALTH_SECRET and auth != f"Bearer {HEALTH_SECRET}":
        raise HTTPException(status_code=401, detail="Unauthorized")

    form = await request.form()
    uploaded = 0
    os.makedirs(PHOTOS_DIR, exist_ok=True)

    for key in form:
        file = form[key]
        if hasattr(file, "filename") and file.filename:
            safe_name = os.path.basename(file.filename)
            dest = os.path.join(PHOTOS_DIR, safe_name)
            content = await file.read()
            with open(dest, "wb") as f:
                f.write(content)
            uploaded += 1

    return {"uploaded": uploaded}


@app.delete("/api/photos/{filename}")
async def delete_photo(filename: str, request: Request):
    auth = request.headers.get("Authorization", "")
    if HEALTH_SECRET and auth != f"Bearer {HEALTH_SECRET}":
        raise HTTPException(status_code=401, detail="Unauthorized")
    safe_name = os.path.basename(filename)
    path = os.path.join(PHOTOS_DIR, safe_name)
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="Not found")
    os.remove(path)
    return {"deleted": safe_name}


@app.get("/api/photo/{filename}")
async def serve_photo(filename: str):
    # Prevent path traversal
    safe_name = os.path.basename(filename)
    path = os.path.join(PHOTOS_DIR, safe_name)
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="Photo not found")
    return FileResponse(path)


@app.post("/api/health-webhook")
async def health_webhook(request: Request):
    """
    Endpoint for Health Auto Export iOS app.
    Configure the app to POST to this URL with your webhook secret as a Bearer token.
    """
    auth = request.headers.get("Authorization", "")
    if HEALTH_SECRET and auth != f"Bearer {HEALTH_SECRET}":
        raise HTTPException(status_code=401, detail="Unauthorized")

    body = await request.json()

    conn = sqlite3.connect(BRIEF_DB)
    conn.execute(
        "INSERT INTO health_data (data, received_at) VALUES (?, ?)",
        (json.dumps(body), datetime.now(timezone.utc).isoformat())
    )
    conn.commit()
    conn.close()

    return {"status": "ok", "received_at": datetime.now(timezone.utc).isoformat()}


@app.get("/api/health-data")
async def get_health_data_endpoint():
    conn = sqlite3.connect(BRIEF_DB)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    try:
        cur.execute("SELECT data, received_at FROM health_data ORDER BY received_at DESC LIMIT 1")
        row = cur.fetchone()
    except sqlite3.OperationalError:
        return {"data": None}
    finally:
        conn.close()
    if row:
        return {"data": json.loads(row["data"]), "received_at": row["received_at"]}
    return {"data": None}


@app.get("/health")
async def health_check():
    return {"status": "ok", "time": datetime.now(timezone.utc).isoformat()}
