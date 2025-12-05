import { Mic, Square, Pause, Play, Upload, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { motion } from 'motion/react';
import { MicStatus, NoiseStatus } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useEffect, useState, useRef } from 'react';

type WhisperCardProps = {
  micStatus: MicStatus;
  noiseStatus: NoiseStatus;
  dbLevel: number;
  isPaused: boolean;
  selectedDevice: string;
  onDeviceChange: (device: string) => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onSimulate: (text: string) => void;
  onUpload?: (file: File) => void;
};

export function WhisperCard({ 
  micStatus, 
  noiseStatus, 
  dbLevel, 
  isPaused,
  selectedDevice, 
  onDeviceChange, 
  onStart, 
  onPause,
  onResume,
  onStop, 
  onSimulate,
  onUpload
}: WhisperCardProps) {
  const [audioDevices, setAudioDevices] = useState<{ id: string; name: string }[]>([
    { id: 'default', name: 'Default Microphone' }
  ]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 실제 마이크 기기 목록 가져오기
  useEffect(() => {
    const getAudioDevices = async () => {
      try {
        // 먼저 권한 없이 기기 목록 가져오기 시도
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices
          .filter(device => device.kind === 'audioinput')
          .map((device, index) => ({
            id: device.deviceId || `device-${index}`,
            name: device.label || `마이크 ${index + 1}`
          }));
        
        if (audioInputs.length > 0) {
          setAudioDevices(audioInputs);
        }
      } catch (error) {
        console.log('기기 목록 가져오기 실패, 기본값 사용');
        // 오류 발생 시 기본 목록 유지
      }
    };

    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      getAudioDevices();
    }
  }, []);

  // 파일 업로드 핸들러
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // 오디오 파일인지 확인
      if (file.type.startsWith('audio/')) {
        console.log('오디오 파일 업로드:', file.name);
        // TODO: 실제 오디오 파일 처리 로직
        // 여기서 파일을 읽어서 Whisper API로 전송하거나 처리할 수 있습니다
      } else {
        alert('오디오 파일만 업로드할 수 있습니다.');
      }
      // 입력 초기화 (같은 파일을 다시 선택할 수 있도록)
      event.target.value = '';
    }
  };

  const noiseConfig = {
    idle: { label: '대기 중', color: 'bg-slate-600' },
    profiling: { label: '노이즈 프로필 학습 중', color: 'bg-amber-500 animate-pulse' },
    applied: { label: '적용됨', color: 'bg-[#21D4A7]' },
    overload: { label: '85dB+ 과다소음', color: 'bg-red-500 animate-pulse' },
  };

  const handlePrimaryAction = () => {
    if (micStatus === 'idle') {
      onStart();
    } else if (micStatus === 'listening') {
      if (isPaused) {
        onResume();
      } else {
        onPause();
      }
    }
  };

  return (
    <Card 
      className="glass-card overflow-hidden shadow-lg shadow-primary/5"
      data-hook="whisper-card"
    >
      <CardHeader className="border-b border-primary/10">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-slate-100">
            <Mic className="h-5 w-5 text-[#21D4A7]" />
            음성 입력 (Whisper)
          </CardTitle>
          <Badge 
            className={`${noiseConfig[noiseStatus].color} border-0 text-xs px-2 py-1`}
            data-hook="status"
          >
            {noiseConfig[noiseStatus].label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-3">
        {/* dB Level Meter */}
        <div className="space-y-1.5" data-hook="db-level">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Input Level</span>
            <span className="text-slate-200 font-mono">{dbLevel.toFixed(1)} dB</span>
          </div>
          <div className="relative h-4 bg-black/30 rounded-full overflow-hidden border border-primary/20">
            <motion.div
              className={`absolute inset-y-0 left-0 rounded-full ${
                dbLevel > 85 ? 'bg-red-500' : 
                dbLevel > 70 ? 'bg-amber-500' : 
                'bg-[#21D4A7]'
              }`}
              style={{ width: `${Math.min(100, (dbLevel / 100) * 100)}%` }}
              animate={{ 
                opacity: micStatus === 'listening' && !isPaused ? [0.7, 1, 0.7] : 1 
              }}
              transition={{ 
                duration: 0.6, 
                repeat: micStatus === 'listening' && !isPaused ? Infinity : 0 
              }}
            />
            {/* Threshold markers */}
            <div className="absolute inset-0 flex items-center">
              <div className="absolute left-[70%] w-px h-full bg-white/20" />
              <div className="absolute left-[85%] w-px h-full bg-red-500/40" />
            </div>
          </div>
        </div>

        {/* Waveform Visualization */}
        {micStatus === 'listening' && !isPaused && (
          <div className="flex items-center justify-center gap-0.5 h-12" data-hook="waveform">
            {[...Array(40)].map((_, i) => (
              <motion.div
                key={i}
                className="w-1 bg-gradient-to-t from-[#21D4A7] to-[#2E9BFF] rounded-full"
                animate={{
                  height: [
                    '20%',
                    `${Math.random() * 60 + 20}%`,
                    '20%',
                  ],
                }}
                transition={{
                  duration: 0.5 + Math.random() * 0.3,
                  repeat: Infinity,
                  delay: i * 0.02,
                }}
              />
            ))}
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handlePrimaryAction}
            disabled={micStatus === 'processing'}
            className={`flex-1 gap-2 h-9 ${
              micStatus === 'idle' 
                ? 'bg-[#21D4A7] hover:bg-[#1abc9c] text-slate-900' 
                : isPaused 
                  ? 'bg-[#2E9BFF] hover:bg-[#2080d0] text-white'
                  : 'bg-amber-500 hover:bg-amber-600 text-white'
            }`}
            data-hook={micStatus === 'idle' ? 'record-start' : isPaused ? 'record-resume' : 'record-pause'}
          >
            {micStatus === 'idle' ? (
              <>
                <Mic className="h-4 w-4" />
                <span>Start</span>
              </>
            ) : isPaused ? (
              <>
                <Play className="h-4 w-4" />
                <span>Resume</span>
              </>
            ) : (
              <>
                <Pause className="h-4 w-4" />
                <span>Pause</span>
              </>
            )}
          </Button>

          {micStatus !== 'idle' && (
            <Button
              onClick={onStop}
              variant="destructive"
              className="gap-2 h-9"
              data-hook="record-stop"
            >
              <Square className="h-4 w-4" />
              <span>Stop</span>
            </Button>
          )}
        </div>

        {/* Device Selection & Upload */}
        <div className="flex gap-2">
          <div className="flex-1">
            <Select value={selectedDevice} onValueChange={onDeviceChange}>
              <SelectTrigger 
                className="bg-primary/5 border-primary/20 h-9 text-xs"
                data-hook="device-select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {audioDevices.map((device) => (
                  <SelectItem key={device.id} value={device.id}>
                    {device.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            variant="outline" 
            className="gap-2 border-primary/20 bg-primary/5 hover:bg-primary/10 h-9 text-xs"
            data-hook="file-input"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-3 w-3" />
            <span>Upload</span>
          </Button>
          
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              console.log('[WhisperCard] upload:', file.name, file.size);
              onUpload?.(file);   // 여기서 App.tsx의 handleUploadFile 호출
            }}
          />
        </div>


      </CardContent>
    </Card>
  );
}
