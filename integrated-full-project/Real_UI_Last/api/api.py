# api.py
# -----------------------------------------------------------------------------
# 백엔드 텔레메트리(센서/드론 상태) 전용 API
# 프론트엔드(App.tsx)의 DroneData 구조와 1:1로 매칭된다.
# 이 파일 하나만 수정해도 프론트의 센서 데이터가 즉시 반영되는 구조.
# -----------------------------------------------------------------------------

from __future__ import annotations

from typing import List, Tuple, Optional
from datetime import datetime

from fastapi import APIRouter
from pydantic import BaseModel, Field


# -----------------------------------------------------------------------------
# 📌 /api prefix 를 갖는 라우터 생성
# main.py 에서:
#
#     from .api import router as telemetry_router
#     app.include_router(telemetry_router)
#
# 이렇게 연결된다.
# -----------------------------------------------------------------------------

router = APIRouter(
    prefix="/api",
    tags=["telemetry"],
)


# -----------------------------------------------------------------------------
# 📌 프론트 DroneData 와 1:1 대응하는 Pydantic 모델들
# -----------------------------------------------------------------------------

class Battery(BaseModel):
    pct: float = Field(0.29)
    v: float = Field(15.6)
    a: float = Field(12.3)
    remainMin: float = Field(18.0)


class GPS(BaseModel):
    fix: int = 0
    hdop: float = 0.0


class Velocity(BaseModel):
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0


class Wind(BaseModel):
    mps: float = 0.0
    deg: float = 0.0


class Link(BaseModel):
    rssi: float = 0.0
    rtt_ms: float = 0.0


class Pose(BaseModel):
    lat: float = 35.8
    lon: float = 127.1
    alt: float = 0.0
    yaw_deg: float = 0.0


class Motor(BaseModel):
    id: int
    rpm: float = 0.0
    temp: float = 0.0


class DroneSensors(BaseModel):
    gyro: Tuple[float, float, float] = (0.0, 0.0, 0.0)
    accel: Tuple[float, float, float] = (0.0, 0.0, 0.0)
    mag: Tuple[float, float, float] = (0.0, 0.0, 0.0)
    ultrasonic_cm: Optional[float] = None
    esc_temp_c: Optional[float] = None


class DroneLog(BaseModel):
    ts: int
    level: str
    message: str


class PathSegment(BaseModel):
    polyline: List[Tuple[float, float]] = []
    kind: str = "path"
    color: str = "#00ffcc"


class DroneData(BaseModel):
    mode: str = "Stabilize"
    battery: Battery = Battery()
    gps: GPS = GPS()
    alt: float = 0.0
    vel: Velocity = Velocity()
    wind: Wind = Wind()
    link: Link = Link()
    pose: Pose = Pose()
    geofence: List[Tuple[float, float]] = Field(
        default_factory=lambda: [
            (35.8005, 127.0995),
            (35.8005, 127.1005),
            (35.7995, 127.1005),
            (35.7995, 127.0995),
        ]
    )
    pathSegments: List[PathSegment] = Field(default_factory=list)
    motors: List[Motor] = Field(
        default_factory=lambda: [
            Motor(id=1),
            Motor(id=2),
            Motor(id=3),
            Motor(id=4),
        ]
    )
    sensors: DroneSensors = DroneSensors()
    logs: List[DroneLog] = Field(default_factory=list)


# -----------------------------------------------------------------------------
# 📌 서버 메모리에 상주하는 전역 드론 상태
#     - 서버가 실행되는 동안 유지됨
#     - 외부에서 POST /api/telemetry 로 업데이트 가능
# -----------------------------------------------------------------------------

DRONE_STATE: DroneData = DroneData()


# -----------------------------------------------------------------------------
# 📌 GET /api/telemetry
#     - 프론트는 이 엔드포인트를 이용해 드론/센서 상태를 조회한다.
# -----------------------------------------------------------------------------

@router.get("/telemetry", response_model=DroneData)
async def get_telemetry() -> DroneData:
    return DRONE_STATE


# -----------------------------------------------------------------------------
# 📌 POST /api/telemetry
#     - 프론트/시뮬레이터/백그라운드 프로세스에서 전체 상태를 밀어 넣는다.
#     - DRONE_STATE 를 통째로 교체한다.
# -----------------------------------------------------------------------------

@router.post("/telemetry", response_model=DroneData)
async def update_telemetry(data: DroneData) -> DroneData:
    global DRONE_STATE
    DRONE_STATE = data
    return DRONE_STATE


# -----------------------------------------------------------------------------
# 📌 POST /api/telemetry/log
#     - 이벤트 로그 한 줄만 추가하는 엔드포인트
#     - Page2SensorEventLog 에 즉시 반영된다.
# -----------------------------------------------------------------------------

class NewLog(BaseModel):
    level: str = "info"
    message: str
    ts: Optional[int] = None


@router.post("/telemetry/log", response_model=DroneData)
async def append_log(log: NewLog) -> DroneData:
    global DRONE_STATE

    timestamp = log.ts or int(datetime.utcnow().timestamp() * 1000)

    DRONE_STATE.logs.append(
        DroneLog(ts=timestamp, level=log.level, message=log.message)
    )

    # 로그 개수가 너무 많아지지 않도록 마지막 1000개만 유지
    if len(DRONE_STATE.logs) > 1000:
        DRONE_STATE.logs = DRONE_STATE.logs[-1000:]

    return DRONE_STATE
