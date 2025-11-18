import React, { useState, useEffect, useRef } from 'react';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { WhisperCard } from './components/WhisperCard';
import { PipelineCompact } from './components/PipelineCompact';
import { DroneStatusCard } from './components/DroneStatusCard';
import { MapCard } from './components/MapCard';
import { WiFiCard } from './components/WiFiCard';
import { LLMDetailView } from './components/LLMDetailView';
import { DroneDetailView } from './components/DroneDetailView';
import { Topbar } from './components/Topbar';
import { Activity, Sparkles, Cpu } from 'lucide-react';

export type StreamItem =
  | { kind: 'user_partial'; text: string; t0?: number; t1?: number; id: string }
  | { kind: 'user_final'; text: string; t0: number; t1: number; id: string }
  | { kind: 'summary'; normalized: string; keywords: string[]; id: string }
  | { kind: 'intent'; name: string; params: Record<string, any>; score: number; id: string }
  | { kind: 'safety'; checks: { id: string; label: string; pass: boolean; note?: string }[]; id: string }
  | { kind: 'action_log'; label: string; status: 'ok' | 'warn' | 'error'; ts: number; id: string };

export type MicStatus = 'idle' | 'listening' | 'processing' | 'error';
export type NoiseStatus = 'idle' | 'profiling' | 'applied' | 'overload';

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
  sensors: { gyro: [number, number, number]; accel: [number, number, number]; mag: [number, number, number] };
  logs: { ts: number; level: string; message: string }[];
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
  const [activeTab, setActiveTab] = useState('dashboard');
  const [micStatus, setMicStatus] = useState<MicStatus>('idle');
  const [noiseStatus, setNoiseStatus] = useState<NoiseStatus>('idle');
  const [noiseEnabled, setNoiseEnabled] = useState(true);
  const [dbLevel, setDbLevel] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [waveformValues, setWaveformValues] = useState<number[]>(() => new Array(40).fill(0));
  const [streamItems, setStreamItems] = useState<StreamItem[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('default');
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  
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
      [35.8001, 127.1001],
      [35.8001, 127.0999],
      [35.7999, 127.0999],
      [35.7999, 127.1001],
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
    },
    logs: [],
  });

  const [wifiStatus, setWifiStatus] = useState<WiFiStatus>({
    ssid: '--',
    rssi: -90,
    packetLoss: 0,
    latency: 0,
    ap: '--',
    channel: 0,
    quality: 0,
  });

  // ui만들때의 데모버전 
  const partialTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const noiseTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const overloadTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // 실제 오디오 입력 장치 목록 불러오기
  useEffect(() => {
    async function loadDevices() {
      try {
        // 일부 브라우저는 라벨을 노출하려면 권한 허용이 선행되어야 함
        await navigator.mediaDevices.getUserMedia({ audio: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioIns = devices.filter(d => d.kind === 'audioinput');
        setAudioDevices(audioIns);
      } catch (err) {
        console.error('장치 목록을 불러오지 못했습니다.', err);
      }
    }
    loadDevices();
  }, []);

  // 실제 녹음/전송에 필요한 ref들 --> 수정 후
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number>();

  // 마이크 일시중지
  const handleMicPause = () => {
    setIsPaused(true);

    // 실제 녹음 중이면 일시정지
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

  // 마이크 재개
  const handleMicResume = () => {
    setIsPaused(false);

    // 실제 녹음 재개
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
    }

    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(() => {});
    }
  };


  // 마이크 시작
  // 수정후임 
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
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      mr.start(250);
      mediaRecorderRef.current = mr;

      const AudioContextConstructor =
        window.AudioContext || (window as any).webkitAudioContext;

      if (AudioContextConstructor) {
        const audioCtx = audioContextRef.current ?? new AudioContextConstructor();
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
      } else {
        console.warn('AudioContext is not supported in this environment.');
      }

      setMicStatus('listening');
      setIsPaused(false);
      setNoiseStatus('profiling');

      noiseTimeoutRef.current = setTimeout(() => {
        setNoiseStatus('applied');
      }, 1500);

    } catch (err) {
      console.error(err);
      alert('마이크 권한을 허용해 주세요.');
    }
  };
  // 여기까지 수정 

  const handleUploadFile = async (file: File) => {
    const form = new FormData();
    form.append('file', file, file.name);

    try {
      const res = await fetch('http://localhost:8000/transcribe', {
        method: 'POST',
        body: form,
      });
      const data = await res.json(); // { text, command }

      const finalId = `final-${Date.now()}`;
      setStreamItems(prev => [
        ...prev,
        {
          kind: 'user_final',
          text: data.text ?? '',
          t0: 0,
          t1: 2.5,
          id: finalId,
        },
      ]);

      if (data.command) {
        try {
          const parsed = JSON.parse(data.command);
          const first = parsed.commands?.[0];
          if (first) {
            setStreamItems(prev => [
              ...prev,
              {
                kind: 'intent',
                name: first.name ?? 'UNKNOWN',
                params: first.args ?? {},
                score: 1,
                id: `intent-${Date.now()}`,
              },
            ]);
          }
        } catch (e) {
          console.warn('command parse error (upload)', e);
        }
      }

      // 필요하면 runPipeline(data.text, finalId); 도 여기서 호출 가능
    } catch (err) {
      console.error('upload transcribe error', err);
      alert('업로드된 파일을 처리하는 중 오류가 발생했습니다.');
    }
  };

    // 필요하면 여기서 runPipeline(data.text, finalId); 호출해서
    // 의도/안전 단계를 프론트 파이프라인으로 돌려도 됨.

  // const startDbSimulation = () => {
  const handleMicStop = async () => {
    setMicStatus('idle');
    setNoiseStatus('idle');
    setDbLevel(0);
    setIsPaused(false);
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

    // 녹음 중지
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());

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

    // 백엔드로 전송
    const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    if (blob.size === 0) return;

    const form = new FormData();
    form.append('file', blob, 'recording.webm');

    const res = await fetch('http://localhost:8000/transcribe', {
      method: 'POST',
      body: form,
    });
    const data = await res.json(); // 원본 api.zip이 주는 구조: { text, command }

    // 기존 UI 흐름에 싹 올리기
    const finalId = `final-${Date.now()}`;
    setStreamItems((prev) => [
      ...prev,
      {
        kind: 'user_final',
        text: data.text ?? '',
        t0: 0,
        t1: 2.5,
        id: finalId,
      },
    ]);

    // api.zip이 던지는 command가 JSON 문자열이니까 그대로 파싱해서 intent 카드로
    if (data.command) {
      try {
        const parsed = JSON.parse(data.command);
        const first = parsed.commands?.[0];
        if (first) {
          setStreamItems((prev) => [
            ...prev,
            {
              kind: 'intent',
              name: first.name ?? 'UNKNOWN',
              params: first.args ?? {},
              score: 1,
              id: `intent-${Date.now()}`,
            },
          ]);
        }
      } catch (e) {
        console.warn('command parse error', e);
      }
    }
  };

  // 위로 수정 후

  // 파이프라인 실행
  const runPipeline = (text: string, finalId: string) => {
    setTimeout(() => {
      const summaryId = `summary-${Date.now()}`;
      setStreamItems(prev => [...prev, {
        kind: 'summary',
        normalized: text.replace(/음/g, '').replace(/\s+/g, ' ').trim(),
        keywords: extractKeywords(text),
        id: summaryId,
      }]);

      setTimeout(() => {
        const intent = extractIntent(text);
        const intentId = `intent-${Date.now()}`;
        setStreamItems(prev => [...prev, {
          kind: 'intent',
          name: intent.name,
          params: intent.params,
          score: intent.score,
          id: intentId,
        }]);

        setTimeout(() => {
          const safety = runSafetyChecks(intent, droneData);
          const safetyId = `safety-${Date.now()}`;
          setStreamItems(prev => [...prev, {
            kind: 'safety',
            checks: safety,
            id: safetyId,
          }]);
        }, 400);
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
        label: '배터리', 
        pass: drone.battery.pct > 0.2,
        note: `현재 ${(drone.battery.pct * 100).toFixed(0)}%`
      },
      { 
        id: 'geofence', 
        label: '지오펜스 내부', 
        pass: true,
        note: '안전 구역 내'
      },
      { 
        id: 'altitude', 
        label: '고도 제한', 
        pass: intent.name === 'MOVE_UP' ? drone.alt < 100 : true,
        note: intent.name === 'MOVE_UP' ? '최대 고도 120m 미만' : '제한 없음'
      },
      { 
        id: 'forbidden', 
        label: '금칙어 없음', 
        pass: true,
        note: '위험 명령 감지 안됨'
      },
      { 
        id: 'gps', 
        label: 'GPS Fix', 
        pass: drone.gps.fix >= 6,
        note: `${drone.gps.fix}개 위성 확보`
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
      setStreamItems(prev => [...prev, {
        kind: 'action_log',
        label: `${intentItem.name} 실행됨`,
        status: 'ok',
        ts: Date.now(),
        id: actionId
      }]);

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
        updated.motors = updated.motors.map(m => ({ ...m, rpm: 1500 + Math.random() * 200, temp: 25 }));
      } else if (intentItem.name === 'LAND') {
        updated.mode = 'Land';
        updated.alt = 0;
        updated.pose.alt = 0;
        updated.motors = updated.motors.map(m => ({ ...m, rpm: 0, temp: 22 }));
      } else {
        updated.mode = 'Offboard';
      }

      if (intentItem.name === 'MOVE_FORWARD') {
        const meters = intentItem.params.meters || 1;
        const newLat = updated.pose.lat + (meters * 0.00001);
        const segment = {
          polyline: [[updated.pose.lat, updated.pose.lon], [newLat, updated.pose.lon]] as [number, number][],
          kind: 'MOVE_FORWARD',
          color: '#21D4A7'
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
        { ts: Date.now(), level: 'info', message: `Executed: ${intentItem.name}` },
        ...updated.logs.slice(0, 9),
      ];

      return updated;
    });

    toast.success('명령 실행 완료', {
      description: `${intentItem.name}이(가) 성공적으로 수행되었습니다.`,
    });
  };

  const simulateSpeech = (text: string) => {
    const partialId = `partial-${Date.now()}`;
    
    setStreamItems(prev => [...prev, {
      kind: 'user_partial',
      text,
      id: partialId,
    }]);

    if (partialTimeoutRef.current) clearTimeout(partialTimeoutRef.current);
    partialTimeoutRef.current = setTimeout(() => {
      const finalId = `final-${Date.now()}`;
      setStreamItems(prev => prev.map(item => 
        item.id === partialId 
          ? { kind: 'user_final', text, t0: 0, t1: 2.5, id: finalId } as StreamItem
          : item
      ));

      runPipeline(text, finalId);
    }, 800);
  };

  useEffect(() => {
    return () => {
      if (noiseTimeoutRef.current) clearTimeout(noiseTimeoutRef.current);
      if (partialTimeoutRef.current) clearTimeout(partialTimeoutRef.current);
      if (overloadTimeoutRef.current) clearTimeout(overloadTimeoutRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    if (micStatus !== 'listening' || isPaused) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
      if (micStatus !== 'listening') {
        setWaveformValues(prev => prev.map(() => 0));
        setDbLevel(0);
      }
      return;
    }

    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume().catch(() => {});
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
              setNoiseStatus(prevStatus => (prevStatus === 'overload' ? 'applied' : prevStatus));
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
        const lastIntent = [...streamItems].reverse().find(item => item.kind === 'intent');
        const lastSafety = [...streamItems].reverse().find(item => item.kind === 'safety');
        const safetyPass = lastSafety?.kind === 'safety' && lastSafety.checks.every(c => c.pass);
        
        if (lastIntent && safetyPass) {
          handleConfirm(lastIntent);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [micStatus, streamItems]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B1220] via-[#0F1829] to-[#0B1220] text-slate-100">
      <Topbar 
        micStatus={micStatus}
        modelName="Whisper Small"
        latency={42}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-[1600px] mx-auto">
        {/* Global Tab Bar */}
        <div className="sticky top-0 z-40 backdrop-blur-xl bg-black/20 border-b border-white/10">
          <TabsList className="w-full justify-start h-14 bg-transparent border-0 rounded-none px-6">
            <TabsTrigger 
              value="dashboard" 
              className="data-[state=active]:bg-white/10 data-[state=active]:text-primary gap-2 px-6"
              data-hook="tab-dashboard"
            >
              <Activity className="h-4 w-4" />
              대시보드
            </TabsTrigger>
            <TabsTrigger 
              value="llm-detail" 
              className="data-[state=active]:bg-white/10 data-[state=active]:text-primary gap-2 px-6"
              data-hook="tab-llm-detail"
            >
              <Sparkles className="h-4 w-4" />
              LLM 상세
            </TabsTrigger>
            <TabsTrigger 
              value="drone-detail" 
              className="data-[state=active]:bg-white/10 data-[state=active]:text-primary gap-2 px-6"
              data-hook="tab-drone-detail"
            >
              <Cpu className="h-4 w-4" />
              드론 상세
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="mt-0 px-6 py-6">
          <div className="grid grid-cols-12 gap-4">
            {/* Left Column: 6 cols (50%) */}
            <div className="col-span-12 lg:col-span-6 space-y-4">
              <WhisperCard
                micStatus={micStatus}
                noiseStatus={noiseStatus}
                dbLevel={dbLevel}
                isPaused={isPaused}
                waveformValues={waveformValues}
                selectedDevice={selectedDevice}
                onDeviceChange={setSelectedDevice}
                devices={audioDevices}
                onStart={handleMicStart}
                onPause={handleMicPause}
                onResume={handleMicResume}
                onStop={handleMicStop}
                onSimulate={simulateSpeech}
                onUpload={handleUploadFile}
              />
              <PipelineCompact
                streamItems={streamItems}
                onOpenDetail={() => setActiveTab('llm-detail')}
              />
            </div>

            {/* Right Column: 6 cols (50%) */}
            <aside className="col-span-12 lg:col-span-6 space-y-4">
              <MapCard droneData={droneData} />
              <WiFiCard wifiStatus={wifiStatus} />
            </aside>
          </div>
        </TabsContent>

        {/* LLM Detail Tab */}
        <TabsContent value="llm-detail" className="mt-0 px-6 py-6">
          <LLMDetailView streamItems={streamItems} onConfirm={handleConfirm} />
        </TabsContent>

        {/* Drone Detail Tab */}
        <TabsContent value="drone-detail" className="mt-0 px-6 py-6">
          <DroneDetailView droneData={droneData} />
        </TabsContent>
      </Tabs>

      <Toaster />
    </div>
  );
}
