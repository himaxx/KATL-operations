import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { CheckCircle2, Clock, AlertTriangle, TrendingUp, RefreshCw } from 'lucide-react';

export const UserScoreView: React.FC = () => {
  const { language } = useLanguage();
  const [period, setPeriod] = useState<'today' | 'this_week' | 'quarter' | 'half_year' | 'year'>('today');
  const [activeTab, setActiveTab] = useState<'done' | 'pending'>('done');
  const [scoreData, setScoreData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchScores = async (showLoader = true) => {
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
  };

  useEffect(() => {
    fetchScores(true);
    const interval = setInterval(() => fetchScores(false), 8000);
    return () => clearInterval(interval);
  }, [period]);

  const doneCount = scoreData?.doneItems?.length || 0;
  const notDoneCount = scoreData?.notDoneItems?.length || 0;
  const isDonePerfect = scoreData?.displayWorkDone === '0%';

  const periodLabels = { today: 'Today', this_week: 'This Week', quarter: 'Quarter', half_year: '6 Months', year: 'Year' };

  return (
    <div className="min-h-full bg-white pb-24">
      {/* Hero section */}
      <div className="mx-4 mt-4 rounded-2xl hero-gradient p-5 relative">
        <p className="text-pink-brand font-extrabold text-sm mb-0.5">Your MIS Score.</p>
        <p className="text-white text-xs font-medium opacity-80">0% = perfect. Deductions for missed or late tasks.</p>
        {isRefreshing && (
          <div className="absolute top-3 right-3">
            <RefreshCw className="w-3.5 h-3.5 text-pink-brand animate-spin" />
          </div>
        )}
      </div>

      {/* Period tabs */}
      <div className="mx-4 mt-4">
        <div className="flex gap-1 bg-[#F4F6F9] rounded-xl p-1">
          {(['today', 'this_week', 'quarter', 'half_year', 'year'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                period === p
                  ? 'bg-white text-navy-900 shadow-sm'
                  : 'text-[#9CA3AF]'
              }`}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Score Metrics */}
      {loading ? (
        <div className="mx-4 mt-4 space-y-2">
          <div className="h-28 rounded-2xl bg-[#F4F6F9] animate-pulse" />
          <div className="h-16 rounded-2xl bg-[#F4F6F9] animate-pulse" />
        </div>
      ) : scoreData ? (
        <>
          {/* Score cards */}
          <div className="mx-4 mt-4 grid grid-cols-2 gap-3">
            {/* Work Done */}
            <div className={`p-4 rounded-2xl border text-center ${isDonePerfect ? 'bg-navy-900 border-navy-900' : 'bg-[#FFF5F8] border-[#F9BFDF]'}`}>
              <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isDonePerfect ? 'text-[#9CA3AF]' : 'text-[#BF1270]'}`}>Work Done</p>
              <p className={`text-3xl font-black ${isDonePerfect ? 'text-white' : 'text-[#7A0B45]'}`}>{scoreData.displayWorkDone}</p>
              <p className={`text-[11px] mt-1 font-medium ${isDonePerfect ? 'text-[#9CA3AF]' : 'text-[#BF1270]'}`}>{doneCount} tasks</p>
            </div>
            {/* On Time */}
            <div className={`p-4 rounded-2xl border text-center ${scoreData.displayWorkOnTime === '0%' ? 'bg-navy-900 border-navy-900' : 'bg-[#F9FAFB] border-[#E8ECF0]'}`}>
              <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${scoreData.displayWorkOnTime === '0%' ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>On Time</p>
              <p className={`text-3xl font-black ${scoreData.displayWorkOnTime === '0%' ? 'text-white' : 'text-navy-900'}`}>{scoreData.displayWorkOnTime}</p>
              <p className={`text-[11px] mt-1 font-medium ${scoreData.displayWorkOnTime === '0%' ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>{scoreData.weightedOnTime}/{scoreData.weightedDue} pts</p>
            </div>
          </div>

          {/* Done / Pending toggle */}
          <div className="mx-4 mt-4">
            <p className="text-[11px] font-black tracking-widest uppercase text-[#9CA3AF] mb-2">Task Breakdown</p>
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
                onClick={() => setActiveTab('pending')}
                className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'pending' ? 'bg-[#FFF5F8] text-[#BF1270]' : 'text-[#6B7280]'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                Pending ({notDoneCount})
              </button>
            </div>

            {/* Done tasks */}
            {activeTab === 'done' && (
              <div className="space-y-2">
                {scoreData.doneItems && scoreData.doneItems.length > 0 ? (
                  scoreData.doneItems.map((d: any) => {
                    const title = (language === 'hi' || language === 'hi_ro') && d.titleHi ? d.titleHi : d.titleEn;
                    return (
                      <div key={d.id} className="bg-white border border-[#D1FAE5] rounded-xl p-3 flex items-center justify-between gap-3">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-[#374151] leading-snug truncate">{title}</p>
                            {d.isImportant && (
                              <span className="text-[10px] text-[#BF1270] font-bold">Important (3× weight)</span>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[11px] font-extrabold text-emerald-700">
                            {new Date(d.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <p className={`text-[10px] font-bold ${d.isOnTime ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {d.isOnTime ? 'On time' : 'Late'}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-xl border border-dashed border-[#D1D5DB] py-8 text-center">
                    <p className="text-xs text-[#9CA3AF] font-medium">No tasks completed yet.</p>
                  </div>
                )}
              </div>
            )}

            {/* Pending tasks */}
            {activeTab === 'pending' && (
              <div className="space-y-2">
                {scoreData.notDoneItems && scoreData.notDoneItems.length > 0 ? (
                  scoreData.notDoneItems.map((nd: any) => {
                    const title = (language === 'hi' || language === 'hi_ro') && nd.titleHi ? nd.titleHi : nd.titleEn;
                    return (
                      <div key={nd.id} className="bg-white border border-[#E8ECF0] rounded-xl p-3 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[#9CA3AF] shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[#374151] leading-snug truncate">{title}</p>
                          {nd.isImportant && (
                            <span className="text-[10px] text-[#BF1270] font-bold flex items-center gap-1 mt-0.5">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              Important (3× weight)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-xl border border-dashed border-[#D1FAE5] py-8 text-center">
                    <p className="text-xs text-emerald-700 font-bold">All tasks completed!</p>
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
