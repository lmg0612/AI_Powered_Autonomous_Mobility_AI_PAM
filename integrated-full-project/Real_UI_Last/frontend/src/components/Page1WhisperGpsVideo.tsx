import { MapPin, Video, Home, Camera, Signal } from 'lucide-react';
import { DroneData, MicStatus, NoiseStatus, StreamItem } from '../App';
import { WhisperCard } from './WhisperCard';
import { PipelineCompact } from './PipelineCompact';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface Page1Props {
  droneData: DroneData;
  micStatus: MicStatus;
  noiseStatus: NoiseStatus;
  dbLevel: number;
  isPaused: boolean;
  selectedDevice: string;
  streamItems: StreamItem[];
  isRecording: boolean;
  onDeviceChange: (device: string) => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onSimulate: (text: string) => void;
  onOpenDetail: () => void;
  onToggleRecording: () => void;
  onUpload?: (file: File) => void;
}

export function Page1WhisperGpsVideo({ 
  droneData, 
  micStatus, 
  noiseStatus, 
  dbLevel, 
  isPaused,
  selectedDevice,
  streamItems,
  isRecording,
  onDeviceChange,
  onStart,
  onPause,
  onResume,
  onStop,
  onSimulate,
  onOpenDetail,
  onToggleRecording,
  onUpload
}: Page1Props) {
  // Get connection status
  const getConnectionStatus = () => {
    const rssi = droneData.link.rssi;
    if (rssi === 0) return { label: '연결 안됨', color: 'bg-slate-600', icon: '○○○○' };
    if (rssi >= -50) return { label: '우수', color: 'bg-emerald-500', icon: '●●●●' };
    if (rssi >= -70) return { label: '양호', color: 'bg-[#21D4A7]', icon: '●●●○' };
    if (rssi >= -85) return { label: '약함', color: 'bg-amber-500', icon: '●●○○' };
    return { label: '불량', color: 'bg-red-500', icon: '●○○○' };
  };

  const connectionStatus = getConnectionStatus();

  return (
    <div className="grid grid-cols-12 gap-4 h-[calc(100vh-200px)]">
      {/* Left Column - Whisper STT + Pipeline */}
      <div className="col-span-7 flex flex-col gap-4">
        <div className="flex-none">
          <WhisperCard
            micStatus={micStatus}
            noiseStatus={noiseStatus}
            dbLevel={dbLevel}
            isPaused={isPaused}
            selectedDevice={selectedDevice}
            onDeviceChange={onDeviceChange}
            onStart={onStart}
            onPause={onPause}
            onResume={onResume}
            onStop={onStop}
            onSimulate={onSimulate}
            onUpload={onUpload}
          />
        </div>
        <div className="flex-1 min-h-0">
          <PipelineCompact 
            streamItems={streamItems}
            onOpenDetail={onOpenDetail}
          />
        </div>
      </div>

      {/* Right Column - GPS Map (Top) & Video (Bottom) */}
      <div className="col-span-5 flex flex-col gap-4 h-full">
        {/* GPS Map - Top Panel */}
        <div className="glass-card rounded-[20px] p-5 h-1/2 shadow-lg shadow-secondary/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-secondary/20 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-secondary" />
            </div>
            <h2 className="text-secondary">GPS 위치 추적</h2>
          </div>

          {/* Map Placeholder */}
          <div className="relative w-full h-[calc(100%-56px)] glass-card rounded-[16px] bg-white/5 overflow-hidden">
            {/* Grid Background */}
            <div 
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `
                  linear-gradient(to right, rgba(46, 155, 255, 0.3) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(46, 155, 255, 0.3) 1px, transparent 1px)
                `,
                backgroundSize: '40px 40px'
              }}
            ></div>

            {/* Center Marker - only show if there's GPS data */}
            {droneData.pose.lat !== 0 && droneData.pose.lon !== 0 && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="relative">
                  {/* Pulse Effect */}
                  <div className="absolute inset-0 w-12 h-12 rounded-full bg-secondary/30 animate-ping"></div>
                  {/* Drone Icon */}
                  <div className="relative w-12 h-12 rounded-full bg-secondary/80 border-2 border-secondary flex items-center justify-center shadow-lg shadow-secondary/50">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            )}

            {droneData.pose.lat !== 0 && droneData.pose.lon !== 0 && (
              <>
                {/* Coordinates Overlay */}
                <div className="absolute bottom-4 left-4 glass-card rounded-[12px] px-4 py-2 bg-black/40">
                  <div className="text-slate-400 text-xs mb-1">현재 위치</div>
                  <div className="text-slate-200 text-sm">
                    {droneData.pose.lat.toFixed(6)}°N, {droneData.pose.lon.toFixed(6)}°E
                  </div>
                </div>

                {/* Altitude */}
                <div className="absolute top-4 right-4 glass-card rounded-[12px] px-4 py-2 bg-black/40">
                  <div className="text-slate-400 text-xs mb-1">고도</div>
                  <div className="text-secondary">{droneData.alt.toFixed(1)}m</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Video Feed - Bottom Panel */}
        <div className="glass-card rounded-[20px] p-5 h-1/2 shadow-lg shadow-primary/5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
                <Video className="w-4 h-4 text-primary" />
              </div>
              <h2 className="text-primary">실시간 영상</h2>
            </div>
            
            {/* Connection Status */}
            <div className="flex items-center gap-2">
              <Signal className={`w-4 h-4 ${connectionStatus.color.replace('bg-', 'text-')}`} />
              <Badge className={`${connectionStatus.color} border-0 text-white text-xs px-2 py-1`}>
                <span className="mr-1.5">{connectionStatus.icon}</span>
                {connectionStatus.label}
              </Badge>
              {droneData.link.rtt_ms > 0 && (
                <div className="text-xs text-slate-400">
                  <span className="text-slate-500">RTT</span> <span className="text-slate-300">{droneData.link.rtt_ms}ms</span>
                </div>
              )}
            </div>
          </div>

          {/* Video Placeholder */}
          <div className="relative w-full h-[calc(100%-100px)] glass-card rounded-[16px] bg-black/50 overflow-hidden">
            {/* Video placeholder with scanline effect */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-slate-500">카메라 대기 중...</div>
            </div>

            {/* Scanline effect */}
            <div 
              className="absolute inset-0 pointer-events-none opacity-10"
              style={{
                background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)'
              }}
            ></div>

            {/* HUD Overlays */}
            <div className="absolute top-4 left-4 space-y-2">
              {isRecording && (
                <div className="glass-card rounded-[8px] px-3 py-1 bg-black/60 text-xs">
                  <span className="text-slate-400">REC</span>
                  <span className="ml-2 text-red-500 animate-pulse">●</span>
                </div>
              )}
              <div className="glass-card rounded-[8px] px-3 py-1 bg-black/60 text-xs text-slate-300">
                1920 × 1080 @ 30fps
              </div>
            </div>

            {/* Crosshair */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-16 h-16">
                <div className="absolute top-0 left-1/2 w-[1px] h-4 bg-primary/60 transform -translate-x-1/2"></div>
                <div className="absolute bottom-0 left-1/2 w-[1px] h-4 bg-primary/60 transform -translate-x-1/2"></div>
                <div className="absolute left-0 top-1/2 w-4 h-[1px] bg-primary/60 transform -translate-y-1/2"></div>
                <div className="absolute right-0 top-1/2 w-4 h-[1px] bg-primary/60 transform -translate-y-1/2"></div>
              </div>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex gap-2 mt-3">
            <Button 
              size="sm"
              className="flex-1 gap-2 bg-red-500/80 hover:bg-red-600 text-white border-0"
            >
              <Home className="w-4 h-4" />
              RTH
            </Button>
            <Button 
              size="sm"
              className="flex-1 gap-2 bg-primary/80 hover:bg-primary text-slate-900 border-0"
            >
              <Camera className="w-4 h-4" />
              촬영
            </Button>
            <Button 
              size="sm"
              onClick={onToggleRecording}
              className={`flex-1 gap-2 border-0 transition-all ${
                isRecording 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-secondary/80 hover:bg-secondary text-white'
              }`}
            >
              {isRecording ? (
                <>
                  <div className="w-3 h-3 bg-white rounded-sm" />
                  중단
                </>
              ) : (
                <>
                  <Video className="w-4 h-4" />
                  녹화
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
