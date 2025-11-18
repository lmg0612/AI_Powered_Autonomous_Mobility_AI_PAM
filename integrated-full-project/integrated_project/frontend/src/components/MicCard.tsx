import { Mic, Square, Pause, Play, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { motion } from 'motion/react';
import { MicStatus, NoiseStatus } from '../App';

type MicCardProps = {
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
};

export function MicCard({ 
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
  onSimulate 
}: MicCardProps) {
  // 사용 가능한 오디오 장치 목록 (시뮬레이션)
  const audioDevices = [
    { id: 'default', name: 'Default Microphone' },
    { id: 'at2020', name: 'AT2020USB+' },
    { id: 'blue-yeti', name: 'Blue Yeti' },
    { id: 'rode-nt', name: 'Rode NT-USB' },
    { id: 'shure-mv7', name: 'Shure MV7' },
  ];

  const noiseConfig = {
    idle: { label: '대기 중', color: 'bg-slate-600' },
    profiling: { label: '노이즈 프로필 학습 중', color: 'bg-amber-500 animate-pulse' },
    applied: { label: '적용됨', color: 'bg-emerald-500' },
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

  // 데모용 시뮬레이션 명령
  const demoCommands = [
    '앞으로 2m 이동',
    '위로 5m 상승',
    '착륙해줘',
    '이륙',
  ];

  return (
    <div className="relative rounded-3xl bg-white/[0.08] backdrop-blur-2xl border border-white/10 p-6 overflow-hidden">
      {/* 배경 글로우 */}
      {micStatus === 'listening' && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-transparent to-sky-500/20"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      <div className="relative z-10 space-y-6">
        {/* 상단: 제목 & 노이즈 상태 */}
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-emerald-400" />
            <span>음성 입력</span>
          </h2>
          {noiseStatus !== 'idle' && (
            <Badge className={`${noiseConfig[noiseStatus].color} border-0`}>
              {noiseConfig[noiseStatus].label}
            </Badge>
          )}
        </div>

        {/* 파형 & dB 레벨 */}
        <div className="space-y-3">
          <div className="h-24 rounded-xl bg-black/20 border border-white/5 p-4 flex items-end justify-center gap-1">
            {Array.from({ length: 40 }).map((_, i) => {
              const isActive = micStatus === 'listening' && !isPaused;
              return (
                <motion.div
                  key={i}
                  className="w-1 bg-gradient-to-t from-emerald-400 to-sky-400 rounded-full"
                  animate={{ 
                    height: isActive ? `${10 + Math.random() * 90}%` : '10%' 
                  }}
                  transition={{ 
                    duration: 0.15 + Math.random() * 0.2,
                    repeat: isActive ? Infinity : 0,
                    repeatType: 'reverse',
                    ease: 'easeInOut'
                  }}
                />
              );
            })}
          </div>

          {/* dB 레벨 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">레벨</span>
              <span className={dbLevel > 85 ? 'text-red-400' : 'text-slate-300'}>
                {dbLevel.toFixed(1)} dB
              </span>
            </div>
            <Progress 
              value={Math.min((dbLevel / 100) * 100, 100)} 
              className={`h-2 ${dbLevel > 85 ? '[&>div]:bg-red-500' : '[&>div]:bg-emerald-500'}`}
            />
          </div>
        </div>

        {/* 제어 버튼 */}
        <div className="flex items-center gap-3">
          <Button
            onClick={handlePrimaryAction}
            size="lg"
            className={`flex-1 gap-2 ${
              micStatus === 'listening'
                ? 'bg-amber-500 hover:bg-amber-600'
                : 'bg-emerald-500 hover:bg-emerald-600'
            }`}
          >
            {micStatus === 'idle' && (
              <>
                <Mic className="h-5 w-5" />
                <span>Start</span>
              </>
            )}
            {micStatus === 'listening' && !isPaused && (
              <>
                <Pause className="h-5 w-5" />
                <span>Pause</span>
              </>
            )}
            {micStatus === 'listening' && isPaused && (
              <>
                <Play className="h-5 w-5" />
                <span>Resume</span>
              </>
            )}
          </Button>

          {micStatus !== 'idle' && (
            <Button
              onClick={onStop}
              size="lg"
              variant="destructive"
              className="gap-2"
            >
              <Square className="h-4 w-4" />
              <span>Stop</span>
            </Button>
          )}
        </div>

        {/* 오디오 장치 선택 */}
        <div className="space-y-2">
          <label className="text-sm text-slate-400">Audio Device</label>
          <Select 
            value={selectedDevice} 
            onValueChange={onDeviceChange}
            disabled={micStatus !== 'idle'}
          >
            <SelectTrigger className="bg-white/5 border-white/10 backdrop-blur">
              <SelectValue placeholder="Select audio device" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900/95 backdrop-blur-xl border-white/10">
              {audioDevices.map((device) => (
                <SelectItem 
                  key={device.id} 
                  value={device.id}
                  className="focus:bg-white/10"
                >
                  {device.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {micStatus === 'listening' && (
            <p className="text-xs text-slate-500">무음 2.5초면 자동 일시정지</p>
          )}
        </div>

        {/* 데모 시뮬레이션 버튼 */}
        {micStatus === 'listening' && (
          <div className="space-y-2 pt-4 border-t border-white/10">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Sparkles className="h-4 w-4" />
              <span>데모 명령 (시뮬레이션)</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {demoCommands.map((cmd, i) => (
                <Button
                  key={i}
                  onClick={() => onSimulate(cmd)}
                  variant="outline"
                  size="sm"
                  className="border-white/20 bg-white/5 hover:bg-white/10 text-sm"
                >
                  {cmd}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
