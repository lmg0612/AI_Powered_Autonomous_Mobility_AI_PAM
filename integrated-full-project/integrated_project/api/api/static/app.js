const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const statusEl = document.getElementById("status");
const resultEl = document.getElementById("resultText");
const commandEl = document.getElementById("commandText");
const fileInput = document.getElementById("audioFile");

let mediaRecorder = null;
let audioChunks = [];
let stream = null;

const setStatus = (message, isError = false) => {
    statusEl.textContent = message;
    statusEl.style.color = isError ? "#b91c1c" : "#1d4ed8";
};

const setButtons = (isRecording) => {
    startBtn.disabled = isRecording;
    stopBtn.disabled = !isRecording;
};

const resetChunks = () => {
    audioChunks = [];
};

const ensureRecorder = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("이 브라우저에서는 마이크 녹음이 지원되지 않습니다.");
    }

    if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    }

    mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
            ? "audio/webm;codecs=opus"
            : undefined,
    });

    mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
            audioChunks.push(event.data);
        }
    };

    mediaRecorder.onstop = handleRecordingStop;
};

const handleRecordingStop = async () => {
    try {
        if (!audioChunks.length) {
            setStatus("녹음된 데이터가 없습니다. 다시 시도해 주세요.", true);
            return;
        }

        const blob = new Blob(audioChunks, { type: "audio/webm" });
        const file = new File([blob], "recording.webm", { type: blob.type });
        await sendAudio(file);
    } catch (error) {
        console.error(error);
        setStatus(error.message || "녹음 처리 중 오류가 발생했습니다.", true);
    } finally {
        resetChunks();
        setButtons(false);
    }
};

const sendAudio = async (file) => {
    setStatus("서버로 전송 중...");
    resultEl.textContent = "인식 중...";
    if (commandEl) {
        commandEl.textContent = "명령 생성 중...";
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
        const response = await fetch("/transcribe", {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.detail || "서버 오류가 발생했습니다.");
        }

        const data = await response.json();
        resultEl.textContent = data.text ? data.text : "(텍스트 없음)";
        if (commandEl) {
            commandEl.textContent = data.command ? data.command : "(생성된 명령문 없음)";
        }
        setStatus("완료되었습니다!");
    } catch (error) {
        console.error(error);
        resultEl.textContent = "";
        if (commandEl) {
            commandEl.textContent = "";
        }
        setStatus(error.message || "전송 중 오류가 발생했습니다.", true);
    }
};

startBtn.addEventListener("click", async () => {
    try {
        setStatus("녹음 준비 중...");
        if (!mediaRecorder || mediaRecorder.state === "inactive") {
            await ensureRecorder();
        }

        resetChunks();
        mediaRecorder.start();
        setButtons(true);
        setStatus("녹음 중...");
    } catch (error) {
        console.error(error);
        setStatus(error.message || "마이크를 사용할 수 없습니다.", true);
    }
});

stopBtn.addEventListener("click", () => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
        setStatus("녹음 종료, 인식 중...");
        mediaRecorder.stop();
    }
});

fileInput.addEventListener("change", async (event) => {
    const [file] = event.target.files || [];
    if (!file) {
        return;
    }

    setButtons(false);
    await sendAudio(file);
    fileInput.value = "";
});

window.addEventListener("beforeunload", () => {
    if (stream) {
        stream.getTracks().forEach((track) => track.stop());
    }
});

// 초기 상태 안내
if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    setStatus("이 브라우저는 마이크 녹음을 지원하지 않습니다.", true);
    startBtn.disabled = true;
    stopBtn.disabled = true;
} else {
    setStatus("마이크 접근 권한을 허용해 주세요.");
}
