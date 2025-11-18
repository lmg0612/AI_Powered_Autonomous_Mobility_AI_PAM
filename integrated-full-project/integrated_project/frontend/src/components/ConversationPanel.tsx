import { motion, AnimatePresence } from 'motion/react';
import { StreamItem } from '../App';
import { MessageSquare, Sparkles, Shield, CheckCircle2, AlertTriangle, Edit3 } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { useState } from 'react';

type ConversationPanelProps = {
  streamItems: StreamItem[];
  onConfirm: (intentItem: StreamItem) => void;
};

export function ConversationPanel({ streamItems, onConfirm }: ConversationPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  // 마지막 Intent와 Safety 찾기
  const lastIntent = [...streamItems].reverse().find(item => item.kind === 'intent');
  const lastSafety = [...streamItems].reverse().find(item => item.kind === 'safety');
  const safetyPass = lastSafety?.kind === 'safety' && lastSafety.checks.every(c => c.pass);

  return (
    <div className="rounded-3xl bg-white/[0.08] backdrop-blur-2xl border border-white/10 overflow-hidden">
      {/* 헤더 */}
      <div className="px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-sky-400" />
          <h2>대화 & LLM 파이프라인</h2>
        </div>
      </div>

      {/* 메시지 스트림 */}
      <ScrollArea className="h-[500px]">
        <div 
          className="p-6 space-y-4"
          role="log"
          aria-live="polite"
          aria-relevant="additions text"
          aria-label="Conversation stream"
        >
          <AnimatePresence mode="popLayout">
            {streamItems.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                {item.kind === 'user_partial' && (
                  <UserPartialBubble text={item.text} />
                )}
                {item.kind === 'user_final' && (
                  <UserFinalBubble text={item.text} t0={item.t0} t1={item.t1} />
                )}
                {item.kind === 'summary' && (
                  <SummaryBubble 
                    normalized={item.normalized} 
                    keywords={item.keywords}
                    isEditing={editingId === item.id}
                    onEdit={() => setEditingId(item.id)}
                    onSave={() => setEditingId(null)}
                  />
                )}
                {item.kind === 'intent' && (
                  <IntentBubble name={item.name} params={item.params} score={item.score} />
                )}
                {item.kind === 'safety' && (
                  <SafetyBubble checks={item.checks} />
                )}
                {item.kind === 'action_log' && (
                  <ActionLogBubble label={item.label} status={item.status} ts={item.ts} />
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {streamItems.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>음성 명령을 시작하세요</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* 액션 바 */}
      {lastIntent && lastSafety && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky bottom-0 mt-4 bg-black/40 backdrop-blur-xl border-t border-white/10 p-4 flex gap-3 justify-end"
        >
          <Button 
            variant="outline" 
            className="gap-2 border-white/20 bg-white/5 hover:bg-white/10"
            onClick={() => {
              const summaryItem = [...streamItems].reverse().find(item => item.kind === 'summary');
              if (summaryItem) setEditingId(summaryItem.id);
            }}
            aria-label="Edit summary before sending"
          >
            <Edit3 className="h-4 w-4" />
            <span>수정 후 전달</span>
          </Button>
          <Button 
            disabled={!safetyPass}
            onClick={() => lastIntent && onConfirm(lastIntent)}
            className="gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50"
            aria-label="Confirm and execute command"
            title={!safetyPass ? '안전 체크를 통과하지 못했습니다' : 'Ctrl+Enter로 실행'}
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>Confirm 실행</span>
          </Button>
        </motion.div>
      )}
    </div>
  );
}

// 서브 컴포넌트들

function UserPartialBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] px-4 py-3 rounded-2xl bg-slate-700/50 backdrop-blur border border-slate-600/30">
        <p className="text-slate-400 italic">{text}</p>
      </div>
    </div>
  );
}

function UserFinalBubble({ text, t0, t1 }: { text: string; t0: number; t1: number }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%]">
        <div className="px-4 py-3 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-sky-500/20 backdrop-blur border border-emerald-400/30">
          <p className="text-slate-100">{text}</p>
        </div>
        <p className="text-xs text-slate-500 mt-1 text-right">
          [{t0.toFixed(2)}s – {t1.toFixed(2)}s]
        </p>
      </div>
    </div>
  );
}

