import json
import os
import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List

from dotenv import load_dotenv

try:
    import google.generativeai as genai
except ImportError as exc:  # pragma: no cover - defensive guard
    raise RuntimeError(
        "google-generativeai 패키지가 설치되어 있어야 합니다. "
        "pip install google-generativeai 명령으로 설치해 주세요."
    ) from exc

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
PROMPT_PATH = BASE_DIR / "prompt" / "prompt.txt"

# 모델 후보 우선순위
CANDIDATES = [
    os.getenv("GENAI_MODEL") or "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.5-pro",
    "gemini-2.0-flash",
    "gemini-1.5-flash-001",
    "gemini-1.5-pro-001",
]


@dataclass
class DroneModelResponse:
    display_text: str
    payload: Dict[str, Any]
    commands: List[Dict[str, Any]]


def _pick_available_model() -> str:
    """Gemini 모델 리스트에서 generateContent 가능한 첫 후보를 고릅니다."""
    models = genai.list_models()
    names = {m.name.split("/")[-1]: m for m in models}
    available = {
        n
        for n, m in names.items()
        if "generateContent" in getattr(m, "supported_generation_methods", [])
    }
    for cand in CANDIDATES:
        if cand and cand in available:
            return cand
    if available:
        return sorted(available)[0]
    raise RuntimeError("사용 가능한 Gemini 모델을 찾지 못했습니다. 콘솔 설정을 확인하세요.")


@lru_cache(maxsize=1)
def _get_model() -> "genai.GenerativeModel":
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise RuntimeError("환경변수 GOOGLE_API_KEY 가 필요합니다.")
    genai.configure(api_key=api_key)
    model_name = _pick_available_model()
    return genai.GenerativeModel(model_name)


@lru_cache(maxsize=1)
def load_prompt_template() -> str:
    if not PROMPT_PATH.exists():
        raise FileNotFoundError(f"프롬프트 파일을 찾을 수 없습니다: {PROMPT_PATH}")
    return PROMPT_PATH.read_text(encoding="utf-8").strip()


def _extract_json_payload(raw_text: str) -> Dict[str, Any]:
    """모델 출력에서 JSON 오브젝트만 추출해 dict로 반환."""
    text = raw_text.strip()

    # 코드펜스 제거 ```json ... ```
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.S).strip()

    # 전체 파싱 시도
    try:
        return json.loads(text)
    except Exception:
        pass

    # 문자열 내부에서 가장 큰 {} 블록 추출
    match = re.search(r"\{.*\}", text, flags=re.S)
    if match:
        candidate = match.group(0)
        try:
            return json.loads(candidate)
        except Exception:
            pass

    raise ValueError("LLM 응답에서 유효한 JSON을 찾지 못했습니다.")


def generate_drone_command(transcribed_text: str) -> DroneModelResponse:
    """Whisper 텍스트를 받아 드론 명령 JSON과 설명을 생성합니다."""
    text = transcribed_text.strip()
    if not text:
        return DroneModelResponse(display_text="", payload={"commands": []}, commands=[])

    model = _get_model()
    base_prompt = load_prompt_template()
    prompt = f"{base_prompt}\n\n[사용자 발화]\n{text}"
    response = model.generate_content(prompt)
    raw = (response.text or "").strip()
    if not raw:
        raise RuntimeError("LLM 응답이 비어 있습니다.")

    payload = _extract_json_payload(raw)
    commands = payload.get("commands", [])
    return DroneModelResponse(display_text=raw, payload=payload, commands=commands)
