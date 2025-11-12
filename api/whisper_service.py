import os
from functools import lru_cache
from typing import Optional

try:
    import torch
except ImportError:  # torch is optional; whisper can still run on CPU without it
    torch = None  # type: ignore

import whisper


@lru_cache(maxsize=1)
def load_model() -> whisper.Whisper:
    """Load and cache a Whisper model instance."""
    model_name = os.getenv("WHISPER_MODEL", "base")
    device: Optional[str] = None
    if torch is not None and torch.cuda.is_available():
        device = "cuda:1"
    return whisper.load_model(model_name, device=device or "cpu")


def transcribe_audio_file(path: str) -> str:
    """Run Whisper transcription on a local audio file path."""
    model = load_model()
    result = model.transcribe(path)
    return result.get("text", "").strip()
