import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Send,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

type Period = 'daily' | 'weekly' | 'monthly' | 'quarterly';

const PERIOD_LABELS: Record<Period, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
};

const PERIOD_DESC: Record<Period, string> = {
  daily: "Today's tasks only",
  weekly: 'This week (Mon – Sat)',
  monthly: 'Current month',
  quarterly: 'Current FY quarter',
};

export const UserScoreView: React.FC = () => {
  const { language } = useLanguage();
  const [period, setPeriod] = useState<Period>('daily');
  const [activeTab, setActiveTab] = useState<'done' | 'notdone'>('done');
  const [scoreData, setScoreData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const fetchScores = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    else setIsRefreshing(true);
    try {
      const res = await fetch(`/api/scores/my?period=${period}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('katl_token')}` },
      });
      const data = await res.json();
      setScoreData(data.score);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [period]);

  useEffect(() => {
    fetchScores(true);
    const interval = setInterval(() => fetchScores(false), 8000);
    return () => clearInterval(interval);
  }, [fetchScores]);

  // Late-submit a "not done" task from the Score tab
  const handleLateSubmit = async (workItemId: string) => {
    setSubmittingId(workItemId);
    try {
      const res = await fetch(`/api/work-items/${workItemId}/late-submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('katl_token')}`,
        },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        // Immediately refresh score data
        await fetchScores(false);
      }
    } catch (err) {
      console.error('Late submit failed', err);
    } finally {
      setSubmittingId(null);
    }
  };

  const doneCount = scoreData?.doneItems?.length || 0;
  const notDoneCount = scoreData?.notDoneItems?.length || 0;

  // WD and WD on time from the engine
  const wdDisplay: string = scoreData?.displayWorkDone ?? '-100%';
  const wdOnTimeDisplay: string = scoreData?.displayWorkOnTime ?? '-100%';
  const wdNumeric: number = scoreData?.numericWorkDone ?? -100;
  const wdOnTimeNumeric: number = scoreData?.numericWorkOnTime ?? -100;

  // Colour helpers
  const isWdPerfect = wdNumeric === 0;
  const isOnTimePerfect = wdOnTimeNumeric === 0;

  const wdBg = isWdPerfect ? 'bg-navy-900 border-navy-900' : 'bg-[#FFF5F8] border-[#F9BFDF]';
  const wdTextLabel = isWdPerfect ? 'text-[#9CA3AF]' : 'text-[#BF1270]';
  const wdTextValue = isWdPerfect ? 'text-white' : 'text-[#7A0B45]';
  const wdTextSub = isWdPerfect ? 'text-[#9CA3AF]' : 'text-[#BF1270]';

  const otBg = isOnTimePerfect ? 'bg-navy-900 border-navy-900' : 'bg-[#F9FAFB] border-[#E8ECF0]';
  const otTextLabel = isOnTimePerfect ? 'text-[#9CA3AF]' : 'text-[#6B7280]';
  const otTextValue = isOnTimePerfect ? 'text-white' : 'text-navy-900';
  const otTextSub = isOnTimePerfect ? 'text-[#9CA3AF]' : 'text-[#6B7280]';

  return (
    <div className="min-h-full bg-white pb-24">
      {/* Hero */}
      <div className="mx-4 mt-4 rounded-2xl hero-gradient p-5 relative">
        <p className="text-pink-brand font-extrabold text-sm mb-0.5">Your MIS Score.</p>
        <p className="text-white text-xs font-medium opacity-80">
          0% = perfect. Starts at -100%. Improves as you submit tasks.
        </p>
        {isRefreshing && (
          <div className="absolute top-3 right-3">
            <RefreshCw className="w-3.5 h-3.5 text-pink-brand animate-spin" />
          </div>
        )}
      </div>

      {/* Period tabs: Daily | Weekly | Monthly | Quarterly */}
      <div className="mx-4 mt-4">
        <div className="flex gap-1 bg-[#F4F6F9] rounded-xl p-1">
          {(['daily', 'weekly', 'monthly', 'quarterly'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                period === p
                  ? 'bg-white text-navy-900 shadow-sm'
                  : 'text-[#9CA3AF]'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-[#9CA3AF] text-center mt-1 font-medium">
          {PERIOD_DESC[period]}
        </p>
      </div>

      {/* Score section */}
      {loading ? (
        <div className="mx-4 mt-4 space-y-2">
          <div className="h-28 rounded-2xl bg-[#F4F6F9] animate-pulse" />
          <div className="h-16 rounded-2xl bg-[#F4F6F9] animate-pulse" />
        </div>
      ) : scoreData ? (
        <>
          {/* Score Cards */}
          <div className="mx-4 mt-4 grid grid-cols-2 gap-3">
            {/* Work Done (WD) */}
            <div className={`p-4 rounded-2xl border text-center ${wdBg}`}>
              <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${wdTextLabel}`}>
                Work Done
              </p>
              <p className={`text-3xl font-black ${wdTextValue}`}>{wdDisplay}</p>
              <p className={`text-[11px] mt-1 font-medium ${wdTextSub}`}>
                {scoreData.weightedDone}/{scoreData.weightedDue} wt
              </p>
              <div className={`mt-2 flex items-center justify-center gap-1 ${wdTextSub}`}>
                {wdNumeric < 0
                  ? <TrendingDown className="w-3 h-3" />
                  : <TrendingUp className="w-3 h-3" />}
                <span className="text-[10px] font-bold">
                  {doneCount} done / {doneCount + notDoneCount} total
                </span>
              </div>
            </div>

            {/* Work Done On Time */}
            <div className={`p-4 rounded-2xl border text-center ${otBg}`}>
              <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${otTextLabel}`}>
                WD On Time
              </p>
              <p className={`text-3xl font-black ${otTextValue}`}>{wdOnTimeDisplay}</p>
              <p className={`text-[11px] mt-1 font-medium ${otTextSub}`}>
                {scoreData.weightedOnTime}/{scoreData.weightedDue} wt
              </p>
              <div className={`mt-2 flex items-center justify-center gap-1 ${otTextSub}`}>
                {wdOnTimeNumeric < 0
                  ? <TrendingDown className="w-3 h-3" />
                  : <TrendingUp className="w-3 h-3" />}
                <span className="text-[10px] font-bold">on time</span>
              </div>
            </div>
          </div>

          {/* Task Breakdown */}
          <div className="mx-4 mt-4">
            <p className="text-[11px] font-black tracking-widest uppercase text-[#9CA3AF] mb-2">
              Task Breakdown
            </p>

            {/* Done / Not Done tabs */}
            <div className="flex rounded-xl overflow-hidden border border-[#E8ECF0] mb-3">
              <button
                onClick={() => setActiveTab('done')}
                className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'done' ? 'bg-navy-900 text-white' : 'text-[#6B7280]'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Done ({doneCount})
              </button>
              <button
                onClick={() => setActiveTab('notdone')}
                className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'notdone' ? 'bg-[#FFF5F8] text-[#BF1270]' : 'text-[#6B7280]'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                Not Done ({notDoneCount})
              </button>
            </div>

            {/* Done items */}
            {activeTab === 'done' && (
              <div className="space-y-2">
                {scoreData.doneItems && scoreData.doneItems.length > 0 ? (
                  scoreData.doneItems.map((d: any) => {
                    const title =
                      (language === 'hi' || language === 'hi_ro') && d.titleHi
                        ? d.titleHi
                        : d.titleEn;
                    const completedTime = new Date(d.completedAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    const completedDate = new Date(d.completedAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                    });
                    const taskType = d.taskType || (d.sourceModule === 'fms' ? 'FMS' : d.sourceModule === 'delegation' ? 'DELEGATION' : 'REPETITIVE');

                    return (
                      <div
                        key={d.id}
                        className="bg-white border border-[#D1FAE5] rounded-xl p-3 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-xs font-semibold text-[#374151] leading-snug">
                                {title}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              {taskType && (
                                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                  {taskType}
                                </span>
                              )}
                              {d.isImportant && (
                                <span className="text-[9px] text-[#BF1270] font-bold bg-[#FFF5F8] px-1.5 py-0.5 rounded border border-[#F9BFDF]">
                                  Important (3×)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[11px] font-extrabold text-emerald-700">
                            {completedDate} {completedTime}
                          </p>
                          <p
                            className={`text-[10px] font-bold ${
                              d.isOnTime ? 'text-emerald-600' : 'text-amber-600'
                            }`}
                          >
                            {d.isOnTime ? '✓ On time' : '⚠ Late'}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-xl border border-dashed border-[#D1D5DB] py-8 text-center">
                    <p className="text-xs text-[#9CA3AF] font-medium">No tasks completed yet in this period.</p>
                  </div>
                )}
              </div>
            )}

            {/* Not Done items — with late-submit button */}
            {activeTab === 'notdone' && (
              <div className="space-y-2">
                {notDoneCount > 0 && (
                  <div className="mx-0 mb-2 p-2.5 rounded-lg bg-[#FFF5F8] border border-[#F9BFDF]">
                    <p className="text-[10px] text-[#9F0E5A] font-bold leading-snug">
                      💡 Tap <strong>Submit</strong> to mark a past task as done. It will count towards Work Done (Done Late).
                    </p>
                  </div>
                )}
                {scoreData.notDoneItems && scoreData.notDoneItems.length > 0 ? (
                  scoreData.notDoneItems.map((nd: any) => {
                    const title =
                      (language === 'hi' || language === 'hi_ro') && nd.titleHi
                        ? nd.titleHi
                        : nd.titleEn;
                    const plannedDate = new Date(nd.plannedAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                    });
                    const isSubmitting = submittingId === nd.id;
                    const isFlagged = nd.status === 'FLAGGED_FALSE' || nd.isFlaggedFalse;
                    const taskType = nd.taskType || (nd.sourceModule === 'fms' ? 'FMS' : nd.sourceModule === 'delegation' ? 'DELEGATION' : 'REPETITIVE');

                    return (
                      <div
                        key={nd.id}
                        className={`rounded-xl p-3 border transition-all ${
                          isFlagged
                            ? 'bg-[#FFF5F8] border-[#F9BFDF]'
                            : 'bg-white border-[#E8ECF0]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 flex-1 min-w-0">
                            <Clock className={`w-4 h-4 mt-0.5 shrink-0 ${isFlagged ? 'text-[#BF1270]' : 'text-[#9CA3AF]'}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-[#374151] leading-snug">
                                {title}
                              </p>
                              
                              {/* Meta Tags */}
                              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                <span className="text-[10px] text-[#9CA3AF] font-medium">
                                  Due: {plannedDate}
                                </span>
                                {taskType && (
                                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                    {taskType}
                                  </span>
                                )}
                                {nd.isImportant && (
                                  <span className="text-[9px] text-[#BF1270] font-bold bg-[#FFF5F8] px-1.5 py-0.5 rounded border border-[#F9BFDF] flex items-center gap-0.5">
                                    <AlertTriangle className="w-2.5 h-2.5" />
                                    Important (3×)
                                  </span>
                                )}
                                {isFlagged && (
                                  <span className="text-[9px] text-amber-800 font-extrabold bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200">
                                    Audit Flagged
                                  </span>
                                )}
                              </div>

                              {/* Flagged false audit message */}
                              {isFlagged && (
                                <p className="text-[10px] text-[#BF1270] font-bold mt-1.5 italic">
                                  Marked done but not actually done — checked by {nd.checkedByName || 'Manager'}
                                  {nd.flaggedReason ? ` ("${nd.flaggedReason}")` : ''}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Submit button — calls late-submit endpoint */}
                          <button
                            onClick={() => handleLateSubmit(nd.id)}
                            disabled={isSubmitting || isFlagged}
                            className={`shrink-0 px-3 py-2 rounded-lg text-[11px] font-extrabold flex items-center gap-1.5 transition-all active:scale-[0.96] ${
                              isFlagged
                                ? 'bg-[#F4F6F9] text-[#9CA3AF] cursor-not-allowed border border-slate-200'
                                : isSubmitting
                                ? 'bg-[#F4F6F9] text-[#9CA3AF] cursor-wait'
                                : 'bg-navy-900 text-white hover:bg-navy-800 shadow-sm'
                            }`}
                          >
                            {isSubmitting ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <Send className="w-3 h-3 text-pink-brand" />
                            )}
                            {isSubmitting ? '' : 'Submit'}
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-xl border border-dashed border-[#D1FAE5] py-8 text-center">
                    <p className="text-xs text-emerald-700 font-bold">All tasks completed for this period!</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
};
