# LLM 기반 음성 제어 드론 GCS

> 음성 명령을 STT로 받아 LLM이 드론 명령(JSON)으로 바꾸고, 시뮬레이터의 드론이 실행하는 지상 관제(GCS) 연구 프로젝트

## 개요
드론을 조작하려면 조종기나 전용 GCS 화면을 익혀야 합니다. 이 프로젝트는 "이륙하고 고도 10미터 유지"처럼 **말로 내린 명령을 드론이 실행할 수 있는 구조화된 명령으로 바꾸는 파이프라인**을 단계별로 실험하고 연결했습니다.

```
음성 입력 → STT(음성 인식) → LLM(의도 해석 → JSON 명령) → 명령 파서 → DroneKit-SITL / Tello 실행
```

## 핵심 요약

- 음성 인식 엔진 3종(Google SR · Vosk · Whisper)을 같은 드론 명령으로 비교해 **정확도와 응답 시간의 차이**를 확인했습니다.
- 한국어 LLM 3종을 **LoRA로 파인튜닝**해 한국어 명령을 Tello SDK 명령어로 바꾸는 성능을 비교했습니다.
- 시뮬레이터 연동에서는 Gemini에 **JSON 배열만 출력하도록 한 프롬프트**를 주고, 파서가 그 JSON을 DroneKit 제어 함수로 연결해 SITL 드론을 움직였습니다.

## 구현 포인트

| 영역 | 구현 내용 | 관련 파일 |
|---|---|---|
| STT 비교 | 엔진별 녹음·인식 스크립트, 명령어 3개 실험 결과와 화면 기록 | `STT/test_*.py`, `STT/STT-report/` |
| 파인튜닝 | 한국어 명령 ↔ Tello 명령어 데이터셋 118쌍, SFTTrainer + LoRA | `LLM/` |
| 명령 생성 | "command·parameters 객체의 JSON 배열만 출력" 규칙과 예시를 담은 프롬프트 | `SITL/prompts.py`, `SITL/llm_interface.py` |
| 실행 | JSON 파싱 → 기능별 제어 함수 호출 → DroneKit으로 SITL 연결 | `SITL/command_parser.py`, `SITL/drone_control.py` |
| 음성 API | 음성 파일 업로드 → Whisper 전사 → Gemini 명령 생성 → 실행 상태·기록 관리 | `api/` |
| 임무 계획 | 자연어 임무 → PDDL problem·plan 생성과 검사 | `NLPDDL/` |

## 진행 내용

### 1. STT 엔진 비교 — `STT/`
드론 명령 3개("이륙해", "이륙하고 고도 10미터 유지", "앞으로 100미터 전진")로 세 가지 음성 인식 방식을 비교했습니다.

| 엔진 | 방식 | 확인한 결과 |
|---|---|---|
| Google Speech Recognition | 클라우드 | 녹음 길이 제한으로 문장 끝이 잘리는 문제 → 녹음 길이를 늘리고, sounddevice로 받은 음성을 전처리해 넣는 방식으로 바꿔 인식률 개선 (처리 시간은 약간 증가) |
| Vosk | 오프라인 | 한국어 기본 모델의 인식률이 세 방식 중 가장 낮음 |
| Whisper | 로컬 | base는 Vosk와 비슷한 수준, large-v3는 가장 높은 인식률을 보였지만 녹음 후 출력까지 약 20초 걸림 |

정확도·응답 시간·네트워크 의존성·보안성을 함께 고려해야 한다는 결론을 냈고, 실험 과정은 [`STT/STT-report`](STT/STT-report)에 정리했습니다.

### 2. 한국어 LLM 파인튜닝 비교 — `LLM/`
한국어 명령과 Tello SDK 명령어를 짝지은 데이터셋 118쌍(`tello_dataset.json`, 예: "올라가 20센티미터" → `up 20`)을 만들고, 한국어 LLM 3종을 **LoRA(PEFT)** 로 파인튜닝해 명령어를 얼마나 정확히 만드는지 비교했습니다.
- `beomi/Yi-Ko-6B` · `yanolja/KoSOLAR-10.7B-v0.2` · `EleutherAI/polyglot-ko-5.8b`
- 설정: TRL `SFTTrainer`, LoRA r=64 · alpha=16, fp16(양자화 없음), 배치 4, 학습률 2e-4, 1 epoch
- 여러 문장을 넣어 출력을 비교하는 정성 평가로 진행했고, 정량 수치는 남기지 않았습니다. 과정은 `LLM/Tello_FineTuning_and_Inference-다중쿼리.ipynb`에 있습니다.

### 3. 시뮬레이터 연동 — `SITL/`
LLM 응답(JSON)을 `command_parser.py`가 해석하고, `drone_control.py`가 DroneKit으로 SITL 시뮬레이터의 드론을 움직입니다. `SITL/tello/`는 같은 구조를 Tello 드론 명령에 맞춘 버전입니다.

### 4. 음성 명령 API — `api/`, `DroneAPI/`
FastAPI 서버에서 음성 파일을 Whisper로 전사하고, Gemini로 드론 명령 JSON을 생성한 뒤 명령 실행 상태와 기록을 관리합니다. 웹 화면에서 녹음부터 명령 생성까지 확인할 수 있습니다.

```json
[{"command": "takeoff", "parameters": {}},
 {"command": "forward", "parameters": {"distance": 100}},
 {"command": "cw", "parameters": {"degree": 90}},
 {"command": "land", "parameters": {}}]
```

### 5. 임무 계획(PDDL) 생성 실험 — `NLPDDL/`
자연어 임무 설명을 LLM으로 PDDL problem·plan 파일로 바꿔, 여러 단계로 이뤄진 임무를 계획 형태로 표현하는 방법을 실험했습니다.

## 구조
```
STT/                     STT 엔진별 테스트 코드와 비교 보고서
LLM/                     Tello 명령 데이터셋, LoRA 파인튜닝·추론 노트북
SITL/                    자연어 → JSON → DroneKit-SITL 제어
api/, DroneAPI/          FastAPI 음성 명령 API, 명령 실행 관리
NLPDDL/                  자연어 → PDDL 임무 계획 생성
integrated-full-project/ 통합 UI 버전
Papers/                  참고한 LLM·드론 관련 논문
```

## 기술 스택
Python · Whisper · Vosk · SpeechRecognition · Hugging Face Transformers · PEFT(LoRA) · TRL · DroneKit-SITL · MAVProxy · FastAPI · Google Gemini API · PDDL

## 실행 (SITL)
```bash
pip install -r SITL/requirements.txt
export GOOGLE_API_KEY=<your_key>   # api/ 서버는 .env.example을 .env로 복사해 사용
dronekit-sitl copter --home=37.5665,126.9780,0,180
mavproxy.py --master tcp:127.0.0.1:5760 --out 127.0.0.1:14550
cd SITL && python main.py       # 프롬프트에 자연어 명령 입력 (예: "이륙해")
```

## 참고
- API 키는 저장소에 넣지 않고 환경 변수(`GOOGLE_API_KEY`)로 읽습니다.
- LoRA 파인튜닝에는 A100급 GPU와 CUDA 환경이 필요합니다.
- 참고 논문: TypeFly, LLM-DaaS, ROS-LLM, LLM-Land, UAV-VLA 등 (`Papers/`)
