import { ArrowRight, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { StreamItem } from '../App';
import { ScrollArea } from './ui/scroll-area';

type PipelineCompactProps = {
  streamItems: StreamItem[];
  onOpenDetail: () => void;
};

export function PipelineCompact({ streamItems, onOpenDetail }: PipelineCompactProps) {
  // Get last 5 items
  const recentItems = streamItems.slice(-5);

  return (
    <Card 
      className="glass-card shadow-lg shadow-secondary/5 h-full flex flex-col"
      data-hook="pipeline-compact"
    >
      <CardHeader className="border-b border-primary/10 flex-none">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-slate-100">
            <ArrowRight className="h-5 w-5 text-[#2E9BFF]" />
            요약 파이프라인
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onOpenDetail}
            className="gap-2 text-[#21D4A7] hover:text-[#1abc9c] hover:bg-white/5"
            data-hook="open-llm-tab"
          >
            <span>자세히</span>
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-4 flex-1 min-h-0">
        {recentItems.length > 0 ? (
          <ScrollArea className="h-full">
            <div className="space-y-2.5" data-hook="pipeline-items">
              {recentItems.map((item) => (
                <div 
                  key={item.id}
                  className="p-2.5 rounded-lg bg-primary/5 border border-primary/10 hover:bg-primary/10 transition-colors"
                >
                  {item.kind === 'user_final' && (
                    <div data-hook="transcript">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-xs">
                          전사
                        </Badge>
                        <span className="text-xs text-slate-500">
                          [{item.t0.toFixed(1)}s – {item.t1.toFixed(1)}s]
                        </span>
                      </div>
                      <p className="text-slate-200">{item.text}</p>
                    </div>
                  )}

                  {item.kind === 'summary' && (
                    <div data-hook="summary">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/30 text-xs">
                          요약
                        </Badge>
                      </div>
                      <p className="text-slate-200">{item.normalized}</p>
                      <div className="flex gap-1.5 mt-1.5 flex-wrap">
                        {item.keywords.map((kw, i) => (
                          <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-purple-400/10 text-purple-300 border border-purple-400/20">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {item.kind === 'intent' && (
                    <div data-hook="intent">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="bg-sky-500/20 text-sky-300 border-sky-400/30 text-xs">
                          의도
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-200 font-mono">{item.name}</span>
                        <span className="text-xs text-slate-500">({(item.score * 100).toFixed(0)}%)</span>
                      </div>
                      {Object.keys(item.params).length > 0 && (
                        <div className="mt-1 text-xs text-slate-400">
                          {Object.entries(item.params).map(([key, value]) => (
                            <span key={key} className="mr-3">
                              {key}: {String(value)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {item.kind === 'safety' && (
                    <div data-hook="safety">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={`${
                          item.checks.every(c => c.pass) 
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' 
                            : 'bg-red-500/20 text-red-300 border-red-400/30'
                        } text-xs`}>
                          안전
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        {item.checks.slice(0, 4).map((check) => (
                          <div key={check.id} className="flex items-center gap-2 text-xs">
                            <span className={check.pass ? 'text-emerald-400' : 'text-red-400'}>
                              {check.pass ? '✓' : '✗'}
                            </span>
                            <span className="text-slate-400">{check.label}</span>
                          </div>
                        ))}
                        {item.checks.length > 4 && (
                          <span className="text-xs text-slate-500 ml-4">+{item.checks.length - 4} more</span>
                        )}
                      </div>
                    </div>
                  )}

                  {item.kind === 'action_log' && (
                    <div data-hook="command">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={`${
                          item.status === 'ok' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' :
                          item.status === 'warn' ? 'bg-amber-500/20 text-amber-300 border-amber-400/30' :
                          'bg-red-500/20 text-red-300 border-red-400/30'
                        } text-xs`}>
                          명령
                        </Badge>
                        <span className="text-xs text-slate-500">
                          {new Date(item.ts).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-slate-200">{item.label}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-12 text-slate-500">
            <ArrowRight className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>음성 명령을 시작하세요</p>
            <p className="mt-1">전사 → 요약 → 의도 → 안전 → 실행</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
