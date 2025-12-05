import { Wifi, Mic, MicOff, Loader2, AlertCircle } from 'lucide-react';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { MicStatus, StreamItem } from '../App';
import { ExportDialog } from './ExportDialog';
import { KeyboardShortcuts } from './KeyboardShortcuts';

type HeaderProps = {
  micStatus: MicStatus;
  noiseEnabled: boolean;
  streamItems: StreamItem[];
  onNoiseToggle: () => void;
};

export function Header({ micStatus, noiseEnabled, streamItems, onNoiseToggle }: HeaderProps) {
  const statusConfig = {
    idle: { label: 'Idle', color: 'bg-slate-600', icon: MicOff },
    listening: { label: 'Listening', color: 'bg-emerald-500 shadow-[0_0_20px_rgba(52,211,153,0.6)]', icon: Mic },
    processing: { label: 'Processing', color: 'bg-sky-500', icon: Loader2 },
    error: { label: 'Error', color: 'bg-red-500', icon: AlertCircle },
  };

  const config = statusConfig[micStatus];
  const Icon = config.icon;

  return (
    <header className="border-b border-white/10 backdrop-blur-xl bg-black/20">
      <div className="max-w-[1600px] mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Mic 상태칩 */}
            <Badge className={`${config.color} border-0 px-3 py-1.5 gap-2`}>
              <Icon className={`h-4 w-4 ${micStatus === 'processing' ? 'animate-spin' : ''}`} />
              <span>{config.label}</span>
            </Badge>

            {/* 네트워크 핑 */}
            <Badge variant="outline" className="border-white/20 bg-white/5 backdrop-blur px-3 py-1.5 gap-2">
              <Wifi className="h-4 w-4 text-emerald-400" />
              <span className="text-slate-300">42ms</span>
            </Badge>

            {/* 모델명 */}
            <Badge variant="outline" className="border-white/20 bg-white/5 backdrop-blur px-3 py-1.5">
              <span className="text-slate-300">Whisper Small</span>
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            {/* Noise Suppression 토글 */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 backdrop-blur border border-white/10">
              <span className="text-sm text-slate-300">Noise</span>
              <Switch checked={noiseEnabled} onCheckedChange={onNoiseToggle} />
            </div>

            {/* Export Dialog */}
            <ExportDialog streamItems={streamItems} />

            {/* Keyboard Shortcuts */}
            <KeyboardShortcuts />
          </div>
        </div>
      </div>
    </header>
  );
}
