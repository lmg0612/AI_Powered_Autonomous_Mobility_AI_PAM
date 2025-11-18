import { DroneData } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { 
  Plane, 
  Battery, 
  Satellite, 
  Navigation, 
  Wind, 
  Wifi,
  TrendingUp,
  Gauge
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { ScrollArea } from './ui/scroll-area';

type DroneStatusCardProps = {
  droneData: DroneData;
};

export function DroneStatusCard({ droneData }: DroneStatusCardProps) {
  const modeConfig: Record<string, { color: string; bgColor: string }> = {
    'Stabilize': { color: 'text-slate-300', bgColor: 'bg-slate-600' },
    'Loiter': { color: 'text-emerald-300', bgColor: 'bg-emerald-500' },
    'RTL': { color: 'text-amber-300', bgColor: 'bg-amber-500' },
    'Offboard': { color: 'text-[#2E9BFF]', bgColor: 'bg-[#2E9BFF]' },
    'Land': { color: 'text-purple-300', bgColor: 'bg-purple-500' },
  };

  const mode = modeConfig[droneData.mode] || modeConfig['Stabilize'];

  return (
    <Card 
      className="bg-[#121A2B]/80 backdrop-blur-xl border-white/10"
      data-hook="drone-status-card"
    >
      <CardHeader className="border-b border-white/5">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-slate-100">
            <Plane className="h-5 w-5 text-[#21D4A7]" />
            드론 상태
          </CardTitle>
          <Badge className={`${mode.bgColor} border-0`}>
            {droneData.mode}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {/* Stats Grid - 2x3 */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Battery */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div 
                  className="p-3 rounded-lg bg-slate-900/30 border border-white/5 hover:bg-slate-900/50 transition-colors space-y-2"
                  data-hook="bat"
                >
                  <div className="flex items-center gap-2">
                    <Battery className={`h-4 w-4 ${
                      droneData.battery.pct > 0.5 ? 'text-[#21D4A7]' : 
                      droneData.battery.pct > 0.2 ? 'text-amber-400' : 
                      'text-red-400'
                    }`} />
                    <span className="text-xs text-slate-400">Battery</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-semibold">
                        {droneData.battery.pct === 0 ? '--' : (droneData.battery.pct * 100).toFixed(0)}
                      </span>
                      <span className="text-xs text-slate-400">{droneData.battery.pct === 0 ? '' : '%'}</span>
                    </div>
                    <Progress 
                      value={droneData.battery.pct * 100} 
                      className={`h-1 ${
                        droneData.battery.pct > 0.5 ? '[&>div]:bg-[#21D4A7]' : 
                        droneData.battery.pct > 0.2 ? '[&>div]:bg-amber-500' : 
                        '[&>div]:bg-red-500'
                      }`}
                    />
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1 text-xs">
                  <p>전압: {droneData.battery.v === 0 ? '--' : `${droneData.battery.v}V`}</p>
                  <p>전류: {droneData.battery.a === 0 ? '--' : `${droneData.battery.a}A`}</p>
                  <p>잔여: {droneData.battery.remainMin === 0 ? '--' : `~${droneData.battery.remainMin}분`}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* GPS */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div 
                  className="p-3 rounded-lg bg-slate-900/30 border border-white/5 hover:bg-slate-900/50 transition-colors space-y-2"
                  data-hook="gps"
                >
                  <div className="flex items-center gap-2">
                    <Satellite className={`h-4 w-4 ${
                      droneData.gps.fix >= 6 ? 'text-[#21D4A7]' : 'text-amber-400'
                    }`} />
                    <span className="text-xs text-slate-400">GPS</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-semibold">
                        {droneData.gps.fix === 0 ? '--' : droneData.gps.fix}
                      </span>
                      <span className="text-xs text-slate-400">{droneData.gps.fix === 0 ? '' : 'sats'}</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      HDOP {droneData.gps.hdop === 0 ? '--' : droneData.gps.hdop.toFixed(1)}
                    </p>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">위성 {droneData.gps.fix === 0 ? '--' : `${droneData.gps.fix}개`} 확보</p>
                <p className="text-xs text-slate-400">수평 정밀도: {droneData.gps.hdop === 0 ? '--' : droneData.gps.hdop}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Altitude */}
          <div 
            className="p-3 rounded-lg bg-slate-900/30 border border-white/5 space-y-2"
            data-hook="alt"
          >
            <div className="flex items-center gap-2">
              <Navigation className="h-4 w-4 text-[#2E9BFF]" />
              <span className="text-xs text-slate-400">Altitude</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-semibold">
                  {droneData.alt === 0 ? '--' : droneData.alt.toFixed(1)}
                </span>
                <span className="text-xs text-slate-400">{droneData.alt === 0 ? '' : 'm'}</span>
              </div>
              <p className="text-xs text-slate-500">AGL</p>
            </div>
          </div>

          {/* Velocity */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div 
                  className="p-3 rounded-lg bg-slate-900/30 border border-white/5 hover:bg-slate-900/50 transition-colors space-y-2"
                  data-hook="vel"
                >
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-purple-400" />
                    <span className="text-xs text-slate-400">Velocity</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-semibold">
                        {droneData.vel.x === 0 && droneData.vel.y === 0 && droneData.vel.z === 0
                          ? '--'
                          : Math.sqrt(
                              droneData.vel.x ** 2 + 
                              droneData.vel.y ** 2 + 
                              droneData.vel.z ** 2
                            ).toFixed(1)}
                      </span>
                      <span className="text-xs text-slate-400">
                        {droneData.vel.x === 0 && droneData.vel.y === 0 && droneData.vel.z === 0 ? '' : 'm/s'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">Total</p>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1 text-xs">
                  <p>X: {droneData.vel.x === 0 ? '--' : `${droneData.vel.x.toFixed(2)} m/s`}</p>
                  <p>Y: {droneData.vel.y === 0 ? '--' : `${droneData.vel.y.toFixed(2)} m/s`}</p>
                  <p>Z: {droneData.vel.z === 0 ? '--' : `${droneData.vel.z.toFixed(2)} m/s`}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Wind */}
          <div 
            className="p-3 rounded-lg bg-slate-900/30 border border-white/5 space-y-2"
            data-hook="wind"
          >
            <div className="flex items-center gap-2">
              <Wind className="h-4 w-4 text-cyan-400" />
              <span className="text-xs text-slate-400">Wind</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-semibold">
                  {droneData.wind.mps === 0 ? '--' : droneData.wind.mps.toFixed(1)}
                </span>
                <span className="text-xs text-slate-400">{droneData.wind.mps === 0 ? '' : 'm/s'}</span>
              </div>
              <p className="text-xs text-slate-500">
                {droneData.wind.deg === 0 && droneData.wind.mps === 0 ? '--' : `@ ${droneData.wind.deg}°`}
              </p>
            </div>
          </div>

          {/* Link */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div 
                  className="p-3 rounded-lg bg-slate-900/30 border border-white/5 hover:bg-slate-900/50 transition-colors space-y-2"
                  data-hook="link"
                >
                  <div className="flex items-center gap-2">
                    <Wifi className={`h-4 w-4 ${
                      droneData.link.rssi > 0.7 ? 'text-[#21D4A7]' : 
                      droneData.link.rssi > 0.4 ? 'text-amber-400' : 
                      'text-red-400'
                    }`} />
                    <span className="text-xs text-slate-400">Link</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-semibold">
                        {droneData.link.rssi === 0 ? '--' : (droneData.link.rssi * 100).toFixed(0)}
                      </span>
                      <span className="text-xs text-slate-400">{droneData.link.rssi === 0 ? '' : '%'}</span>
                    </div>
                    <Progress 
                      value={droneData.link.rssi * 100} 
                      className={`h-1 ${
                        droneData.link.rssi > 0.7 ? '[&>div]:bg-[#21D4A7]' : 
                        droneData.link.rssi > 0.4 ? '[&>div]:bg-amber-500' : 
                        '[&>div]:bg-red-500'
                      }`}
                    />
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1 text-xs">
                  <p>RC RSSI: {droneData.link.rssi === 0 ? '--' : `${(droneData.link.rssi * 100).toFixed(0)}%`}</p>
                  <p>Telemetry RTT: {droneData.link.rtt_ms === 0 ? '--' : `${droneData.link.rtt_ms}ms`}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Position & Heading */}
        <div className="pt-4 border-t border-white/5">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div data-hook="pos">
              <span className="text-slate-500">Position:</span>
              <p className="text-slate-300 mt-1 font-mono text-xs">
                {droneData.pose.lat.toFixed(6)}, {droneData.pose.lon.toFixed(6)}
              </p>
            </div>
            <div data-hook="hdg">
              <span className="text-slate-500">Heading:</span>
              <p className="text-slate-300 mt-1">{droneData.pose.yaw_deg.toFixed(0)}°</p>
            </div>
          </div>
        </div>

        {/* Recent Logs */}
        <div className="pt-4 border-t border-white/5">
          <h3 className="text-xs text-slate-500 mb-2">Recent Logs (6 lines)</h3>
          <ScrollArea className="h-[100px]">
            <div className="space-y-1" data-hook="drone-log">
              {droneData.logs.length === 0 ? (
                <div className="flex items-center justify-center h-[100px] text-xs text-slate-600">
                  No logs available
                </div>
              ) : (
                droneData.logs.slice(0, 6).map((log, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className="text-slate-500 font-mono">
                      {new Date(log.ts).toLocaleTimeString()}
                    </span>
                    <span className={`${
                      log.level === 'error' ? 'text-red-400' :
                      log.level === 'warn' ? 'text-amber-400' :
                      'text-slate-400'
                    }`}>
                      {log.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
