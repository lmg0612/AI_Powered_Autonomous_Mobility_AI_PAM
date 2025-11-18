import os
import shutil
import tempfile
import traceback

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from model import generate_drone_command
from whisper_service import transcribe_audio_file

app = FastAPI(title="Whisper Voice Transcription Demo")

# 프론트(vite, 3000)에서 호출할 거라 CORS 열어둔다
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


@app.get("/")
async def health():
    # 템플릿 안 쓰고 그냥 살아있는지만 확인
    return {"status": "ok"}


@app.post("/transcribe", response_class=JSONResponse)
async def transcribe_audio(file: UploadFile = File(...)) -> JSONResponse:
    """Receive an audio file, run Whisper transcription, and return the text."""
    if not file.filename:
      raise HTTPException(status_code=400, detail="파일 이름을 찾을 수 없습니다.")

    suffix = os.path.splitext(file.filename)[1].lower()
    if suffix not in {".wav", ".mp3", ".m4a", ".webm", ".ogg", ".flac"}:
        # ffmpeg가 대부분 읽을 거라 일단 확장자는 맞춰둔다
        suffix = ".wav"

    # 업로드 받은 걸 임시파일로 저장
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp_path = tmp.name
        file.file.seek(0)
        shutil.copyfileobj(file.file, tmp)

    text = ""
    command_text = ""

    try:
        # 실제 Whisper
        text = transcribe_audio_file(tmp_path)

        if text:
            try:
                command_text = generate_drone_command(text)
            except RuntimeError as runtime_error:
                print("[RUNTIME ERROR]", runtime_error)
                command_text = f"(명령 생성 실패: {runtime_error})"
            except Exception:
                print("[명령 생성 중 오류]", traceback.format_exc())
                command_text = "(명령 생성 중 알 수 없는 오류가 발생했습니다.)"

    except Exception as exc:
        print("[TRANSCRIBE ERROR]", traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Transcription failed: {exc}") from exc

    finally:
        # 임시파일 제거
        os.remove(tmp_path)

    return JSONResponse(
        {
            "text": text,
            "command": command_text,
        }
    )