function SummaryBubble({ 
  normalized, 
  keywords,
  isEditing,
  onEdit,
  onSave 
}: { 
  normalized: string; 
  keywords: string[];
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
}) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[80%]">
        <div className="px-4 py-3 rounded-2xl bg-white/[0.06] backdrop-blur border border-purple-400/20">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-purple-400" />
                <span className="text-xs text-purple-300">정규화 요약</span>
              </div>
              {isEditing ? (
                <input
                  type="text"
                  defaultValue={normalized}
                  className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onSave();
                    if (e.key === 'Escape') onSave();
                  }}
                  autoFocus
                />
              ) : (
                <p className="text-slate-100">{normalized}</p>
              )}
              <div className="flex gap-2 mt-2 flex-wrap">
                {keywords.map((kw, i) => (
                  <Badge key={i} variant="outline" className="border-purple-400/30 bg-purple-400/10 text-purple-300 text-xs">
                    {kw}
                  </Badge>
                ))}
              </div>
            </div>
            <button 
              onClick={onEdit}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              <Edit3 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function IntentBubble({ name, params, score }: { name: string; params: Record<string, any>; score: number }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[80%]">
        <div className="px-4 py-3 rounded-2xl bg-white/[0.06] backdrop-blur border border-sky-400/20">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-sky-400" />
            <span className="text-xs text-sky-300">LLM 의도 추출</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sky-300">Intent:</span>
              <Badge className="bg-sky-500/20 border-sky-400/30">
                {name}
              </Badge>
              <span className="text-xs text-slate-400">({(score * 100).toFixed(0)}%)</span>
            </div>
            {Object.keys(params).length > 0 && (
              <div className="text-sm">
                <span className="text-sky-300">Params:</span>
                <div className="mt-1 space-y-1">
                  {Object.entries(params).map(([key, value]) => (
                    <div key={key} className="flex gap-2 text-slate-300">
                      <span className="text-slate-500">{key}:</span>
                      <span>{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SafetyBubble({ checks }: { checks: { id: string; label: string; pass: boolean; note?: string }[] }) {
  const allPass = checks.every(c => c.pass);
  const failedChecks = checks.filter(c => !c.pass);

  return (
    <div className="flex justify-start">
      <div className="max-w-[80%]">
        {!allPass && (
          <div className="mb-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-400/30 backdrop-blur">
            <div className="flex items-center gap-2 text-xs text-red-300">
              <AlertTriangle className="h-3 w-3" />
              <span>해석 차단: {failedChecks.length}개 항목 실패</span>
            </div>
          </div>
        )}
        <div className={`px-4 py-3 rounded-2xl bg-white/[0.06] backdrop-blur border ${
          allPass ? 'border-emerald-400/20' : 'border-red-400/20'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <Shield className={`h-4 w-4 ${allPass ? 'text-emerald-400' : 'text-red-400'}`} />
            <span className={`text-xs ${allPass ? 'text-emerald-300' : 'text-red-300'}`}>
              안전 체크
            </span>
          </div>
          <div className="space-y-2">
            {checks.map((check) => (
              <TooltipProvider key={check.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 text-sm">
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
                      <p>{check.note}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionLogBubble({ label, status, ts }: { label: string; status: 'ok' | 'warn' | 'error'; ts: number }) {
  const config = {
    ok: { color: 'border-emerald-400/20 bg-emerald-500/10', textColor: 'text-emerald-300', icon: CheckCircle2 },
    warn: { color: 'border-amber-400/20 bg-amber-500/10', textColor: 'text-amber-300', icon: AlertTriangle },
    error: { color: 'border-red-400/20 bg-red-500/10', textColor: 'text-red-300', icon: AlertTriangle },
  };

  const cfg = config[status];
  const Icon = cfg.icon;

  return (
    <div className="flex justify-center">
      <div className={`px-4 py-2 rounded-full backdrop-blur border ${cfg.color}`}>
        <div className="flex items-center gap-2 text-sm">
          <Icon className={`h-4 w-4 ${cfg.textColor}`} />
          <span className={cfg.textColor}>{label}</span>
          <span className="text-xs text-slate-500">
            {new Date(ts).toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  );
}
