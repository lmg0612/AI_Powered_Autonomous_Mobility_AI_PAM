import React, { useState, useEffect, useRef } from 'react';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Page1WhisperGpsVideo } from './components/Page1WhisperGpsVideo';
import { Page2SensorEventLog } from './components/Page2SensorEventLog';
import { Page3ControlVideo } from './components/Page3ControlVideo';
import { Topbar } from './components/Topbar';
import { MapPin, Radio, Gamepad2 } from 'lucide-react';

export type StreamItem =
  | { kind: 'user_partial'; text: string; t0?: number; t1?: number; id: string }
  | { kind: 'user_final'; text: string; t0: number; t1: number; id: string }
  | { kind: 'summary'; normalized: string; keywords: string[]; id: string }
  | { kind: 'intent'; name: string; params: Record<string, any>; score: number; id: string }
  | { kind: 'safety'; checks: { id: string; label: string; pass: boolean; note?: string }[]; id: string }
  | { kind: 'action_log'; label: string; status: 'ok' | 'warn' | 'error'; ts: number; id: string };

export type MicStatus = 'idle' | 'listening' | 'processing' | 'error';
export type NoiseStatus = 'idle' | 'profiling' | 'applied' | 'overload';

export type DroneLogLevel = 'info' | 'warn' | 'error';

export type DroneLog = {
  ts: number;
  level: DroneLogLevel;
  message: string;
};

export type DroneSensors = {
  gyro: [number, number, number];
  accel: [number, number, number];
  mag: [number, number, number];
  ultrasonic_cm: number | null;
  esc_temp_c: number | null;
};

export type DroneData = {
  mode: string;
  battery: { pct: number; v: number; a: number; remainMin: number };
  gps: { fix: number; hdop: number };
  alt: number;
  vel: { x: number; y: number; z: number };
  wind: { mps: number; deg: number };
  link: { rssi: number; rtt_ms: number };
  pose: { lat: number; lon: number; alt: number; yaw_deg: number };
  geofence: [number, number][];
  pathSegments: { polyline: [number, number][]; kind: string; color: string }[];
  motors: { id: number; rpm: number; temp: number }[];
  sensors: DroneSensors;
  logs: DroneLog[];
};

export type WiFiStatus = {
  ssid: string;
  rssi: number;
  packetLoss: number;
  latency: number;
  ap: string;
  channel: number;
  quality: number;
};

