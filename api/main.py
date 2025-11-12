import asyncio
import logging
import os
import shutil
import tempfile
import traceback
from typing import Any, Dict, List

from fastapi import FastAPI, File, HTTPException, Query, Request, UploadFile
from fastapi.responses import HTMLResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from command_runner import JobStatus, execution_manager, save_command_payload
from model import DroneModelResponse, generate_drone_command
from whisper_service import transcribe_audio_file

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger("voice-drone-api")

app = FastAPI(title="Whisper Voice Transcription Demo")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))
app.mount(
    "/static",
    StaticFiles(directory=os.path.join(BASE_DIR, "static")),
    name="static",
)


def _emit_debug_event(event: str, payload: Dict[str, Any] | None = None) -> None:
    """Centralized debug logging so we can grep terminal output easily."""
    info = {"event": event}
    if payload:
        info.update(payload)
    logger.info(info)


@app.get("/", response_class=HTMLResponse)
async def index(request: Request) -> HTMLResponse:
    """Serve the demo page."""
    return templates.TemplateResponse(
        "index.html",
        {"request": request},
    )


@app.post("/transcribe", response_class=JSONResponse)
async def transcribe_audio(file: UploadFile = File(...)) -> JSONResponse:
    """Receive an audio file, run Whisper transcription, and return the text."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="파일 이름을 찾을 수 없습니다.")

    _emit_debug_event(
        "transcribe_received",
        {"filename": file.filename, "content_type": file.content_type, "size": file.size},
    )

    suffix = os.path.splitext(file.filename)[1].lower()
    if suffix not in {".wav", ".mp3", ".m4a", ".webm", ".ogg", ".flac"}:
        suffix = ".wav"  # Whisper can still read most containers via ffmpeg.

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp_path = tmp.name
        file.file.seek(0)
        shutil.copyfileobj(file.file, tmp)

    text = ""
    command_text = ""
    command_payload = None
    job_id = None
    command_file = None
    try:
        text = transcribe_audio_file(tmp_path)
        if text:
            try:
                plan: DroneModelResponse = generate_drone_command(text)
                command_text = plan.display_text
                command_payload = plan.payload
                if plan.commands:
                    try:
                        job_id = execution_manager.start_job(plan.commands)
                        command_file_path = save_command_payload(job_id, plan.payload)
                        command_file = os.path.relpath(command_file_path, BASE_DIR)
                        _emit_debug_event(
                            "job_started",
                            {
                                "job_id": job_id,
                                "commands": len(plan.commands),
                                "command_file": command_file,
                            },
                        )
                    except ValueError as job_error:
                        print("[JOB ERROR]", job_error)
                else:
                    command_text = command_text or "(명령이 생성되지 않았습니다.)"
            except RuntimeError as runtime_error:
                print("[RUNTIME ERROR]", runtime_error)
                command_text = f"(명령 생성 실패: {runtime_error})"
            except Exception:
                print("[명령 생성 중 오류]", traceback.format_exc())
                command_text = "(명령 생성 중 알 수 없는 오류가 발생했습니다.)"

    except Exception as exc:
        # 터미널에 전체 에러 스택 출력
        print("[TRANSCRIBE ERROR]", traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Transcription failed: {exc}") from exc

    finally:
        os.remove(tmp_path)

    _emit_debug_event(
        "transcribe_response",
        {
            "job_id": job_id,
            "text_len": len(text or ""),
            "command_summary": (command_text[:120] + "...") if command_text and len(command_text) > 120 else command_text,
        },
    )

    return JSONResponse(
        {
            "text": text,
            "command": command_text,
            "command_payload": command_payload,
            "commands": command_payload.get("commands", []) if command_payload else [],
            "job_id": job_id,
            "command_file": command_file,
        }
    )


@app.get("/jobs/{job_id}/logs", response_class=JSONResponse)
async def get_job_logs(job_id: str, start: int = Query(0, alias="from", ge=0)) -> JSONResponse:
    try:
        job_logs = execution_manager.fetch_logs(job_id, start)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="존재하지 않는 작업 ID 입니다.") from exc

    _emit_debug_event(
        "job_logs_chunk",
        {
            "job_id": job_id,
            "requested_from": start,
            "returned_lines": len(job_logs.logs),
            "next_index": job_logs.next_index,
            "status": job_logs.status.value,
        },
    )

    return JSONResponse(
        {
            "logs": job_logs.logs,
            "next_index": job_logs.next_index,
            "status": job_logs.status.value,
        }
    )


@app.get("/jobs/{job_id}/stream")
async def stream_job_logs(job_id: str) -> StreamingResponse:
    async def event_generator():
        next_index = 0
        _emit_debug_event("job_stream_begin", {"job_id": job_id})
        while True:
            try:
                job_logs = execution_manager.fetch_logs(job_id, next_index)
            except KeyError:
                _emit_debug_event("job_stream_missing", {"job_id": job_id})
                yield "event: error\ndata: not_found\n\n"
                break

            if job_logs.logs:
                for line in job_logs.logs:
                    yield f"data: {line}\n\n"
                next_index = job_logs.next_index
                _emit_debug_event(
                    "job_stream_chunk",
                    {"job_id": job_id, "lines": len(job_logs.logs), "next_index": next_index},
                )

            if job_logs.status in {JobStatus.COMPLETED, JobStatus.FAILED}:
                yield f"event: status\ndata: {job_logs.status.value}\n\n"
                _emit_debug_event("job_stream_end", {"job_id": job_id, "status": job_logs.status.value})
                break

            await asyncio.sleep(1)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


from fastapi import Query

@app.get("/command-logs/latest", response_class=JSONResponse)
async def latest_command_log(
    from_index: int = Query(0, alias="from", ge=0),
    current_job_id: str | None = Query(None, alias="job_id"),
    running_only: bool = Query(False, alias="running_only"),
) -> JSONResponse:
    job_id = execution_manager.get_latest_job_id()
    if not job_id:
        return JSONResponse({"job_id": None, "logs": [], "next_index": 0, "status": None, "reset": False})

    try:
      start_index = from_index if current_job_id == job_id else 0
      job_logs = execution_manager.fetch_logs(job_id, start_index)
    except KeyError as exc:
      raise HTTPException(status_code=404, detail="로그 파일을 찾을 수 없습니다.") from exc

    if running_only and job_logs.status.value != "running":
        return JSONResponse({"job_id": None, "logs": [], "next_index": 0, "status": None, "reset": False})

    return JSONResponse({
      "job_id": job_id,
      "logs": job_logs.logs,
      "next_index": job_logs.next_index,
      "status": job_logs.status.value,
      "reset": current_job_id != job_id,
    })
