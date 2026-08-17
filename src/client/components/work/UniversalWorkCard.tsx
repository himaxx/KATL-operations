import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { AlertTriangle, CheckCircle2, Lock, Clock, ChevronRight, Pin, Shield, Layers } from 'lucide-react';

export interface WorkItem {
  id: string;
  source_module: 'checklist' | 'fms' | 'delegation';
  source_ref_id: string;
  fms_code?: string | null;
  step_no?: number | null;
  title_en: string;
  title_hi: string;
  is_important: number | boolean;
  available_from: string;
  planned_at: string;
  completed_at?: string | null;
  status: 'OPEN' | 'DONE' | 'MISSED' | 'FLAGGED_FALSE';
  is_locked?: boolean;
  lock_reason?: string | null;
  task_type?: 'REPETITIVE' | 'FMS' | 'DELEGATION' | 'COMPLIANCE';
}

interface UniversalWorkCardProps {
  item: WorkItem;
  onAction: (item: WorkItem) => void;
}

// Live Countdown Timer Component
const LiveCountdown: React.FC<{ plannedAt: string }> = ({ plannedAt }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [urgencyClass, setUrgencyClass] = useState('text-slate-500');

  useEffect(() => {
    const updateTime = () => {
      const diffMs = new Date(plannedAt).getTime() - Date.now();
      const overdue = diffMs < 0;
      const absDiff = Math.abs(diffMs);

      const hrs = Math.floor(absDiff / (1000 * 60 * 60));
      const mins = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((absDiff % (1000 * 60)) / 1000);

      let text = '';
      if (overdue) {
        text = hrs > 0 ? `Overdue by ${hrs}h ${mins}m` : `Overdue by ${mins}m ${secs}s`;
        setUrgencyClass('text-lightpink-700 font-extrabold animate-pulse');
      } else {
        text = hrs > 0 ? `${hrs}h ${mins}m left` : `${mins}m ${secs}s left`;

        if (hrs === 0 && mins < 45) {
          setUrgencyClass('text-pink-brand font-extrabold animate-pulse');
        } else if (hrs < 2) {
          setUrgencyClass('text-amber-600 font-bold');
        } else {
          setUrgencyClass('text-slate-500 font-medium');
        }
      }
      setTimeLeft(text);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [plannedAt]);

  return (
    <span className={`flex items-center gap-1 text-[11px] ${urgencyClass}`}>
      <Clock className="w-3.5 h-3.5" />
      {timeLeft}
    </span>
  );
};

// Task type visual config
const TASK_TYPE_STYLES: Record<string, { borderColor: string; bgColor: string; badgeBg: string; badgeText: string; label: string }> = {
  COMPLIANCE: {
    borderColor: 'border-l-lightpink-500 border-lightpink-300',
    bgColor: 'bg-lightpink-50',
    badgeBg: 'bg-lightpink-100 border-lightpink-250',
    badgeText: 'text-lightpink-800',
    label: 'Compliance',
  },
  DELEGATION: {
    borderColor: 'border-l-hotpink border-hotpink-200',
    bgColor: 'bg-hotpink-50',
    badgeBg: 'bg-hotpink-100 border-hotpink-200',
    badgeText: 'text-hotpink-700',
    label: 'Delegated',
  },
  FMS: {
    borderColor: 'border-l-amber-500 border-amber-200',
    bgColor: 'bg-amber-50',
    badgeBg: 'bg-amber-100 border-amber-200',
    badgeText: 'text-amber-700',
    label: 'Flow Task',
  },
  REPETITIVE: {
    borderColor: 'border-l-navy-400 border-slate-200',
    bgColor: 'bg-white',
    badgeBg: 'bg-[#F4F6F9] border-[#E8ECF0]',
    badgeText: 'text-[#6B7280]',
    label: 'Daily Task',
  },
};

export const UniversalWorkCard: React.FC<UniversalWorkCardProps> = ({ item, onAction }) => {
  const { language } = useLanguage();

  const isImportant = Boolean(item.is_important);
  const isDone = item.status === 'DONE';
  const isLocked = Boolean(item.is_locked);
  const isLate = !isDone && !isLocked && new Date() > new Date(item.planned_at);
  const taskType = item.task_type || (item.source_module === 'fms' ? 'FMS' : item.source_module === 'delegation' ? 'DELEGATION' : 'REPETITIVE');

  const style = TASK_TYPE_STYLES[taskType] || TASK_TYPE_STYLES.REPETITIVE;

  const title =
    (language === 'hi' || language === 'hi_ro') && item.title_hi ? item.title_hi : item.title_en;

  const completedTime = item.completed_at
    ? new Date(item.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  const isComplianceOrDelegation = taskType === 'COMPLIANCE' || taskType === 'DELEGATION';

  return (
    <div
      className={`rounded-2xl border border-l-[3px] transition-all duration-150 ${style.borderColor} ${
        isDone
          ? 'bg-white border-[#D1FAE5]'
          : isLocked
          ? 'bg-[#F9FAFB] border-[#E8ECF0] opacity-80'
          : isLate
          ? `${style.bgColor} border-[#F9BFDF]`
          : `${style.bgColor} hover:border-[#D1D5DB]`
      }`}
    >
      <div className="p-4 flex items-center justify-between gap-3">
        {/* Left Column: Task Info */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Top badges row */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                isDone
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : `${style.badgeBg} ${style.badgeText}`
              }`}
            >
              {taskType === 'COMPLIANCE' && <Shield className="w-2.5 h-2.5 inline mr-0.5" />}
              {taskType === 'DELEGATION' && <Pin className="w-2.5 h-2.5 inline mr-0.5" />}
              {taskType === 'FMS' && <Layers className="w-2.5 h-2.5 inline mr-0.5" />}
              {style.label}
              {taskType === 'FMS' && item.fms_code ? ` · ${item.fms_code}` : ''}
            </span>
            {isImportant && (
              <span className="text-[9px] font-extrabold text-[#9F0E5A] bg-[#FFF5F8] border border-[#F9BFDF] px-1.5 py-0.5 rounded-full flex items-center gap-1">
                <AlertTriangle className="w-2.5 h-2.5" />
                Important
              </span>
            )}
            {isComplianceOrDelegation && !isDone && !isLocked && (
              <span className="text-[9px] font-extrabold text-hotpink bg-hotpink-50 border border-hotpink-100 px-1.5 py-0.5 rounded-full">
                Pinned
              </span>
            )}
          </div>

          {/* Compliance sticky notice */}
          {taskType === 'COMPLIANCE' && !isDone && !isLocked && (
            <div className="px-2 py-1 rounded-lg bg-lightpink-100 border border-lightpink-200 max-w-max">
              <p className="text-[9px] font-black text-lightpink-900 flex items-center gap-1">
                <Shield className="w-2.5 h-2.5 shrink-0" /> Sticky compliance task
              </p>
            </div>
          )}

          {/* Task Title */}
          <p
            className={`text-sm font-bold leading-snug ${
              isDone ? 'text-slate-400 line-through' : 'text-navy-900'
            }`}
          >
            {title}
          </p>

          {/* Live countdown timer / Status info */}
          <div className="flex items-center gap-1 text-[11px] font-bold">
            {isDone ? (
              <span className="flex items-center gap-1 text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Done {completedTime && `at ${completedTime}`}
              </span>
            ) : isLocked ? (
              <span className="flex items-center gap-1 text-[#9CA3AF]">
                <Lock className="w-3 h-3" />
                Locked
              </span>
            ) : (
              <LiveCountdown plannedAt={item.planned_at} />
            )}
          </div>
        </div>

        {/* Right Column: Small Compact Submit Button */}
        {!isDone && !isLocked && (
          <button
            onClick={() => onAction(item)}
            className={`px-3.5 py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.96] shrink-0 shadow-sm ${
              taskType === 'FMS'
                ? 'bg-navy-900 text-white hover:bg-navy-800'
                : taskType === 'COMPLIANCE'
                ? 'bg-lightpink-700 text-white hover:bg-lightpink-800'
                : taskType === 'DELEGATION'
                ? 'bg-hotpink text-white hover:bg-hotpink-hover'
                : 'bg-pink-brand text-white hover:bg-[#D81B60]'
            }`}
          >
            {item.source_module === 'fms' ? (
              <>
                <span>Enter</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Submit</span>
              </>
            )}
          </button>
        )}

        {isDone && (
          <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        )}

        {isLocked && (
          <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-400">
            <Lock className="w-4 h-4" />
          </div>
        )}
      </div>
    </div>
  );
};
