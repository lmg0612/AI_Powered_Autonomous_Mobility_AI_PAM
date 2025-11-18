import React, { useRef, ChangeEvent } from 'react';
import { Mic, Square, Pause, Play, Upload, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { motion } from 'motion/react';
import { MicStatus, NoiseStatus } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';


type WhisperCardProps = {
  micStatus: MicStatus;
  noiseStatus: NoiseStatus;
  dbLevel: number;
  isPaused: boolean;
  waveformValues: number[]; // ?
  selectedDevice: string;
  onDeviceChange: (device: string) => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onSimulate: (text: string) => void;
  devices?: MediaDeviceInfo[];
  onUpload?: (file: File) => void;
};

export function WhisperCard({ 
  micStatus, 
  noiseStatus, 
  dbLevel, 
  isPaused,
  waveformValues,
  devices,
  selectedDevice, 
  onDeviceChange, 
  onStart, 
  onPause,
  onResume,
  onStop, 
  onSimulate,
  onUpload
}: WhisperCardProps) {
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

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpload) return;
    onUpload(file);
    // 같은 파일 다시 선택 가능하게
    e.target.value = '';
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card 
      className="bg-[#121A2B]/80 backdrop-blur-xl border-white/10 overflow-hidden"
      data-hook="whisper-card"
    >
      <CardHeader className="border-b border-white/5">
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
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Input Level</span>
            <span className="text-slate-200 font-mono">{dbLevel.toFixed(1)} dB</span>
          </div>
          <div className="relative h-4 bg-slate-900/50 rounded-full overflow-hidden border border-white/5">
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
            {(waveformValues.length ? waveformValues : new Array(40).fill(0)).map((value, i) => (
              <motion.div
                key={i}
                className="w-1 bg-gradient-to-t from-[#21D4A7] to-[#2E9BFF] rounded-full"
                animate={{ height: `${Math.max(6, value)}%` }}
                transition={{
                  duration: 0.16,
                  ease: 'easeOut',
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
        {/* 왼쪽: 장치 선택 */}
        <div className="flex-1">
          <Select value={selectedDevice} onValueChange={onDeviceChange}>
            <SelectTrigger 
              className="bg-slate-900/50 border-white/10 h-9 text-xs"
              data-hook="device-select"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default Microphone</SelectItem>
              {devices?.map((d) => (
                <SelectItem key={d.deviceId} value={d.deviceId}>
                  {d.label && d.label.trim().length > 0
                    ? d.label
                    : `Mic (${d.deviceId.slice(0, 6)})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

          <Button
            type="button"
            variant="outline"
            className="gap-2 border-white/10 bg-slate-900/50 hover:bg-slate-800/50 h-9 text-xs cursor-pointer"
            data-hook="file-input"
            onClick={handleUploadClick}
          >
            <Upload className="h-3 w-3" />
            <span>Upload</span>
          </Button>
        </div>
      </div>


        {/* Quick Test */}
        <div className="pt-2 border-t border-white/5">
          <div className="flex flex-wrap gap-1.5">
            {['드론 2미터 전진해', '3미터 상승해', '착륙해'].map((cmd) => (
              <Button
                key={cmd}
                onClick={() => onSimulate(cmd)}
                size="sm"
                variant="outline"
                className="gap-1.5 border-white/10 bg-slate-900/30 hover:bg-slate-800/50 text-xs h-7 px-2"
              >
                <Sparkles className="h-3 w-3" />
                {cmd}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
