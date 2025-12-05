import { useState, useEffect, useRef } from 'react';
import { DroneData } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Map, Route } from 'lucide-react';

type MapCardProps = {
  droneData: DroneData;
};

export function MapCard({ droneData }: MapCardProps) {
  const [activeMapTab, setActiveMapTab] = useState('map');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || activeMapTab !== 'map') return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

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

    // Geofence
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

    // Home
    if (droneData.geofence.length > 0) {
      const centerLat = droneData.geofence.reduce((sum, [lat]) => sum + lat, 0) / droneData.geofence.length;
      const centerLon = droneData.geofence.reduce((sum, [, lon]) => sum + lon, 0) / droneData.geofence.length;
      const homeX = lonToX(centerLon);
      const homeY = latToY(centerLat);

      ctx.fillStyle = 'rgba(59, 130, 246, 0.8)';
      ctx.beginPath();
      ctx.arc(homeX, homeY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(59, 130, 246, 1)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Path segments
    droneData.pathSegments.forEach((segment, segIndex) => {
      const isLatest = segIndex === droneData.pathSegments.length - 1;
      
      ctx.strokeStyle = segment.color;
      ctx.lineWidth = isLatest ? 5 : 3;
      
      if (!isLatest) {
        ctx.setLineDash([4, 4]);
      }
      
      ctx.beginPath();
      segment.polyline.forEach(([lat, lon], i) => {
        const x = lonToX(lon);
        const y = latToY(lat);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // Current position
    const currentX = lonToX(droneData.pose.lon);
    const currentY = latToY(droneData.pose.lat);

    // Heading arrow
    const yawRad = (droneData.pose.yaw_deg * Math.PI) / 180;
    const arrowLen = 20;
    const arrowEndX = currentX + Math.sin(yawRad) * arrowLen;
    const arrowEndY = currentY - Math.cos(yawRad) * arrowLen;

    ctx.strokeStyle = '#21D4A7';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(currentX, currentY);
    ctx.lineTo(arrowEndX, arrowEndY);
    ctx.stroke();

    // Arrow head
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

    // Position circle
    ctx.fillStyle = 'rgba(33, 212, 167, 0.3)';
    ctx.beginPath();
    ctx.arc(currentX, currentY, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#21D4A7';
    ctx.lineWidth = 2;
    ctx.stroke();

  }, [droneData, activeMapTab]);

  return (
    <Card 
      className="bg-[#121A2B]/80 backdrop-blur-xl border-white/10"
      data-hook="map-card"
    >
      <CardHeader className="border-b border-white/5">
        <CardTitle className="flex items-center gap-2 text-slate-100">
          <Map className="h-5 w-5 text-[#2E9BFF]" />
          지도 & 경로
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-6">
        <Tabs value={activeMapTab} onValueChange={setActiveMapTab} data-hook="map-tabs">
          <TabsList className="grid w-full grid-cols-2 bg-slate-900/50">
            <TabsTrigger value="map" className="gap-2">
              <Map className="h-3 w-3" />
              지도
            </TabsTrigger>
            <TabsTrigger value="path" className="gap-2">
              <Route className="h-3 w-3" />
              경로
            </TabsTrigger>
          </TabsList>

          <TabsContent value="map" className="mt-4">
            <div className="relative rounded-lg overflow-hidden border border-white/5">
              <canvas
                ref={canvasRef}
                width={500}
                height={200}
                className="w-full h-auto"
              />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-sky-500 border-2 border-sky-400" />
                <span className="text-slate-400">Home</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-red-500" style={{ borderStyle: 'dashed' }} />
                <span className="text-slate-400">Geofence</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-[#21D4A7]" />
                <span className="text-slate-400">Path</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="path" className="mt-4">
            <div className="py-16 text-center text-slate-500 border border-dashed border-white/10 rounded-lg">
              <Route className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">경로 계획 모드</p>
              <p className="text-xs mt-1">Coming soon</p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
