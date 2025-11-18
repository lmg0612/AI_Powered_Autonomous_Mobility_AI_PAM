import { DroneData } from '../App';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { 
  Plane, 
  Battery, 
  Satellite, 
  Gauge, 
  Wind, 
  Wifi,
  Navigation,
  TrendingUp
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

type DroneStatusPanelProps = {
  droneData: DroneData;
};

export function DroneStatusPanel({ droneData }: DroneStatusPanelProps) {
  const modeConfig: Record<string, { color: string; bgColor: string }> = {
    'Stabilize': { color: 'text-slate-300', bgColor: 'bg-slate-600' },
    'Loiter': { color: 'text-emerald-300', bgColor: 'bg-emerald-500' },
    'RTL': { color: 'text-amber-300', bgColor: 'bg-amber-500' },
    'Offboard': { color: 'text-sky-300', bgColor: 'bg-sky-500' },
    'Land': { color: 'text-purple-300', bgColor: 'bg-purple-500' },
  };

  const mode = modeConfig[droneData.mode] || modeConfig['Stabilize'];

  return (
    <div className="rounded-3xl bg-white/[0.08] backdrop-blur-2xl border border-white/10 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Plane className="h-5 w-5 text-sky-400" />
          <h2>Drone Status</h2>
        </div>
        <Badge className={`${mode.bgColor} border-0`}>
          {droneData.mode}
        </Badge>
      </div>

      {/* 상태 카드 그리드 - 2x3 레이아웃 */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Battery */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="p-4 rounded-xl bg-white/[0.06] backdrop-blur border border-white/5 space-y-2">
                <div className="flex items-center gap-2">
                  <Battery className={`h-4 w-4 ${
                    droneData.battery.pct > 0.5 ? 'text-emerald-400' : 
                    droneData.battery.pct > 0.2 ? 'text-amber-400' : 
                    'text-red-400'
                  }`} />
                  <span className="text-sm text-slate-400">Battery</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl">{(droneData.battery.pct * 100).toFixed(0)}</span>
                    <span className="text-sm text-slate-400">%</span>
                  </div>
                  <Progress 
                    value={droneData.battery.pct * 100} 
                    className={`h-1 ${
                      droneData.battery.pct > 0.5 ? '[&>div]:bg-emerald-500' : 
                      droneData.battery.pct > 0.2 ? '[&>div]:bg-amber-500' : 
                      '[&>div]:bg-red-500'
                    }`}
                  />
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1 text-sm">
                <p>전압: {droneData.battery.v}V</p>
                <p>전류: {droneData.battery.a}A</p>
                <p>잔여: ~{droneData.battery.remainMin}분</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* GPS */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="p-4 rounded-xl bg-white/[0.06] backdrop-blur border border-white/5 space-y-2">
                <div className="flex items-center gap-2">
                  <Satellite className={`h-4 w-4 ${
                    droneData.gps.fix >= 6 ? 'text-emerald-400' : 'text-amber-400'
                  }`} />
                  <span className="text-sm text-slate-400">GPS</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl">{droneData.gps.fix}</span>
                    <span className="text-sm text-slate-400">sats</span>
                  </div>
                  <p className="text-xs text-slate-500">HDOP {droneData.gps.hdop.toFixed(1)}</p>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>위성 {droneData.gps.fix}개 확보</p>
              <p className="text-xs text-slate-400">수평 정밀도: {droneData.gps.hdop}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Altitude */}
        <div className="p-4 rounded-xl bg-white/[0.06] backdrop-blur border border-white/5 space-y-2">
          <div className="flex items-center gap-2">
            <Navigation className="h-4 w-4 text-sky-400" />
            <span className="text-sm text-slate-400">Altitude</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl">{droneData.alt.toFixed(1)}</span>
              <span className="text-sm text-slate-400">m</span>
            </div>
            <p className="text-xs text-slate-500">AGL</p>
          </div>
        </div>

        {/* Velocity */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="p-4 rounded-xl bg-white/[0.06] backdrop-blur border border-white/5 space-y-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-purple-400" />
                  <span className="text-sm text-slate-400">Velocity</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl">
                      {Math.sqrt(
                        droneData.vel.x ** 2 + 
                        droneData.vel.y ** 2 + 
                        droneData.vel.z ** 2
                      ).toFixed(1)}
                    </span>
                    <span className="text-sm text-slate-400">m/s</span>
                  </div>
                  <p className="text-xs text-slate-500">Total</p>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1 text-sm">
                <p>X: {droneData.vel.x.toFixed(2)} m/s</p>
                <p>Y: {droneData.vel.y.toFixed(2)} m/s</p>
                <p>Z: {droneData.vel.z.toFixed(2)} m/s</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Wind */}
        <div className="p-4 rounded-xl bg-white/[0.06] backdrop-blur border border-white/5 space-y-2">
          <div className="flex items-center gap-2">
            <Wind className="h-4 w-4 text-cyan-400" />
            <span className="text-sm text-slate-400">Wind</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl">{droneData.wind.mps.toFixed(1)}</span>
              <span className="text-sm text-slate-400">m/s</span>
            </div>
            <p className="text-xs text-slate-500">@ {droneData.wind.deg}°</p>
          </div>
        </div>

        {/* Link */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="p-4 rounded-xl bg-white/[0.06] backdrop-blur border border-white/5 space-y-2">
                <div className="flex items-center gap-2">
                  <Wifi className={`h-4 w-4 ${
                    droneData.link.rssi > 0.7 ? 'text-emerald-400' : 
                    droneData.link.rssi > 0.4 ? 'text-amber-400' : 
                    'text-red-400'
                  }`} />
                  <span className="text-sm text-slate-400">Link</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl">{(droneData.link.rssi * 100).toFixed(0)}</span>
                    <span className="text-sm text-slate-400">%</span>
                  </div>
                  <Progress 
                    value={droneData.link.rssi * 100} 
                    className={`h-1 ${
                      droneData.link.rssi > 0.7 ? '[&>div]:bg-emerald-500' : 
                      droneData.link.rssi > 0.4 ? '[&>div]:bg-amber-500' : 
                      '[&>div]:bg-red-500'
                    }`}
                  />
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1 text-sm">
                <p>RC RSSI: {(droneData.link.rssi * 100).toFixed(0)}%</p>
                <p>Telemetry RTT: {droneData.link.rtt_ms}ms</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* 추가 정보 */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-500">Position:</span>
            <p className="text-slate-300 mt-1">
              {droneData.pose.lat.toFixed(6)}, {droneData.pose.lon.toFixed(6)}
            </p>
          </div>
          <div>
            <span className="text-slate-500">Heading:</span>
            <p className="text-slate-300 mt-1">{droneData.pose.yaw_deg.toFixed(0)}°</p>
          </div>
        </div>
      </div>
    </div>
  );
}
