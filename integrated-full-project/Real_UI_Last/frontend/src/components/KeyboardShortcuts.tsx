import { Keyboard } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import { Button } from './ui/button';

const shortcuts = [
  { key: 'Space', description: 'Start/Stop recording' },
  { key: 'Ctrl + S', description: 'Export transcript' },
  { key: 'Ctrl + Enter', description: 'Confirm execution' },
  { key: 'Esc', description: 'Cancel editing' },
  { key: '?', description: 'Show this help' },
];

export function KeyboardShortcuts() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className="glass-card glass-hover gap-2"
          aria-label="Keyboard shortcuts"
        >
          <Keyboard className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="glass-card border-white/10 backdrop-blur-xl w-80"
        align="end"
      >
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-200">Keyboard Shortcuts</h3>
          <div className="space-y-2">
            {shortcuts.map((shortcut) => (
              <div 
                key={shortcut.key}
                className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
              >
                <span className="text-sm text-slate-400">{shortcut.description}</span>
                <kbd className="px-2 py-1 text-xs bg-white/10 rounded border border-white/20 font-mono">
                  {shortcut.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
