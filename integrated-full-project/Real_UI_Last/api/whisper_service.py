import os
from functools import lru_cache
from typing import Optional

try:
    import torch
except ImportError:  # torch optional
    torch = None  # type: ignore

import whisper


@lru_cache(maxsize=1)
def load_model() -> whisper.Whisper:
    """Whisper 모델 1번만 로드해서 재사용."""
    model_name = os.getenv("WHISPER_MODEL", "base")

    # ✅ 안전한 디바이스 선택 (cuda:0 또는 cpu)
    device: Optional[str] = None
    if torch is not None and torch.cuda.is_available():
        # GPU가 1개면 인덱스 0만 존재하므로 무조건 cuda:0
        device = "cuda:0"

    print(f"[WHISPER] loading model '{model_name}' on device={device or 'cpu'}")
    return whisper.load_model(model_name, device=device or "cpu")


def transcribe_audio_file(path: str) -> str:
    """오디오 파일 경로를 받아 Whisper로 STT."""
    print("=" * 60)
    print(f"[WHISPER] transcribe_audio_file START: {path}")

    model = load_model()
    result = model.transcribe(path, language="ko")  # 필요 없으면 language 빼도 됨

    text = (result.get("text") or "").strip()
    print(f"[WHISPER] result text: {text}")
    print("[WHISPER] transcribe_audio_file END")
    print("=" * 60)

    return text