export default function App() {
  const [activeTab, setActiveTab] = useState('page1');

  // Whisper / 오디오 관련 상태
  const [micStatus, setMicStatus] = useState<MicStatus>('idle');
  const [noiseStatus, setNoiseStatus] = useState<NoiseStatus>('idle');
  const [noiseEnabled] = useState(true);
  const [dbLevel, setDbLevel] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [waveformValues, setWaveformValues] = useState<number[]>(() => new Array(40).fill(0));
  const [streamItems, setStreamItems] = useState<StreamItem[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('default');
  const [isRecording, setIsRecording] = useState(false);

  // // 실시간 텔레메트리
  // const [telemetryData, setTelemetryData] = useState<DroneData | null>(null);

  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/telemetry');
        if (!res.ok) return;
        const telemetry: DroneData = await res.json();
        setTelemetryData(telemetry);
      } catch (err) {
        // 실패 시 일단 무시 (로그만 찍고 싶으면 여기 console.log)
        // console.error('[telemetry error]', err);
      }
    };

    // 첫 한 번 즉시 호출
    fetchTelemetry();

    // 1초마다 갱신
    const id = setInterval(fetchTelemetry, 200);
    return () => clearInterval(id);
  }, []);


  // 기본 드론 상태 (텔레메트리 없을 때 사용)
  const [droneData, setDroneData] = useState<DroneData>({
    mode: 'Stabilize',
    battery: { pct: 0, v: 0, a: 0, remainMin: 0 },
    gps: { fix: 0, hdop: 0 },
    alt: 0,
    vel: { x: 0, y: 0, z: 0 },
    wind: { mps: 0, deg: 0 },
    link: { rssi: 0, rtt_ms: 0 },
    pose: { lat: 35.8, lon: 127.1, alt: 0, yaw_deg: 0 },
    geofence: [
      [35.8005, 127.0995],
      [35.8005, 127.1005],
      [35.7995, 127.1005],
      [35.7995, 127.0995],
    ],
    pathSegments: [],
    motors: [
      { id: 1, rpm: 0, temp: 0 },
      { id: 2, rpm: 0, temp: 0 },
      { id: 3, rpm: 0, temp: 0 },
      { id: 4, rpm: 0, temp: 0 },
    ],
    sensors: {
      gyro: [0, 0, 0],
      accel: [0, 0, 0],
      mag: [0, 0, 0],
      ultrasonic_cm: null,
      esc_temp_c: null,
    },
    logs: [],
  });

  const [telemetryData, setTelemetryData] = useState<DroneData | null>(null);

  const [wifiStatus, setWifiStatus] = useState<WiFiStatus>({
    ssid: '--',
    rssi: -90,
    packetLoss: 0,
    latency: 0,
    ap: '--',
    channel: 0,
    quality: 0,
  });

  // refs
  const partialTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const noiseTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const overloadTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number>();

  // ===== 마이크 제어 =====

  const handleMicPause = () => {
    setIsPaused(true);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
    }

    if (audioContextRef.current?.state === 'running') {
      audioContextRef.current.suspend().catch(() => {});
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }

    setWaveformValues(prev => prev.map(() => 0));
    setDbLevel(0);
  };

  const handleMicResume = () => {
    setIsPaused(false);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
    }

    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(() => {});
    }
  };

  const handleMicStart = async () => {
    if (noiseTimeoutRef.current) clearTimeout(noiseTimeoutRef.current);

    try {
      const constraints: MediaStreamConstraints =
        selectedDevice && selectedDevice !== 'default'
          ? { audio: { deviceId: selectedDevice } }
          : { audio: true };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];
      mr.ondataavailable = e => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      mr.start(250);
      mediaRecorderRef.current = mr;

      const AudioContextConstructor =
        (window as any).AudioContext || (window as any).webkitAudioContext;

      if (AudioContextConstructor) {
        const audioCtx =
          audioContextRef.current ?? new AudioContextConstructor();
        audioContextRef.current = audioCtx;
        await audioCtx.resume();

        if (sourceNodeRef.current) {
          sourceNodeRef.current.disconnect();
          sourceNodeRef.current = null;
        }

        const sourceNode = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.85;
        sourceNode.connect(analyser);

        analyserRef.current = analyser;
        sourceNodeRef.current = sourceNode;
      }

      setMicStatus('listening');
      setIsPaused(false);
      setNoiseStatus('profiling');
      setIsRecording(true);

      noiseTimeoutRef.current = setTimeout(() => {
        setNoiseStatus('applied');
      }, 1500);
    } catch (err) {
      console.error(err);
      alert('마이크 권한을 허용해 주세요.');
    }
  };

  const currentDroneData: DroneData = telemetryData ?? droneData;

  const handleMicStop = async () => {
    setMicStatus('idle');
    setNoiseStatus('idle');
    setDbLevel(0);
    setIsPaused(false);
    setIsRecording(false);
    setWaveformValues(prev => prev.map(() => 0));

    if (noiseTimeoutRef.current) {
      clearTimeout(noiseTimeoutRef.current);
      noiseTimeoutRef.current = undefined;
    }
    if (overloadTimeoutRef.current) {
      clearTimeout(overloadTimeoutRef.current);
      overloadTimeoutRef.current = undefined;
    }
    if (partialTimeoutRef.current) {
      clearTimeout(partialTimeoutRef.current);
      partialTimeoutRef.current = undefined;
    }

    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }

    analyserRef.current = null;

    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }

    if (audioContextRef.current) {
      const ctx = audioContextRef.current;
      audioContextRef.current = null;
      ctx.close().catch(() => {});
    }

    const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    if (blob.size === 0) return;

    try {
      const form = new FormData();
      form.append('file', blob, 'recording.webm');

      const res = await fetch('http://localhost:8000/transcribe', {
        method: 'POST',
        body: form,
      });

      const data: { text?: string; command?: string } = await res.json();

      const text = data.text ?? '';
      if (text) {
        const finalId = `final-${Date.now()}`;
        setStreamItems(prev => [
          ...prev,
          {
            kind: 'user_final',
            text,
            t0: 0,
            t1: 2.5,
            id: finalId,
          },
        ]);

        runPipeline(text, finalId);
      }

      if (data.command) {
        try {
          const parsed = JSON.parse(data.command);

          // 1) commands 배열이 있으면 그 안의 첫 명령을 사용
          let name = 'COMMAND';
          let params: Record<string, any> = {};

          if (Array.isArray((parsed as any).commands) && (parsed as any).commands.length > 0) {
            const first = (parsed as any).commands[0];
            name =
              first.action ??
              first.name ??
              'COMMAND';
            params = first.params ?? first.args ?? {};
          } else {
            // 2) commands가 없으면, 루트 JSON을 그대로 의도 하나로 본다
            name =
              (parsed as any).intent ??
              (parsed as any).primary_mission ??
              'COMMAND';
            params = parsed as any;
          }

          setStreamItems(prev => [
            ...prev,
            {
              kind: 'intent',
              name,
              params,
              score: 1,
              id: `intent-${Date.now()}`,
            },
          ]);
        } catch (err) {
          console.error('[Command Parse Error]', err);
        }
      }
    } catch (err) {
      console.error('transcribe error', err);
      alert('음성을 처리하는 중 오류가 발생했습니다.');
    }
  };

  const handleUploadFile = async (file: File) => {
    console.log('[handleUploadFile] file:', file?.name, file?.size);
    try {
      const form = new FormData();
      form.append('file', file, file.name || 'upload.webm');

      const res = await fetch('http://localhost:8000/transcribe', {
        method: 'POST',
        body: form,
      });

      const data: { text?: string; command?: string } = await res.json();

      const text = data.text ?? '';
      if (text) {
        const finalId = `final-${Date.now()}`;
        setStreamItems(prev => [
          ...prev,
          {
            kind: 'user_final',
            text,
            t0: 0,
            t1: 2.5,
            id: finalId,
          },
        ]);

        runPipeline(text, finalId);
      }

      if (data.command) {
        try {
          const parsed = JSON.parse(data.command);

          let name = 'COMMAND';
          let params: Record<string, any> = {};

          if (Array.isArray((parsed as any).commands) && (parsed as any).commands.length > 0) {
            const first = (parsed as any).commands[0];
            name =
              first.action ??
              first.name ??
              'COMMAND';
            params = first.params ?? first.args ?? {};
          } else {
            name =
              (parsed as any).intent ??
              (parsed as any).primary_mission ??
              'COMMAND';
            params = parsed as any;
          }

          setStreamItems(prev => [
            ...prev,
            {
              kind: 'intent',
              name,
              params,
              score: 1,
              id: `intent-${Date.now()}`,
            },
          ]);
        } catch (err) {
          console.error('[Command Parse Error]', err);
        }
      }
    } catch (err) {
      console.error('[Upload Error]', err);
      alert('파일 업로드 중 오류가 발생했습니다.');
    }
  };

  // ===== 오디오 레벨 / 웨이브폼 =====

  useEffect(() => {
    if (micStatus !== 'listening' || isPaused) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
      setWaveformValues(prev => prev.map(() => 0));
      setDbLevel(0);
      return;
    }

    const analyser = analyserRef.current;
    if (!analyser) return;

    const buffer = new Uint8Array(analyser.fftSize);
    const barCount = 40;

    const update = () => {
      analyser.getByteTimeDomainData(buffer);

      let sumSquares = 0;
      for (let i = 0; i < buffer.length; i++) {
        const value = (buffer[i] - 128) / 128;
        sumSquares += value * value;
      }
      const rms = Math.sqrt(sumSquares / buffer.length);
      const db = 20 * Math.log10(rms || 0.000001);
      const normalizedDb = Math.max(0, Math.min(100, db + 60));
      setDbLevel(Number(normalizedDb.toFixed(1)));

      if (normalizedDb > 85) {
        setNoiseStatus(prev => {
          if (prev !== 'overload') {
            if (overloadTimeoutRef.current) {
              clearTimeout(overloadTimeoutRef.current);
            }
            overloadTimeoutRef.current = setTimeout(() => {
              setNoiseStatus(prevStatus =>
                prevStatus === 'overload' ? 'applied' : prevStatus,
              );
              overloadTimeoutRef.current = undefined;
            }, 2000);
          }
          return 'overload';
        });
      }

      const samplesPerBar = Math.max(1, Math.floor(buffer.length / barCount));
      const bars: number[] = [];
      for (let i = 0; i < barCount; i++) {
        let sum = 0;
        for (let j = 0; j < samplesPerBar; j++) {
          const idx = i * samplesPerBar + j;
          if (idx >= buffer.length) break;
          sum += Math.abs((buffer[idx] - 128) / 128);
        }
        const avg = sum / samplesPerBar;
        bars.push(Math.min(100, avg * 100));
      }
      setWaveformValues(bars);

      animationFrameRef.current = requestAnimationFrame(update);
    };

    update();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
    };
  }, [micStatus, isPaused]);

  // ===== 텍스트 파이프라인 =====

    const runPipeline = (text: string, finalId: string) => {
    setTimeout(() => {
      // 1) 요약 카드 추가
      const summaryId = `summary-${Date.now()}`;
      setStreamItems(prev => [
        ...prev,
        {
          kind: 'summary',
          normalized: text.replace(/음/g, '').replace(/\s+/g, ' ').trim(),
          keywords: extractKeywords(text),
          id: summaryId,
        },
      ]);

      // 2) 키워드 기반 intent는 "안전 체크용"으로만 사용하고,
      //    화면에 별도 intent 카드를 추가하지 않는다.
      setTimeout(() => {
        const fallbackIntent = extractIntent(text);   // 화면에는 안 추가

        const safety = runSafetyChecks(fallbackIntent, currentDroneData);
        const safetyId = `safety-${Date.now()}`;
        setStreamItems(prev => [
          ...prev,
          {
            kind: 'safety',
            checks: safety,
            id: safetyId,
          },
        ]);
      }, 300);
    }, 200);
  };

  const extractKeywords = (text: string): string[] => {
    const keywords = ['전진', '후진', '상승', '하강', '착륙', '이륙'];
    return keywords.filter(kw => text.includes(kw));
  };

  const extractIntent = (text: string) => {
    if (text.includes('전진') || text.includes('앞')) {
      const meters = parseFloat(text.match(/(\d+\.?\d*)\s*m/)?.[1] || '1');
      return { name: 'MOVE_FORWARD', params: { meters }, score: 0.92 };
    }
    if (text.includes('상승') || text.includes('올라')) {
      const meters = parseFloat(text.match(/(\d+\.?\d*)\s*m/)?.[1] || '1');
      return { name: 'MOVE_UP', params: { meters }, score: 0.89 };
    }
    if (text.includes('하강') || text.includes('내려')) {
      const meters = parseFloat(text.match(/(\d+\.?\d*)\s*m/)?.[1] || '1');
      return { name: 'MOVE_DOWN', params: { meters }, score: 0.87 };
    }
    if (text.includes('착륙')) {
      return { name: 'LAND', params: {}, score: 0.95 };
    }
    if (text.includes('이륙')) {
      return { name: 'TAKEOFF', params: { altitude: 3 }, score: 0.94 };
    }
    return { name: 'UNKNOWN', params: {}, score: 0.3 };
  };

  const runSafetyChecks = (intent: any, drone: DroneData) => {
    return [
      {
        id: 'battery',
        label: '배터리 충분',
        pass: drone.battery.pct > 0.2,
        note: `현재 ${(drone.battery.pct * 100).toFixed(0)}%`,
      },
      {
        id: 'geofence',
        label: '지오펜스 내부',
        pass: true,
        note: '안전 구역 내',
      },
      {
        id: 'altitude',
        label: '고도 제한',
        pass: intent.name === 'MOVE_UP' ? drone.alt < 100 : true,
        note:
          intent.name === 'MOVE_UP'
            ? '최대 고도 120m 미만'
            : '제한 없음',
      },
      {
        id: 'forbidden',
        label: '금칙어 없음',
        pass: true,
        note: '위험 명령 감지 안됨',
      },
      {
        id: 'gps',
        label: 'GPS Fix',
        pass: drone.gps.fix >= 6,
        note: `${drone.gps.fix}개 위성 확보`,
      },
    ];
  };

  const handleConfirm = (intentItem: StreamItem) => {
    if (intentItem.kind !== 'intent') return;

    const actionId = `action-${Date.now()}`;
    let undoTimeout: ReturnType<typeof setTimeout>;

    toast.success(`${intentItem.name} 실행됨`, {
      description: '명령이 드론에 전송되었습니다',
      duration: 3000,
      action: {
        label: 'Undo',
        onClick: () => {
          clearTimeout(undoTimeout);
          toast.info('명령이 취소되었습니다');
        },
      },
    });

    undoTimeout = setTimeout(() => {
      setStreamItems(prev => [
        ...prev,
        {
          kind: 'action_log',
          label: `${intentItem.name} 실행됨`,
          status: 'ok',
          ts: Date.now(),
          id: actionId,
        },
      ]);

      executeCommand(intentItem);
    }, 3000);
  };

  const executeCommand = (intentItem: StreamItem) => {
    if (intentItem.kind !== 'intent') return;

    setDroneData(prev => {
      const updated = { ...prev };

      if (intentItem.name === 'TAKEOFF') {
        updated.mode = 'Loiter';
        updated.alt = 3;
        updated.pose.alt = 3;
        updated.motors = updated.motors.map(m => ({
          ...m,
          rpm: 1500 + Math.random() * 200,
          temp: 25,
        }));
      } else if (intentItem.name === 'LAND') {
        updated.mode = 'Land';
        updated.alt = 0;
        updated.pose.alt = 0;
        updated.motors = updated.motors.map(m => ({
          ...m,
          rpm: 0,
          temp: 22,
        }));
      } else {
        updated.mode = 'Offboard';
      }

      if (intentItem.name === 'MOVE_FORWARD') {
        const meters = intentItem.params.meters || 1;
        const newLat = updated.pose.lat + meters * 0.00001;
        const segment = {
          polyline: [
            [updated.pose.lat, updated.pose.lon],
            [newLat, updated.pose.lon],
          ] as [number, number][],
          kind: 'MOVE_FORWARD',
          color: '#21D4A7',
        };
        updated.pathSegments = [...updated.pathSegments, segment];
        updated.pose.lat = newLat;
      } else if (intentItem.name === 'MOVE_UP') {
        const meters = intentItem.params.meters || 1;
        updated.alt += meters;
        updated.pose.alt += meters;
      } else if (intentItem.name === 'MOVE_DOWN') {
        const meters = intentItem.params.meters || 1;
        updated.alt = Math.max(0, updated.alt - meters);
        updated.pose.alt = Math.max(0, updated.pose.alt - meters);
      }

      updated.logs = [
        {
          ts: Date.now(),
          level: 'info',
          message: `Executed: ${intentItem.name}`,
        },
        ...updated.logs.slice(0, 9),
      ];

      return updated;
    });

    toast.success('명령 실행 완료', {
      description: `${intentItem.name}이(가) 성공적으로 수행되었습니다.`,
    });
  };

  // ===== 시뮬레이션 =====

  const simulateSpeech = (text: string) => {
    const partialId = `partial-${Date.now()}`;

    setStreamItems(prev => [
      ...prev,
      {
        kind: 'user_partial',
        text,
        id: partialId,
      },
    ]);

    if (partialTimeoutRef.current) clearTimeout(partialTimeoutRef.current);
    partialTimeoutRef.current = setTimeout(() => {
      const finalId = `final-${Date.now()}`;
      setStreamItems(prev =>
        prev.map(item =>
          item.id === partialId
            ? ({
                kind: 'user_final',
                text,
                t0: 0,
                t1: 2.5,
                id: finalId,
              } as StreamItem)
            : item,
        ),
      );

      runPipeline(text, finalId);
    }, 800);
  };

  // 언마운트 정리
  useEffect(() => {
    return () => {
      if (noiseTimeoutRef.current) clearTimeout(noiseTimeoutRef.current);
      if (overloadTimeoutRef.current) clearTimeout(overloadTimeoutRef.current);
      if (partialTimeoutRef.current) clearTimeout(partialTimeoutRef.current);

      mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach(t => t.stop());

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  // 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        if (micStatus === 'idle') {
          handleMicStart();
        } else {
          handleMicStop();
        }
      }

      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        const lastIntent = [...streamItems]
          .reverse()
          .find(item => item.kind === 'intent');
        const lastSafety = [...streamItems]
          .reverse()
          .find(item => item.kind === 'safety');
        const safetyPass =
          lastSafety?.kind === 'safety' &&
          lastSafety.checks.every(c => c.pass);

        if (lastIntent && safetyPass) {
          handleConfirm(lastIntent);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [micStatus, streamItems]);

  // ===== UI 레이아웃 =====

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B1220] via-[#0F1829] to-[#0B1220] text-slate-100">
      <Topbar micStatus={micStatus} modelName="Whisper Small" latency={42} />

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="max-w-[1600px] mx-auto"
      >
        <div className="sticky top-0 z-40 backdrop-blur-xl bg-black/20 border-b border-white/10">
          <TabsList className="w-full justify-start h-14 bg-transparent border-0 rounded-none px-6">
            <TabsTrigger
              value="page1"
              className="data-[state=active]:bg-white/10 data-[state=active]:text-primary gap-2 px-6"
            >
              <MapPin className="h-4 w-4" />
              Whisper + GPS + 영상
            </TabsTrigger>
            <TabsTrigger
              value="page2"
              className="data-[state=active]:bg-white/10 data-[state=active]:text-secondary gap-2 px-6"
            >
              <Radio className="h-4 w-4" />
              센서 + 이벤트
            </TabsTrigger>
            <TabsTrigger
              value="page3"
              className="data-[state=active]:bg-white/10 data-[state=active]:text-amber-400 gap-2 px-6"
            >
              <Gamepad2 className="h-4 w-4" />
              제어 + 영상
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="page1" className="mt-0 px-6 py-6">
          <Page1WhisperGpsVideo
            droneData={currentDroneData}
            micStatus={micStatus}
            noiseStatus={noiseStatus}
            dbLevel={dbLevel}
            isPaused={isPaused}
            selectedDevice={selectedDevice}
            streamItems={streamItems}
            isRecording={isRecording}
            onDeviceChange={setSelectedDevice}
            onStart={handleMicStart}
            onPause={handleMicPause}
            onResume={handleMicResume}
            onStop={handleMicStop}
            onSimulate={simulateSpeech}
            onOpenDetail={() => setActiveTab('page2')}
            onToggleRecording={() => setIsRecording(prev => !prev)}
            onUpload={handleUploadFile}
          />
        </TabsContent>

        <TabsContent value="page2" className="mt-0 px-6 py-6">
          <Page2SensorEventLog droneData={currentDroneData} />
        </TabsContent>

        <TabsContent value="page3" className="mt-0 px-6 py-6">
          <Page3ControlVideo droneData={currentDroneData} />
        </TabsContent>
      </Tabs>

      <Toaster />
    </div>
  );
}
