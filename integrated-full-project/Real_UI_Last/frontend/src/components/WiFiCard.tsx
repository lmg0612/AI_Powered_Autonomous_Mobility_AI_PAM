import { Wifi, Signal, Activity, Radio } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { WiFiStatus } from '../App';

type WiFiCardProps = {
  wifiStatus: WiFiStatus;
};

export function WiFiCard({ wifiStatus }: WiFiCardProps) {
  const rssiToPercent = (rssi: number): number => {
    // RSSI typically ranges from -90 (weak) to -30 (strong)
    return Math.max(0, Math.min(100, ((rssi + 90) / 60) * 100));
  };

  const getSignalStrength = (rssi: number): { label: string; color: string } => {
    if (rssi >= -50) return { label: 'Excellent', color: 'text-[#21D4A7]' };
    if (rssi >= -60) return { label: 'Good', color: 'text-emerald-400' };
    if (rssi >= -70) return { label: 'Fair', color: 'text-amber-400' };
    return { label: 'Poor', color: 'text-red-400' };
  };

  const signal = getSignalStrength(wifiStatus.rssi);

  return (
    <Card 
      className="bg-[#121A2B]/80 backdrop-blur-xl border-white/10"
      data-hook="wifi-card"
    >
      <CardHeader className="border-b border-white/5">
        <CardTitle className="flex items-center gap-2 text-slate-100">
          <Wifi className="h-5 w-5 text-[#2E9BFF]" />
          Wi-Fi 상태
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-6 space-y-4">
        {/* SSID & Signal Strength */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div data-hook="wifi-ssid">
              <p className="text-sm text-slate-400">Network</p>
              <p className="text-lg font-semibold text-slate-100">{wifiStatus.ssid === '--' ? '--' : wifiStatus.ssid}</p>
            </div>
            <div className="text-right">
              <p className={`text-sm font-semibold ${wifiStatus.rssi <= -90 ? 'text-slate-500' : signal.color}`}>
                {wifiStatus.rssi <= -90 ? '--' : signal.label}
              </p>
              <p className="text-xs text-slate-500">
                {wifiStatus.rssi <= -90 ? '--' : `${wifiStatus.rssi} dBm`}
              </p>
            </div>
          </div>
          <Progress 
            value={wifiStatus.rssi <= -90 ? 0 : rssiToPercent(wifiStatus.rssi)} 
            className={`h-2 ${
              wifiStatus.rssi >= -60 ? '[&>div]:bg-[#21D4A7]' :
              wifiStatus.rssi >= -70 ? '[&>div]:bg-amber-500' :
              '[&>div]:bg-red-500'
            }`}
            data-hook="wifi-rssi"
          />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Packet Loss */}
          <div className="p-3 rounded-lg bg-slate-900/30 border border-white/5" data-hook="wifi-plr">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-amber-400" />
              <span className="text-xs text-slate-400">Packet Loss</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-semibold">
                {wifiStatus.packetLoss === 0 ? '--' : wifiStatus.packetLoss.toFixed(1)}
              </span>
              <span className="text-xs text-slate-400">{wifiStatus.packetLoss === 0 ? '' : '%'}</span>
            </div>
          </div>

          {/* Latency */}
          <div className="p-3 rounded-lg bg-slate-900/30 border border-white/5" data-hook="wifi-latency">
            <div className="flex items-center gap-2 mb-2">
              <Signal className="h-4 w-4 text-[#2E9BFF]" />
              <span className="text-xs text-slate-400">Latency</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-semibold">
                {wifiStatus.latency === 0 ? '--' : wifiStatus.latency}
              </span>
              <span className="text-xs text-slate-400">{wifiStatus.latency === 0 ? '' : 'ms'}</span>
            </div>
          </div>
        </div>

        {/* AP Info */}
        <div className="pt-3 border-t border-white/5">
          <div className="flex items-center justify-between text-sm" data-hook="wifi-ap">
            <div>
              <p className="text-slate-500">Access Point</p>
              <p className="text-slate-300 mt-1">{wifiStatus.ap === '--' ? '--' : wifiStatus.ap}</p>
            </div>
            <div className="text-right">
              <p className="text-slate-500">Channel</p>
              <p className="text-slate-300 mt-1">{wifiStatus.channel === 0 ? '--' : wifiStatus.channel}</p>
            </div>
          </div>
        </div>

        {/* Quality Gauge */}
        <div className="pt-3 border-t border-white/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Overall Quality</span>
            <span className="text-sm font-semibold text-slate-200">
              {wifiStatus.quality === 0 ? '--' : `${(wifiStatus.quality * 100).toFixed(0)}%`}
            </span>
          </div>
          <Progress 
            value={wifiStatus.quality * 100} 
            className="h-2 [&>div]:bg-gradient-to-r [&>div]:from-[#21D4A7] [&>div]:to-[#2E9BFF]"
          />
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2 text-xs text-slate-500 pt-2">
          <Radio className={`h-3 w-3 ${wifiStatus.latency === 0 ? 'text-slate-600' : 'text-[#21D4A7] animate-pulse'}`} />
          <span>{wifiStatus.latency === 0 ? 'Not Connected' : `Connected • Last ping ${wifiStatus.latency}ms`}</span>
        </div>
      </CardContent>
    </Card>
  );
}
