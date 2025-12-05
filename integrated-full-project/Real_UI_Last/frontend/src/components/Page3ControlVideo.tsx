import { Camera, Video, Image, Upload, Play, Download, X, Gamepad2 } from 'lucide-react';
import { DroneData } from '../App';
import { Button } from './ui/button';
import { useState, useRef } from 'react';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';

interface Page3Props {
  droneData: DroneData;
}

interface MediaFile {
  id: string;
  type: 'photo' | 'video';
  name: string;
  url: string;
  timestamp: number;
  size: string;
}

export function Page3ControlVideo({ droneData }: Page3Props) {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newFiles: MediaFile[] = Array.from(files).map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      type: file.type.startsWith('video/') ? 'video' : 'photo',
      name: file.name,
      url: URL.createObjectURL(file),
      timestamp: Date.now(),
      size: formatFileSize(file.size),
    }));

    setMediaFiles((prev) => [...newFiles, ...prev]);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDelete = (id: string) => {
    setMediaFiles((prev) => prev.filter((file) => file.id !== id));
    if (selectedMedia?.id === id) {
      setSelectedMedia(null);
    }
  };
  return (
    <div className="grid grid-cols-12 gap-4 h-[calc(100vh-200px)]">
      {/* Left Large Panel - Media Gallery */}
      <div className="col-span-7">
        <div className="glass-card rounded-[20px] p-6 h-full border border-white/10 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-6 flex-none">
            <div>
              <h2 className="text-secondary mb-2">미디어 갤러리</h2>
              <p className="text-slate-400 text-sm">드론에서 촬영한 사진과 영상</p>
            </div>
            
            <Button
              size="lg"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2 bg-secondary hover:bg-secondary/90 text-white shadow-lg shadow-secondary/30"
            >
              <Upload className="w-4 h-4" />
              파일 업로드
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {/* Media Grid */}
          {mediaFiles.length > 0 ? (
            <ScrollArea className="flex-1">
              <div className="grid grid-cols-3 gap-3 pr-2">
                {mediaFiles.map((file) => (
                  <div
                    key={file.id}
                    className="relative group glass-card rounded-[12px] overflow-hidden bg-black/30 border border-white/10 hover:border-secondary/50 transition-all cursor-pointer"
                    onClick={() => setSelectedMedia(file)}
                  >
                    {/* Thumbnail */}
                    <div className="aspect-video relative">
                      {file.type === 'photo' ? (
                        <img
                          src={file.url}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <video
                          src={file.url}
                          className="w-full h-full object-cover"
                        />
                      )}
                      
                      {/* Overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        {file.type === 'video' && (
                          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <Play className="w-6 h-6 text-white" />
                          </div>
                        )}
                      </div>

                      {/* Type Badge */}
                      <div className="absolute top-2 left-2">
                        <Badge className={`${file.type === 'video' ? 'bg-secondary' : 'bg-primary'} border-0 text-white text-xs px-2 py-0`}>
                          {file.type === 'video' ? (
                            <><Video className="w-3 h-3 mr-1" />영상</>
                          ) : (
                            <><Camera className="w-3 h-3 mr-1" />사진</>
                          )}
                        </Badge>
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(file.id);
                        }}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500/80 hover:bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>

                    {/* Info */}
                    <div className="p-3 space-y-1">
                      <div className="text-sm text-slate-300 truncate">{file.name}</div>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{formatTime(file.timestamp)}</span>
                        <span>{file.size}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4">
                  <Image className="w-10 h-10 text-secondary/50" />
                </div>
                <p className="text-slate-400 text-lg mb-2">녹화된 미디어가 없습니다</p>
                <p className="text-slate-600 text-sm">파일을 업로드하거나 촬영을 시작하세요</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Column - Video Feed (Top) & Control Panel (Bottom) */}
      <div className="col-span-5 flex flex-col gap-4 h-full">
        {/* Video Feed - Top Panel */}
        <div className="glass-card rounded-[20px] p-5 h-1/2 border border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
              <Video className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-primary">비디오 출력</h2>
          </div>

          {/* Video Placeholder */}
          <div className="relative w-full h-[calc(100%-56px)] glass-card rounded-[16px] bg-black/50 overflow-hidden">
            {/* Video placeholder */}
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
              <div className="glass-card rounded-[8px] px-3 py-1 bg-black/60 text-xs">
                <span className="text-slate-400">LIVE</span>
                <span className="ml-2 text-green-500 animate-pulse">●</span>
              </div>
            </div>

            {/* Battery & Signal - only show if there's data */}
            {droneData.battery.pct > 0 && (
              <div className="absolute top-4 right-4 space-y-2">
                <div className="glass-card rounded-[8px] px-3 py-1 bg-black/60 text-xs">
                  <span className="text-slate-400">배터리</span>
                  <span className="ml-2 text-primary">{(droneData.battery.pct * 100).toFixed(0)}%</span>
                </div>
                <div className="glass-card rounded-[8px] px-3 py-1 bg-black/60 text-xs">
                  <span className="text-slate-400">고도</span>
                  <span className="ml-2 text-secondary">{droneData.alt.toFixed(1)}m</span>
                </div>
              </div>
            )}

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
        </div>

        {/* Control Panel - Bottom Panel */}
        <div className="glass-card rounded-[20px] p-5 h-1/2 border border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Gamepad2 className="w-4 h-4 text-amber-400" />
            </div>
            <h2 className="text-amber-400">예비 영역</h2>
          </div>

          {/* Placeholder content */}
          <div className="flex items-center justify-center h-[calc(100%-56px)]">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
                <Gamepad2 className="w-8 h-8 text-amber-600" />
              </div>
              <p className="text-slate-500 text-sm">추가 기능을 위한 예비 공간</p>
              <p className="text-slate-600 text-xs mt-1">제어 버튼, 설정 등을 배치할 수 있습니다</p>
            </div>
          </div>
        </div>

        {/* Media Preview Modal */}
        {selectedMedia && (
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-8"
            onClick={() => setSelectedMedia(null)}
          >
            <div
              className="glass-card rounded-[20px] max-w-4xl max-h-[90vh] overflow-hidden border border-white/20"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div>
                  <h3 className="text-slate-100">{selectedMedia.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {formatTime(selectedMedia.timestamp)} • {selectedMedia.size}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2 border-primary/20 bg-primary/10 hover:bg-primary/20"
                    onClick={() => {
                      const a = document.createElement('a');
                      a.href = selectedMedia.url;
                      a.download = selectedMedia.name;
                      a.click();
                    }}
                  >
                    <Download className="w-3 h-3" />
                    다운로드
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedMedia(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Media Content */}
              <div className="p-4 max-h-[calc(90vh-120px)] overflow-auto">
                {selectedMedia.type === 'photo' ? (
                  <img
                    src={selectedMedia.url}
                    alt={selectedMedia.name}
                    className="w-full h-auto rounded-lg"
                  />
                ) : (
                  <video
                    src={selectedMedia.url}
                    controls
                    className="w-full h-auto rounded-lg"
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
