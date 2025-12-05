import { Activity, AlertCircle, Thermometer, Zap } from 'lucide-react';
import { DroneData } from '../App';
import { Badge } from './ui/badge';

interface Page2Props {
  droneData: DroneData;
}

export function Page2SensorEventLog({ droneData }: Page2Props) {
  // Use only real drone logs
  const eventLogs = droneData.logs;

  const formatTime = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleTimeString('ko-KR', { hour12: false });
  };

  return (
    <div className="grid grid-cols-12 gap-4 h-[calc(100vh-200px)]">
      {/* Left Large Panel - Flight Control Sensors */}
      <div className="col-span-7">
        <div className="glass-card rounded-[20px] p-5 h-full border border-white/10 overflow-hidden">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
              <Activity className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-primary">센서 데이터 - 비행 제어</h2>
          </div>

          <div className="grid grid-cols-3 gap-3 h-[calc(100%-64px)] content-start overflow-y-auto custom-scrollbar">
            {/* Ultrasonic Distance */}
            <div className="glass-card rounded-[12px] p-4 bg-white/5 border border-white/5">
              <div className="text-slate-400 text-xs mb-2">초음파 거리</div>
              <div className="text-2xl text-slate-100">--</div>
              <div className="text-xs text-slate-500 mt-1">cm</div>
            </div>

            {/* RSSI */}
            <div className="glass-card rounded-[12px] p-4 bg-white/5 border border-white/5">
              <div className="text-slate-400 text-xs mb-2">RSSI</div>
              <div className="text-2xl text-secondary">{droneData.link.rssi}</div>
              <div className="text-xs text-slate-500 mt-1">dBm</div>
            </div>

            {/* Altitude */}
            <div className="glass-card rounded-[12px] p-4 bg-white/5 border border-white/5">
              <div className="text-slate-400 text-xs mb-2">상대 고도</div>
              <div className="text-2xl text-primary">{droneData.alt.toFixed(1)}</div>
              <div className="text-xs text-slate-500 mt-1">m</div>
            </div>

            {/* Velocity NED - X */}
            <div className="glass-card rounded-[12px] p-4 bg-white/5 border border-white/5">
              <div className="text-slate-400 text-xs mb-2">속도 (North)</div>
              <div className="text-2xl text-slate-100">{droneData.vel.x.toFixed(2)}</div>
              <div className="text-xs text-slate-500 mt-1">m/s</div>
            </div>

            {/* Velocity NED - Y */}
            <div className="glass-card rounded-[12px] p-4 bg-white/5 border border-white/5">
              <div className="text-slate-400 text-xs mb-2">속도 (East)</div>
              <div className="text-2xl text-slate-100">{droneData.vel.y.toFixed(2)}</div>
              <div className="text-xs text-slate-500 mt-1">m/s</div>
            </div>

            {/* Velocity NED - Z */}
            <div className="glass-card rounded-[12px] p-4 bg-white/5 border border-white/5">
              <div className="text-slate-400 text-xs mb-2">속도 (Down)</div>
              <div className="text-2xl text-slate-100">{droneData.vel.z.toFixed(2)}</div>
              <div className="text-xs text-slate-500 mt-1">m/s</div>
            </div>

            {/* Flight Mode */}
            <div className="glass-card rounded-[12px] p-4 bg-white/5 border border-white/5">
              <div className="text-slate-400 text-xs mb-2">비행 모드</div>
              <div className="text-xl text-primary mt-1">{droneData.mode}</div>
            </div>

            {/* Gyro X */}
            <div className="glass-card rounded-[12px] p-4 bg-white/5 border border-white/5">
              <div className="text-slate-400 text-xs mb-2">Gyro X</div>
              <div className="text-2xl text-slate-100">{droneData.sensors.gyro[0].toFixed(3)}</div>
              <div className="text-xs text-slate-500 mt-1">rad/s</div>
            </div>

            {/* Gyro Y */}
            <div className="glass-card rounded-[12px] p-4 bg-white/5 border border-white/5">
              <div className="text-slate-400 text-xs mb-2">Gyro Y</div>
              <div className="text-2xl text-slate-100">{droneData.sensors.gyro[1].toFixed(3)}</div>
              <div className="text-xs text-slate-500 mt-1">rad/s</div>
            </div>

            {/* Gyro Z */}
            <div className="glass-card rounded-[12px] p-4 bg-white/5 border border-white/5">
              <div className="text-slate-400 text-xs mb-2">Gyro Z</div>
              <div className="text-2xl text-slate-100">{droneData.sensors.gyro[2].toFixed(3)}</div>
              <div className="text-xs text-slate-500 mt-1">rad/s</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - Event Log (Top) & Additional Sensors (Bottom) */}
      <div className="col-span-5 flex flex-col gap-4 h-full">
        {/* Event Log - Top Panel */}
        <div className="glass-card rounded-[20px] p-5 h-1/2 border border-white/10 overflow-hidden">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-amber-500" />
            </div>
            <h2 className="text-amber-500">이벤트 로그</h2>
          </div>

          <div className="space-y-2 h-[calc(100%-56px)] overflow-y-auto custom-scrollbar">
            {eventLogs.length > 0 ? (
              eventLogs.map((log, idx) => (
                <div 
                  key={idx} 
                  className="glass-card rounded-[10px] p-3 bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge 
                          className={`
                            text-xs px-2 py-0 border-0
                            ${log.level === 'info' ? 'bg-blue-500/20 text-blue-400' : ''}
                            ${log.level === 'warn' ? 'bg-amber-500/20 text-amber-400' : ''}
                            ${log.level === 'error' ? 'bg-red-500/20 text-red-400' : ''}
                          `}
                        >
                          {log.level.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-slate-500">{formatTime(log.ts)}</span>
                      </div>
                      <div className="text-sm text-slate-200">{log.message}</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                이벤트 로그가 없습니다
              </div>
            )}
          </div>
        </div>

        {/* Sensor Data 2 - Bottom Panel */}
        <div className="glass-card rounded-[20px] p-5 h-1/2 border border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-secondary/20 flex items-center justify-center">
              <Zap className="w-4 h-4 text-secondary" />
            </div>
            <h2 className="text-secondary">센서 데이터 2</h2>
          </div>

          <div className="space-y-3">
            {/* Battery */}
            <div className="glass-card rounded-[12px] p-4 bg-white/5 border border-white/5">
              <div className="flex items-center justify-between mb-2">
                <div className="text-slate-400 text-sm">배터리 잔량</div>
                <div className="text-2xl text-primary">{(droneData.battery.pct * 100).toFixed(0)}%</div>
              </div>
              <div className="h-2 bg-slate-900/50 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-300"
                  style={{ width: `${droneData.battery.pct * 100}%` }}
                ></div>
              </div>
              {droneData.battery.v > 0 && (
                <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                  <span>{droneData.battery.v.toFixed(2)}V</span>
                  <span>{droneData.battery.a.toFixed(2)}A</span>
                  {droneData.battery.remainMin > 0 && <span>~{droneData.battery.remainMin}분</span>}
                </div>
              )}
            </div>

            {/* ESC Temperature */}
            <div className="glass-card rounded-[12px] p-4 bg-white/5 border border-white/5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                  <Thermometer className="w-4 h-4 text-orange-400" />
                </div>
                <div>
                  <div className="text-slate-400 text-xs">ESC 온도</div>
                  <div className="text-xl text-slate-100">--°C</div>
                </div>
              </div>
            </div>

            {/* Motor RPM */}
            <div className="glass-card rounded-[12px] p-4 bg-white/5 border border-white/5">
              <div className="text-slate-400 text-xs mb-3">모터 RPM</div>
              <div className="grid grid-cols-2 gap-2">
                {droneData.motors.map((motor) => (
                  <div key={motor.id} className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">M{motor.id}</span>
                    <span className="text-sm text-slate-200">{motor.rpm}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
