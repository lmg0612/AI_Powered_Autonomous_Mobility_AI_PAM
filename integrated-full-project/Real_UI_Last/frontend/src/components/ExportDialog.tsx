import { useState } from 'react';
import { Download, FileText, FileJson } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Button } from './ui/button';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { StreamItem } from '../App';

type ExportDialogProps = {
  streamItems: StreamItem[];
};

export function ExportDialog({ streamItems }: ExportDialogProps) {
  const [format, setFormat] = useState<'srt' | 'vtt' | 'json'>('json');
  const [range, setRange] = useState<'all' | 'selected'>('all');
  const [open, setOpen] = useState(false);

  const exportData = () => {
    let content = '';
    let filename = '';

    if (format === 'json') {
      content = JSON.stringify(streamItems, null, 2);
      filename = `drone-transcript-${Date.now()}.json`;
    } else if (format === 'srt' || format === 'vtt') {
      // Generate subtitle format
      const subtitles = streamItems
        .filter(item => item.kind === 'user_final')
        .map((item, index) => {
          if (item.kind === 'user_final') {
            const start = formatTime(item.t0 || 0, format);
            const end = formatTime(item.t1 || 0, format);
            
            if (format === 'srt') {
              return `${index + 1}\n${start} --> ${end}\n${item.text}\n`;
            } else {
              return `${start} --> ${end}\n${item.text}\n`;
            }
          }
          return '';
        })
        .join('\n');

      if (format === 'vtt') {
        content = `WEBVTT\n\n${subtitles}`;
      } else {
        content = subtitles;
      }
      
      filename = `drone-transcript-${Date.now()}.${format}`;
    }

    // Download file
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    
    setOpen(false);
  };

  const formatTime = (seconds: number, format: 'srt' | 'vtt'): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    if (format === 'srt') {
      return `${pad(hours)}:${pad(minutes)}:${pad(secs)},${pad(ms, 3)}`;
    } else {
      return `${pad(hours)}:${pad(minutes)}:${pad(secs)}.${pad(ms, 3)}`;
    }
  };

  const pad = (num: number, size: number = 2): string => {
    return num.toString().padStart(size, '0');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className="glass-card glass-hover gap-2"
        >
          <Download className="h-4 w-4" />
          <span>Export</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-card border-white/10 backdrop-blur-xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Transcript</DialogTitle>
          <DialogDescription className="text-slate-400">
            Choose format and range for export
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label>Format</Label>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as any)}>
              <div className="flex items-center gap-3 p-3 rounded-xl glass-card glass-hover cursor-pointer">
                <RadioGroupItem value="json" id="json" />
                <Label htmlFor="json" className="flex items-center gap-2 cursor-pointer flex-1">
                  <FileJson className="h-4 w-4 text-emerald-400" />
                  <div>
                    <p className="text-sm">JSON</p>
                    <p className="text-xs text-slate-500">Complete data export</p>
                  </div>
                </Label>
              </div>
              
              <div className="flex items-center gap-3 p-3 rounded-xl glass-card glass-hover cursor-pointer">
                <RadioGroupItem value="srt" id="srt" />
                <Label htmlFor="srt" className="flex items-center gap-2 cursor-pointer flex-1">
                  <FileText className="h-4 w-4 text-sky-400" />
                  <div>
                    <p className="text-sm">SRT</p>
                    <p className="text-xs text-slate-500">SubRip subtitle format</p>
                  </div>
                </Label>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl glass-card glass-hover cursor-pointer">
                <RadioGroupItem value="vtt" id="vtt" />
                <Label htmlFor="vtt" className="flex items-center gap-2 cursor-pointer flex-1">
                  <FileText className="h-4 w-4 text-purple-400" />
                  <div>
                    <p className="text-sm">VTT</p>
                    <p className="text-xs text-slate-500">WebVTT subtitle format</p>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Range Selection */}
          <div className="space-y-3">
            <Label>Range</Label>
            <RadioGroup value={range} onValueChange={(v) => setRange(v as any)}>
              <div className="flex items-center gap-3 p-3 rounded-xl glass-card glass-hover cursor-pointer">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="cursor-pointer flex-1">
                  <p className="text-sm">All items ({streamItems.length})</p>
                </Label>
              </div>
              
              <div className="flex items-center gap-3 p-3 rounded-xl glass-card glass-hover cursor-pointer opacity-50">
                <RadioGroupItem value="selected" id="selected" disabled />
                <Label htmlFor="selected" className="cursor-pointer flex-1">
                  <p className="text-sm">Selected items (coming soon)</p>
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => setOpen(false)} className="flex-1">
            Cancel
          </Button>
          <Button onClick={exportData} className="flex-1 bg-emerald-500 hover:bg-emerald-600">
            Export
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
