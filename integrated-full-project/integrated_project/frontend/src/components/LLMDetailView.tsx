import { useState } from 'react';
import { StreamItem } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { CheckCircle2, Edit3, AlertTriangle, Shield, Sparkles } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

type LLMDetailViewProps = {
  streamItems: StreamItem[];
  onConfirm: (intentItem: StreamItem) => void;
};

export function LLMDetailView({ streamItems, onConfirm }: LLMDetailViewProps) {
  const [showRaw, setShowRaw] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const lastIntent = [...streamItems].reverse().find(item => item.kind === 'intent');
  const lastSafety = [...streamItems].reverse().find(item => item.kind === 'safety');
  const safetyPass = lastSafety?.kind === 'safety' && lastSafety.checks.every(c => c.pass);

  const transcripts = streamItems.filter(item => item.kind === 'user_final');
  const summaries = streamItems.filter(item => item.kind === 'summary');
  const intents = streamItems.filter(item => item.kind === 'intent');
  const safeties = streamItems.filter(item => item.kind === 'safety');
  const actions = streamItems.filter(item => item.kind === 'action_log');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-100">LLM 상세 분석</h2>
          <p className="text-sm text-slate-500 mt-1">전체 대화 흐름 및 파이프라인 상세 정보</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400">원문 보기</span>
          <Switch checked={showRaw} onCheckedChange={setShowRaw} />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left: Pipeline Sections */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Transcripts */}
          <Card className="bg-[#121A2B]/80 backdrop-blur-xl border-white/10">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="flex items-center gap-2 text-slate-100">
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30">
                  전사 ({transcripts.length})
                </Badge>
                <span className="text-base">음성 전사 결과</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <ScrollArea className="h-[200px]">
                <div className="space-y-3">
                  {transcripts.map((item) => (
                    item.kind === 'user_final' && (
                      <div 
                        key={item.id}
                        className="p-4 rounded-lg bg-gradient-to-br from-emerald-500/10 to-sky-500/10 border border-emerald-400/20"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-slate-500">
                            [{item.t0.toFixed(2)}s – {item.t1.toFixed(2)}s]
                          </span>
                        </div>
                        <p className="text-slate-100">{item.text}</p>
                      </div>
                    )
                  ))}
                  {transcripts.length === 0 && (
                    <p className="text-center text-slate-500 py-8">아직 전사된 내용이 없습니다</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Summaries */}
          <Card className="bg-[#121A2B]/80 backdrop-blur-xl border-white/10">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="flex items-center gap-2 text-slate-100">
                <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/30">
                  요약 ({summaries.length})
                </Badge>
                <span className="text-base">정규화 요약</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {summaries.map((item) => (
                  item.kind === 'summary' && (
                    <div 
                      key={item.id}
                      className="p-4 rounded-lg bg-white/[0.06] border border-purple-400/20"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          {editingId === item.id ? (
                            <input
                              type="text"
                              defaultValue={item.normalized}
                              className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-sm"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') setEditingId(null);
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                              autoFocus
                            />
                          ) : (
                            <p className="text-slate-100">{item.normalized}</p>
                          )}
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {item.keywords.map((kw, i) => (
                              <span 
                                key={i} 
                                className="text-xs px-2 py-1 rounded-full bg-purple-400/10 text-purple-300 border border-purple-400/20"
                              >
                                {kw}
                              </span>
                            ))}
                          </div>
                        </div>
                        <button 
                          onClick={() => setEditingId(editingId === item.id ? null : item.id)}
                          className="text-slate-400 hover:text-slate-200 transition-colors"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )
                ))}
                {summaries.length === 0 && (
                  <p className="text-center text-slate-500 py-8">아직 요약된 내용이 없습니다</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Intents */}
          <Card className="bg-[#121A2B]/80 backdrop-blur-xl border-white/10">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="flex items-center gap-2 text-slate-100">
                <Badge className="bg-sky-500/20 text-sky-300 border-sky-400/30">
                  의도 ({intents.length})
                </Badge>
                <span className="text-base">LLM 의도 추출</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {intents.map((item) => (
                  item.kind === 'intent' && (
                    <div 
                      key={item.id}
                      className="p-4 rounded-lg bg-white/[0.06] border border-sky-400/20"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="h-4 w-4 text-sky-400" />
                        <Badge className="bg-sky-500/20 border-sky-400/30 font-mono">
                          {item.name}
                        </Badge>
                        <span className="text-xs text-slate-400">Confidence: {(item.score * 100).toFixed(0)}%</span>
                      </div>
                      {Object.keys(item.params).length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs text-sky-300">Parameters:</p>
                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries(item.params).map(([key, value]) => (
                              <div key={key} className="flex items-center gap-2 text-sm bg-slate-900/30 px-3 py-2 rounded border border-white/5">
                                <span className="text-slate-500">{key}:</span>
                                <span className="text-slate-300 font-mono">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                ))}
                {intents.length === 0 && (
                  <p className="text-center text-slate-500 py-8">아직 추출된 의도가 없습니다</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Safety Checks */}
          <Card className="bg-[#121A2B]/80 backdrop-blur-xl border-white/10">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="flex items-center gap-2 text-slate-100">
                <Badge className={`${
                  lastSafety?.kind === 'safety' && lastSafety.checks.every(c => c.pass)
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                    : 'bg-red-500/20 text-red-300 border-red-400/30'
                }`}>
                  안전 ({safeties.length})
                </Badge>
                <span className="text-base">안전 체크 결과</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {safeties.map((item) => (
                  item.kind === 'safety' && (
                    <div 
                      key={item.id}
                      className={`p-4 rounded-lg border ${
                        item.checks.every(c => c.pass)
                          ? 'bg-emerald-500/5 border-emerald-400/20'
                          : 'bg-red-500/5 border-red-400/20'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Shield className={`h-4 w-4 ${
                          item.checks.every(c => c.pass) ? 'text-emerald-400' : 'text-red-400'
                        }`} />
                        <span className="text-sm font-semibold text-slate-200">
                          {item.checks.every(c => c.pass) ? '모든 체크 통과' : '일부 체크 실패'}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {item.checks.map((check) => (
                          <TooltipProvider key={check.id}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-2 text-sm p-2 rounded bg-slate-900/30 border border-white/5">
                                  {check.pass ? (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                  ) : (
                                    <AlertTriangle className="h-4 w-4 text-red-400" />
                                  )}
                                  <span className={check.pass ? 'text-slate-300' : 'text-red-300'}>
                                    {check.label}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              {check.note && (
                                <TooltipContent>
                                  <p className="text-xs">{check.note}</p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                        ))}
                      </div>
                    </div>
                  )
                ))}
                {safeties.length === 0 && (
                  <p className="text-center text-slate-500 py-8">아직 안전 체크가 없습니다</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Logs */}
          <Card className="bg-[#121A2B]/80 backdrop-blur-xl border-white/10">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="flex items-center gap-2 text-slate-100">
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30">
                  실행 ({actions.length})
                </Badge>
                <span className="text-base">명령 실행 로그</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-2">
                {actions.map((item) => (
                  item.kind === 'action_log' && (
                    <div 
                      key={item.id}
                      className={`p-3 rounded-lg border ${
                        item.status === 'ok' ? 'bg-emerald-500/5 border-emerald-400/20' :
                        item.status === 'warn' ? 'bg-amber-500/5 border-amber-400/20' :
                        'bg-red-500/5 border-red-400/20'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-xs text-slate-500 font-mono">
                          {new Date(item.ts).toLocaleTimeString()}
                        </span>
                        <span className={
                          item.status === 'ok' ? 'text-emerald-300' :
                          item.status === 'warn' ? 'text-amber-300' :
                          'text-red-300'
                        }>
                          {item.label}
                        </span>
                      </div>
                    </div>
                  )
                ))}
                {actions.length === 0 && (
                  <p className="text-center text-slate-500 py-8">아직 실행된 명령이 없습니다</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Action Panel */}
        <aside className="col-span-12 lg:col-span-4">
          <Card className="bg-[#121A2B]/80 backdrop-blur-xl border-white/10 sticky top-20">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="text-slate-100">실행 제어</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {lastIntent && lastSafety ? (
                <>
                  <div className="p-4 rounded-lg bg-slate-900/30 border border-white/5">
                    <p className="text-xs text-slate-500 mb-2">최근 의도</p>
                    {lastIntent.kind === 'intent' && (
                      <p className="text-lg font-semibold text-slate-100 font-mono">
                        {lastIntent.name}
                      </p>
                    )}
                  </div>

                  <div className="p-4 rounded-lg bg-slate-900/30 border border-white/5">
                    <p className="text-xs text-slate-500 mb-2">안전 상태</p>
                    <p className={`text-sm font-semibold ${
                      safetyPass ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {safetyPass ? '✓ 모든 체크 통과' : '✗ 체크 실패'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full gap-2 border-white/10 bg-slate-900/50 hover:bg-slate-800/50"
                      onClick={() => {
                        const summaryItem = [...streamItems].reverse().find(item => item.kind === 'summary');
                        if (summaryItem) setEditingId(summaryItem.id);
                      }}
                    >
                      <Edit3 className="h-4 w-4" />
                      <span>수정 후 전달</span>
                    </Button>
                    
                    <Button 
                      disabled={!safetyPass}
                      onClick={() => lastIntent && onConfirm(lastIntent)}
                      className="w-full gap-2 bg-[#21D4A7] hover:bg-[#1abc9c] text-slate-900 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Confirm 실행</span>
                    </Button>
                  </div>

                  {!safetyPass && (
                    <p className="text-xs text-red-400 text-center">
                      안전 체크를 통과하지 못했습니다
                    </p>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <p className="text-sm">명령을 기다리는 중...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
