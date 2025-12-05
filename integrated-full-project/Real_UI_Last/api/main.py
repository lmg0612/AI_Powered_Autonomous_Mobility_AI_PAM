# main.py
import os
import shutil
import tempfile
import traceback
import json
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from model import generate_drone_command
from whisper_service import transcribe_audio_file
from api import router as telemetry_router

BASE_DIR = Path(__file__).resolve().parent
COMMAND_DIR = BASE_DIR / "commands"
COMMAND_DIR.mkdir(exist_ok=True)
MAX_COMMAND_FILES = 50 

app = FastAPI(title="Whisper Voice Transcription API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(telemetry_router)

# JSON 저장 경로 (없으면 자동 생성)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
COMMAND_OUTPUT_DIR = os.getenv(
    "COMMAND_OUTPUT_DIR",
    os.path.join(BASE_DIR, "commands"),
)

def save_command_json(command_text: str) -> None:
    """
    LLM이 만든 JSON 문자열을 검증 후 파일로 저장.
    저장 후에는 commands 폴더 내 JSON 파일 개수가
    MAX_COMMAND_FILES 개를 넘지 않도록 오래된 파일부터 삭제한다.
    """
    if not command_text or command_text == "(명령 생성 실패)":
        return

    # 1) JSON 파싱 검증
    try:
        obj = json.loads(command_text)
    except Exception as exc:
        print("[COMMAND] invalid JSON, skip saving:", exc)
        return

    # 2) 새 파일 저장
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    path = COMMAND_DIR / f"command_{ts}.json"

    try:
        with path.open("w", encoding="utf-8") as f:
            json.dump(obj, f, ensure_ascii=False, indent=2)
        print(f"[COMMAND] saved JSON -> {path}")
    except Exception as exc:
        print("[COMMAND] failed to save file:", exc)
        return

    # 3) 개수 제한: 최신 파일만 MAX_COMMAND_FILES 개 남기고 나머지 삭제
    try:
        files = sorted(
            COMMAND_DIR.glob("command_*.json"),
            key=lambda p: p.stat().st_mtime,
            reverse=True,  # 최신 순
        )
        # 인덱스 0~MAX_COMMAND_FILES-1 까지는 유지, 나머지(옛날 것) 삭제
        for old in files[MAX_COMMAND_FILES:]:
            try:
                old.unlink()
                print(f"[COMMAND] removed old JSON -> {old}")
            except Exception as exc:
                print(f"[COMMAND] failed to remove {old}: {exc}")
    except Exception as exc:
        print("[COMMAND] cleanup error:", exc)

@app.post("/transcribe", response_class=JSONResponse)
async def transcribe_audio(file: UploadFile = File(...)) -> JSONResponse:
    if not file.filename:
        raise HTTPException(status_code=400, detail="파일 이름을 찾을 수 없습니다.")

    suffix = os.path.splitext(file.filename)[1].lower()
    if suffix not in {".wav", ".mp3", ".m4a", ".webm", ".ogg", ".flac"}:
        suffix = ".wav"

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp_path = tmp.name
        file.file.seek(0)
        shutil.copyfileobj(file.file, tmp)

    text = ""
    command_text = ""

    try:
        # 1) Whisper STT
        text = transcribe_audio_file(tmp_path)

        # 2) LLM 호출 및 JSON 생성
        if text:
            try:
                command_text = generate_drone_command(text)
                # 3) JSON 파일로 저장
                save_command_json(command_text)
            except Exception as e:
                print("[COMMAND ERROR]", e)
                command_text = "(명령 생성 실패)"
    except Exception as exc:
        print("[TRANSCRIBE ERROR]", traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Transcription failed: {exc}") from exc
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

    # 프론트로는 그대로 text + command(JSON string)를 돌려준다.
    return JSONResponse({"text": text, "command": command_text})
