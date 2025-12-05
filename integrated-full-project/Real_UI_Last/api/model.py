import os
import re
import json
from functools import lru_cache
from dotenv import load_dotenv

try:
    import google.generativeai as genai
except ImportError as exc:  # pragma: no cover - defensive guard
    raise RuntimeError(
        "google-generativeai 패키지가 설치되어 있어야 합니다. "
        "pip install google-generativeai 명령으로 설치해 주세요."
    ) from exc


load_dotenv()

CANDIDATES = [
    os.getenv("GENAI_MODEL") or "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.5-pro",
    "gemini-2.0-flash",
    "gemini-1.5-flash-001",
    "gemini-1.5-pro-001",
]

def _pick_available_model() -> str:
    models = genai.list_models()  # 가용 모델과 지원 메서드 확인
    names = {m.name.split("/")[-1]: m for m in models}
    # generateContent 지원 여부 필터
    available = {n for n, m in names.items() if "generateContent" in getattr(m, "supported_generation_methods", [])}
    for cand in CANDIDATES:
        if cand in available:
            return cand
    # 마지막 보루: 첫 번째 generateContent 지원 모델
    if available:
        return sorted(available)[0]
    raise RuntimeError("사용 가능한 Gemini 모델을 찾지 못했습니다. 콘솔/권한/리전 설정을 확인하세요.")

DEFAULT_MODEL = os.getenv("GENAI_MODEL", "gemini-1.5-flash")

@lru_cache(maxsize=1)
def _get_model() -> "genai.GenerativeModel":
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise RuntimeError("환경변수 GOOGLE_API_KEY 가 필요합니다.")
    genai.configure(api_key=api_key)
    model_name = _pick_available_model()
    return genai.GenerativeModel(model_name)

def load_prompt_template() -> str:
    """prompt 폴더 안의 prompt.txt 파일을 읽어 반환"""
    base_dir = os.path.dirname(os.path.abspath(__file__))  # 현재 파일 기준 절대경로
    prompt_path = os.path.join(base_dir, "prompt", "prompt.txt")
    if not os.path.exists(prompt_path):
        raise FileNotFoundError(f"프롬프트 파일을 찾을 수 없습니다: {prompt_path}")
    with open(prompt_path, "r", encoding="utf-8") as f:
        return f.read().strip()

def _extract_json_only(text: str) -> str:
    """모델 출력에서 JSON 오브젝트만 깔끔하게 추출하여 문자열로 반환."""
    s = text.strip()

    # 1) 코드펜스 제거 ```json ... ```
    if s.startswith("```"):
        s = re.sub(r"^```(?:json)?\s*|\s*```$", "", s, flags=re.S).strip()

    # 2) 그대로 파싱 시도
    try:
        obj = json.loads(s)
        return json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
    except Exception:
        pass

    # 3) 문자열 안에서 가장 큰 {} 블록 추출
    m = re.search(r"\{.*\}", s, flags=re.S)
    if m:
        candidate = m.group(0)
        try:
            obj = json.loads(candidate)
            return json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
        except Exception:
            pass

    # 4) 실패 시 에러
    raise ValueError("LLM 응답에서 유효한 JSON을 추출하지 못했습니다.")

def generate_drone_command(transcribed_text: str) -> str:
    """Transform the raw transcription into a rich drone command."""
    text = transcribed_text.strip()
    if not text:
        return ""

    model = _get_model()
    base_prompt = load_prompt_template()
    prompt = f"{base_prompt}\n\n[사용자 발화]\n{text}"
    response = model.generate_content(prompt)
    raw = (response.text or "").strip()
    
    return _extract_json_only(raw)
