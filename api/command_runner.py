import contextlib
import io
import json
import sys
import threading
import uuid
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional

BASE_DIR = Path(__file__).resolve().parent
COMMAND_HISTORY_DIR = BASE_DIR / "command_history"
COMMAND_HISTORY_DIR.mkdir(parents=True, exist_ok=True)
COMMAND_LOG_DIR = BASE_DIR / "command_logs"
COMMAND_LOG_DIR.mkdir(parents=True, exist_ok=True)

# Ensure the DroneAPI package is importable when running uvicorn from api/
PROJECT_ROOT = BASE_DIR.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))

from drone_api import DroneTimeBasedAPI  # type: ignore  # noqa: E402


class JobStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


def _timestamp() -> str:
    return datetime.now().strftime("%H:%M:%S")


def save_command_payload(job_id: str, payload: Dict[str, Any]) -> Path:
    """Persist the generated JSON commands for later inspection/run."""
    COMMAND_HISTORY_DIR.mkdir(parents=True, exist_ok=True)
    path = COMMAND_HISTORY_DIR / f"{job_id}.json"
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return path


@dataclass
class JobLogs:
    logs: List[str]
    next_index: int
    status: JobStatus


class ExecutionManager:
    """Run drone commands sequentially and keep per-job logs."""

    def __init__(self) -> None:
        self._logs: Dict[str, List[str]] = {}
        self._status: Dict[str, JobStatus] = {}
        self._log_files: Dict[str, Path] = {}
        self._latest_job_id: Optional[str] = None
        self._lock = threading.Lock()

    def start_job(self, commands: List[Dict[str, Any]]) -> str:
        if not commands:
            raise ValueError("commands list is empty.")

        job_id = str(uuid.uuid4())
        with self._lock:
            self._status[job_id] = JobStatus.PENDING
            self._logs[job_id] = []
            log_path = COMMAND_LOG_DIR / f"{job_id}.log"
            log_path.write_text("", encoding="utf-8")
            self._log_files[job_id] = log_path
            self._latest_job_id = job_id

        worker = threading.Thread(
            target=self._run_job,
            args=(job_id, commands),
            daemon=True,
        )
        worker.start()
        return job_id

    def _run_job(self, job_id: str, commands: List[Dict[str, Any]]) -> None:
        relay = _StdoutRelay(self, job_id)
        with contextlib.redirect_stdout(relay):
            self._set_status(job_id, JobStatus.RUNNING)
            api = DroneTimeBasedAPI()
            self._log(job_id, "드론 시뮬레이션을 시작합니다.")

            for idx, command in enumerate(commands, start=1):
                action = command.get("action")
                params = command.get("params", {}) or {}

                if not action:
                    self._log(job_id, f"[{idx}] action 키가 없어 건너뜁니다: {command}")
                    continue

                self._log(
                    job_id,
                    f"[{idx}/{len(commands)}] '{action}' 실행 (params={params})",
                )

                drone_method = getattr(api, action, None)
                if not callable(drone_method):
                    self._log(job_id, f" '{action}' 명령을 Drone API에서 찾을 수 없어 건너뜁니다.")
                    continue

                try:
                    drone_method(**params)
                    self._log(job_id, f" '{action}' 완료.")
                except Exception as exc:  # pragma: no cover - safety
                    self._log(job_id, f" '{action}' 실행 중 오류: {exc}")
                    self._set_status(job_id, JobStatus.FAILED)
                    break
            else:
                self._log(job_id, " 모든 명령을 성공적으로 마쳤습니다.")
                self._set_status(job_id, JobStatus.COMPLETED)
                return

        if self._status.get(job_id) != JobStatus.FAILED:
            self._set_status(job_id, JobStatus.FAILED)

    def _log(self, job_id: str, message: str) -> None:
        entry = f"[{_timestamp()}] {message}"
        with self._lock:
            self._logs.setdefault(job_id, []).append(entry)
            log_path = self._log_files.get(job_id)
            if log_path:
                with log_path.open("a", encoding="utf-8") as handle:
                    handle.write(entry + "\n")

    def _set_status(self, job_id: str, status: JobStatus) -> None:
        with self._lock:
            self._status[job_id] = status

    def fetch_logs(self, job_id: str, start_index: int = 0) -> JobLogs:
        with self._lock:
            log_path = self._log_files.get(job_id)
            if not log_path or not log_path.exists():
                raise KeyError(job_id)
            status = self._status.get(job_id, JobStatus.PENDING)

        with log_path.open("r", encoding="utf-8") as handle:
            lines = [line.rstrip("\n") for line in handle]

        slice_logs = lines[start_index:]
        next_index = start_index + len(slice_logs)
        return JobLogs(logs=slice_logs, next_index=next_index, status=status)

    def get_latest_job_id(self) -> Optional[str]:
        with self._lock:
            return self._latest_job_id


execution_manager = ExecutionManager()


class _StdoutRelay(io.StringIO):
    """Duplicate stdout to terminal while streaming captured lines into job logs."""

    def __init__(self, manager: ExecutionManager, job_id: str) -> None:
        super().__init__()
        self.manager = manager
        self.job_id = job_id
        self._original = sys.stdout
        self._buffer = ""

    def write(self, data: str) -> int:  # type: ignore[override]
        if not data:
            return 0
        self._original.write(data)
        self._buffer += data
        while "\n" in self._buffer:
            line, self._buffer = self._buffer.split("\n", 1)
            cleaned = line.rstrip()
            if cleaned:
                self.manager._log(self.job_id, cleaned)
        return len(data)

    def flush(self) -> None:  # type: ignore[override]
        if self._buffer.strip():
            self.manager._log(self.job_id, self._buffer.rstrip())
            self._buffer = ""
        self._original.flush()
