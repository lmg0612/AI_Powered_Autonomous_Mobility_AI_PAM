import { Plane, Clock, Cpu } from 'lucide-react';
import { Badge } from './ui/badge';
import { MicStatus } from '../App';

type TopbarProps = {
  micStatus: MicStatus;
  modelName: string;
  latency: number;
};

export function Topbar({ micStatus, modelName, latency }: TopbarProps) {
  const statusConfig = {
    idle: { label: 'Idle', color: 'bg-slate-600 text-slate-200', icon: '⏸️' },
    listening: { label: 'Listening', color: 'bg-[#21D4A7] text-slate-900', icon: '🎤' },
    processing: { label: 'Processing', color: 'bg-[#2E9BFF] text-white', icon: '⚙️' },
    error: { label: 'Error', color: 'bg-red-500 text-white', icon: '⚠️' },
  };

  const config = statusConfig[micStatus];

  return (
    <header 
      className="sticky top-0 z-50 backdrop-blur-xl bg-black/40 border-b border-white/10"
      data-hook="topbar"
    >
      <div className="max-w-[1600px] mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#21D4A7] to-[#2E9BFF] flex items-center justify-center">
              <Plane className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-100">AeroVoice Control</h1>
              <p className="text-xs text-slate-500">AI-Powered Drone Command Center</p>
            </div>
          </div>

          {/* Status Chips & Actions */}
          <div className="flex items-center gap-3">
            {/* Mic Status */}
            <Badge 
              className={`${config.color} border-0 px-3 py-1.5 gap-2`}
              data-hook="status-mic"
            >
              <span>{config.icon}</span>
              <span className="text-sm">{config.label}</span>
            </Badge>

            {/* Model */}
            <Badge 
              variant="outline" 
              className="border-white/20 bg-white/5 backdrop-blur px-3 py-1.5 gap-2"
              data-hook="status-model"
            >
              <Cpu className="h-4 w-4 text-purple-400" />
              <span className="text-sm text-slate-300">{modelName}</span>
            </Badge>

            {/* Latency */}
            <Badge 
              variant="outline" 
              className="border-white/20 bg-white/5 backdrop-blur px-3 py-1.5 gap-2"
              data-hook="status-latency"
            >
              <Clock className="h-4 w-4 text-emerald-400" />
              <span className="text-sm text-slate-300">{latency}ms</span>
            </Badge>
          </div>
        </div>
      </div>
    </header>
  );
}
