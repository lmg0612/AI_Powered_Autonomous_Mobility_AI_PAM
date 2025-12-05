import { DroneData } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { 
  Gauge, 
  Thermometer, 
  Activity, 
  Compass,
  Radio,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';

type DroneDetailViewProps = {
  droneData: DroneData;
};

export function DroneDetailView({ droneData }: DroneDetailViewProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-slate-100">드론 상세 정보</h2>
        <p className="text-sm text-slate-500 mt-1">모터, 센서, 링크 이벤트 및 시스템 로그</p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Motors */}
        <div className="col-span-12 lg:col-span-6">
          <Card className="bg-[#121A2B]/80 backdrop-blur-xl border-white/10">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="flex items-center gap-2 text-slate-100">
                <Gauge className="h-5 w-5 text-[#21D4A7]" />
                모터 상태
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4">
                {droneData.motors.map((motor) => (
                  <div 
                    key={motor.id}
                    className="p-4 rounded-lg bg-slate-900/30 border border-white/5"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-slate-400">Motor {motor.id}</span>
                      <Badge variant="outline" className={`border-white/20 ${
                        motor.rpm > 0 ? 'bg-[#21D4A7]/20 text-[#21D4A7]' : 'bg-slate-700/20'
                      }`}>
                        {motor.rpm > 0 ? 'Active' : 'Idle'}
                      </Badge>
                    </div>
                    <div className="space-y-3">
                      {/* RPM */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-slate-500">RPM</span>
                          <span className="text-sm font-mono text-slate-200">{motor.rpm}</span>
                        </div>
                        <Progress 
                          value={(motor.rpm / 2000) * 100} 
                          className="h-1 [&>div]:bg-[#21D4A7]"
                        />
                      </div>
                      {/* Temperature */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-slate-500">Temp</span>
                          <span className="text-sm font-mono text-slate-200">{motor.temp}°C</span>
                        </div>
                        <Progress 
                          value={(motor.temp / 80) * 100} 
                          className={`h-1 ${
                            motor.temp > 60 ? '[&>div]:bg-red-500' : 
                            motor.temp > 40 ? '[&>div]:bg-amber-500' : 
                            '[&>div]:bg-emerald-500'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sensors */}
        <div className="col-span-12 lg:col-span-6">
          <Card className="bg-[#121A2B]/80 backdrop-blur-xl border-white/10">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="flex items-center gap-2 text-slate-100">
                <Compass className="h-5 w-5 text-[#2E9BFF]" />
                센서 데이터
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {/* Gyroscope */}
              <div className="p-4 rounded-lg bg-slate-900/30 border border-white/5">
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="h-4 w-4 text-purple-400" />
                  <span className="text-sm text-slate-400">Gyroscope (rad/s)</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500">X:</span>
                    <p className="text-slate-200 font-mono mt-1">{droneData.sensors.gyro[0].toFixed(3)}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Y:</span>
                    <p className="text-slate-200 font-mono mt-1">{droneData.sensors.gyro[1].toFixed(3)}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Z:</span>
                    <p className="text-slate-200 font-mono mt-1">{droneData.sensors.gyro[2].toFixed(3)}</p>
                  </div>
                </div>
              </div>

              {/* Accelerometer */}
              <div className="p-4 rounded-lg bg-slate-900/30 border border-white/5">
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm text-slate-400">Accelerometer (m/s²)</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500">X:</span>
                    <p className="text-slate-200 font-mono mt-1">{droneData.sensors.accel[0].toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Y:</span>
                    <p className="text-slate-200 font-mono mt-1">{droneData.sensors.accel[1].toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Z:</span>
                    <p className="text-slate-200 font-mono mt-1">{droneData.sensors.accel[2].toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Magnetometer */}
              <div className="p-4 rounded-lg bg-slate-900/30 border border-white/5">
                <div className="flex items-center gap-2 mb-3">
                  <Compass className="h-4 w-4 text-sky-400" />
                  <span className="text-sm text-slate-400">Magnetometer (gauss)</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500">X:</span>
                    <p className="text-slate-200 font-mono mt-1">{droneData.sensors.mag[0].toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Y:</span>
                    <p className="text-slate-200 font-mono mt-1">{droneData.sensors.mag[1].toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Z:</span>
                    <p className="text-slate-200 font-mono mt-1">{droneData.sensors.mag[2].toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Link Events & System Logs */}
        <div className="col-span-12">
          <Card className="bg-[#121A2B]/80 backdrop-blur-xl border-white/10">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="flex items-center gap-2 text-slate-100">
                <Radio className="h-5 w-5 text-amber-400" />
                링크 이벤트 & 시스템 로그
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {droneData.logs.map((log, i) => (
                    <div 
                      key={i}
                      className={`p-3 rounded-lg border flex items-start gap-3 ${
                        log.level === 'error' 
                          ? 'bg-red-500/5 border-red-400/20' 
                          : log.level === 'warn' 
                            ? 'bg-amber-500/5 border-amber-400/20' 
                            : 'bg-slate-900/30 border-white/5'
                      }`}
                    >
                      {log.level === 'error' ? (
                        <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                      ) : log.level === 'warn' ? (
                        <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-slate-500 font-mono">
                            {new Date(log.ts).toLocaleTimeString()}
                          </span>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              log.level === 'error' ? 'border-red-400/30 text-red-400' :
                              log.level === 'warn' ? 'border-amber-400/30 text-amber-400' :
                              'border-emerald-400/30 text-emerald-400'
                            }`}
                          >
                            {log.level.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-200">{log.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Mission Queue (Placeholder) */}
        <div className="col-span-12 lg:col-span-6">
          <Card className="bg-[#121A2B]/80 backdrop-blur-xl border-white/10">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="flex items-center gap-2 text-slate-100">
                <Activity className="h-5 w-5 text-purple-400" />
                임무 큐
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-center py-12 text-slate-500">
                <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">예약된 임무가 없습니다</p>
                <p className="text-xs mt-1">Coming soon</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error Events Timeline (Placeholder) */}
        <div className="col-span-12 lg:col-span-6">
          <Card className="bg-[#121A2B]/80 backdrop-blur-xl border-white/10">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="flex items-center gap-2 text-slate-100">
                <AlertCircle className="h-5 w-5 text-red-400" />
                오류 이벤트 타임라인
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-center py-12 text-slate-500">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-30 text-emerald-500" />
                <p className="text-sm text-emerald-400">오류 없음</p>
                <p className="text-xs mt-1">시스템 정상 작동 중</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
