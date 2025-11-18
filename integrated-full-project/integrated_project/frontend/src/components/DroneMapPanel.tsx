import { DroneData } from '../App';
import { Map, Home, Navigation2 } from 'lucide-react';
import { Badge } from './ui/badge';
import { useEffect, useRef } from 'react';

type DroneMapPanelProps = {
  droneData: DroneData;
};

export function DroneMapPanel({ droneData }: DroneMapPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, 0, width, height);

    // Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }
    for (let i = 0; i < height; i += 40) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.stroke();
    }

    // 좌표 변환 함수 (lat/lon → canvas x/y)
    const latToY = (lat: number) => {
      const minLat = 35.7998;
      const maxLat = 35.8002;
      return height - ((lat - minLat) / (maxLat - minLat)) * height;
    };

    const lonToX = (lon: number) => {
      const minLon = 127.0998;
      const maxLon = 127.1002;
      return ((lon - minLon) / (maxLon - minLon)) * width;
    };

    // Geofence 폴리곤 - 더 두껍게
    if (droneData.geofence.length > 0) {
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      droneData.geofence.forEach(([lat, lon], i) => {
        const x = lonToX(lon);
        const y = latToY(lat);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 홈 위치 (지오펜스 중심)
    if (droneData.geofence.length > 0) {
      const centerLat = droneData.geofence.reduce((sum, [lat]) => sum + lat, 0) / droneData.geofence.length;
      const centerLon = droneData.geofence.reduce((sum, [, lon]) => sum + lon, 0) / droneData.geofence.length;
      const homeX = lonToX(centerLon);
      const homeY = latToY(centerLat);

      // 홈 마커
      ctx.fillStyle = 'rgba(59, 130, 246, 0.8)';
      ctx.beginPath();
      ctx.arc(homeX, homeY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(59, 130, 246, 1)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // 경로 세그먼트
    droneData.pathSegments.forEach((segment, segIndex) => {
      const isLatest = segIndex === droneData.pathSegments.length - 1;
      
      ctx.strokeStyle = segment.color;
      ctx.lineWidth = isLatest ? 5 : 3; // 최신 세그먼트는 더 두껍게
      
      if (!isLatest) {
        ctx.setLineDash([4, 4]); // 이전 세그먼트는 점선
      }
      
      ctx.beginPath();
      segment.polyline.forEach(([lat, lon], i) => {
        const x = lonToX(lon);
        const y = latToY(lat);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]); // 점선 리셋
    });

    // 현재 위치 & 헤딩
    const currentX = lonToX(droneData.pose.lon);
    const currentY = latToY(droneData.pose.lat);

    // 헤딩 화살표
    const yawRad = (droneData.pose.yaw_deg * Math.PI) / 180;
    const arrowLen = 20;
    const arrowEndX = currentX + Math.sin(yawRad) * arrowLen;
    const arrowEndY = currentY - Math.cos(yawRad) * arrowLen;

    ctx.strokeStyle = 'rgba(52, 211, 153, 1)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(currentX, currentY);
    ctx.lineTo(arrowEndX, arrowEndY);
    ctx.stroke();

    // 화살촉
    const angle = Math.atan2(arrowEndY - currentY, arrowEndX - currentX);
    ctx.beginPath();
    ctx.moveTo(arrowEndX, arrowEndY);
    ctx.lineTo(
      arrowEndX - 8 * Math.cos(angle - Math.PI / 6),
      arrowEndY - 8 * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(arrowEndX, arrowEndY);
    ctx.lineTo(
      arrowEndX - 8 * Math.cos(angle + Math.PI / 6),
      arrowEndY - 8 * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();

    // 현재 위치 원
    ctx.fillStyle = 'rgba(52, 211, 153, 0.3)';
    ctx.beginPath();
    ctx.arc(currentX, currentY, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(52, 211, 153, 1)';
    ctx.lineWidth = 2;
    ctx.stroke();

  }, [droneData]);

  return (
    <div className="rounded-3xl bg-white/[0.08] backdrop-blur-2xl border border-white/10 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Map className="h-5 w-5 text-emerald-400" />
          <h2>Map & Geofence</h2>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="border-sky-400/30 bg-sky-400/10 text-sky-300 text-xs gap-1">
            <Home className="h-3 w-3" />
            <span>Home</span>
          </Badge>
          <Badge variant="outline" className="border-emerald-400/30 bg-emerald-400/10 text-emerald-300 text-xs gap-1">
            <Navigation2 className="h-3 w-3" />
            <span>Drone</span>
          </Badge>
        </div>
      </div>

      {/* Map Canvas */}
      <div className="relative rounded-xl overflow-hidden border border-white/5">
        <canvas
          ref={canvasRef}
          width={600}
          height={400}
          className="w-full h-auto"
        />
      </div>

      {/* Legend */}
      <div className="mt-4 grid grid-cols-3 gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-sky-500 border-2 border-sky-400" />
          <span className="text-slate-400">Home</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-red-500 border-red-500" style={{ borderStyle: 'dashed' }} />
          <span className="text-slate-400">Geofence</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-emerald-500" />
          <span className="text-slate-400">Path</span>
        </div>
      </div>
    </div>
  );
}
