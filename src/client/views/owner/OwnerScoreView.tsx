import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Download, CheckCircle2, ChevronDown, ChevronUp, RefreshCw, Clock, AlertTriangle } from 'lucide-react';

type Period = 'daily' | 'weekly' | 'monthly' | 'quarterly';

const PERIOD_LABELS: Record<Period, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
};

const PERIOD_DESC: Record<Period, string> = {
  daily: "Today's live performance",
  weekly: 'This week (Mon – Sat)',
  monthly: 'Current month',
  quarterly: 'Current FY quarter',
};

export const OwnerScoreView: React.FC = () => {
  const { t } = useLanguage();
  const [period, setPeriod] = useState<Period>('daily');
  const [teamScores, setTeamScores] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchTeamScores = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    else setIsRefreshing(true);

    try {
      const res = await fetch(`/api/scores/team?period=${period}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('katl_token')}` },
      });
      const data = await res.json();
      setTeamScores(data.team_scores || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTeamScores(true);

    // Live real-time polling every 6 seconds
    const interval = setInterval(() => {
      fetchTeamScores(false);
    }, 6000);

    return () => clearInterval(interval);
  }, [period]);

  const handleExportCSV = () => {
    if (teamScores.length === 0) return;
    const headers = [
      'Staff Name',
      'Mobile',
      'Role',
      'Period',
      'Work Done (%)',
      'Work On Time (%)',
      'Tasks Total',
      'Tasks Done',
      'Tasks Pending',
      'Weighted Due',
      'Weighted Done',
      'Weighted On-Time',
    ];
    const rows = teamScores.map((s) => [
      `"${s.name}"`,
      `"${s.mobile || ''}"`,
      `"${s.role}"`,
      `"${PERIOD_LABELS[period]}"`,
      `"${s.displayWorkDone}"`,
      `"${s.displayWorkOnTime}"`,
      s.totalTasks ?? 0,
      s.doneTasksCount ?? 0,
      s.pendingTasksCount ?? 0,
      s.weightedDue ?? 0,
      s.weightedDone ?? 0,
      s.weightedOnTime ?? 0,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `KATL_MIS_Scores_${period}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredScores = teamScores.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) || (s.mobile && s.mobile.includes(search))
  );

  const totalCompanyDone = teamScores.reduce((acc, s) => acc + (s.doneTasksCount || 0), 0);
  const totalCompanyTasks = teamScores.reduce((acc, s) => acc + (s.totalTasks || 0), 0);
  const totalWeightedDue = teamScores.reduce((acc, s) => acc + (s.weightedDue || 0), 0);
  const totalWeightedDone = teamScores.reduce((acc, s) => acc + (s.weightedDone || 0), 0);
  const totalWeightedOnTime = teamScores.reduce((acc, s) => acc + (s.weightedOnTime || 0), 0);

  const companyPct = totalCompanyTasks > 0 ? Math.round((totalCompanyDone / totalCompanyTasks) * 100) : 100;
  const companyWdScore = totalWeightedDue > 0 ? `-${Math.round(100 - (totalWeightedDone / totalWeightedDue) * 100)}%` : '0%';
  const companyOtScore = totalWeightedDue > 0 ? `-${Math.round(100 - (totalWeightedOnTime / totalWeightedDue) * 100)}%` : '0%';

  return (
    <div className="min-h-full bg-white pb-24">
      {/* Hero */}
      <div className="mx-4 mt-4 rounded-2xl hero-gradient p-5 relative">
        <p className="text-pink-brand font-extrabold text-sm mb-0.5">Team MIS Scores.</p>
        <p className="text-white text-xs font-medium opacity-80">Live Company Performance — 0% is perfect score</p>
        {isRefreshing && (
          <div className="absolute top-3 right-3">
            <RefreshCw className="w-3.5 h-3.5 text-pink-brand animate-spin" />
          </div>
        )}
      </div>

      <div className="mx-4 mt-4">
        {/* Period tabs: Daily | Weekly | Monthly | Quarterly + Export */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex gap-1 bg-[#F4F6F9] rounded-xl p-1 flex-1">
            {(['daily', 'weekly', 'monthly', 'quarterly'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                  period === p ? 'bg-white text-navy-900 shadow-sm' : 'text-[#9CA3AF]'
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportCSV}
            className="min-h-[34px] px-3.5 rounded-xl bg-navy-900 text-white text-xs font-bold flex items-center gap-1.5 active:scale-[0.98] transition hover:bg-navy-800 shadow-sm shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-pink-brand" />
            CSV Export
          </button>
        </div>

        <p className="text-[10px] text-[#9CA3AF] text-center mb-3 font-medium">
          {PERIOD_DESC[period]}
        </p>

        {/* Overall Company Summary Widget */}
        <div className="p-4 rounded-2xl bg-navy-900 text-white mb-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF] mb-0.5">Company-wide Completion</p>
              <p className="text-sm font-extrabold text-white">{totalCompanyDone} / {totalCompanyTasks} tasks finished</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-pink-brand">{companyPct}%</p>
            </div>
          </div>

          <div className="w-full h-1.5 bg-[#2D3561] rounded-full overflow-hidden mb-3">
            <div className="h-full bg-pink-brand rounded-full transition-all duration-500" style={{ width: `${companyPct}%` }} />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#2D3561]">
            <div className="text-center">
              <span className="text-[9px] uppercase font-bold text-[#9CA3AF] block">Company Work Done</span>
              <span className="text-sm font-black text-white">{companyWdScore === '-0%' ? '0%' : companyWdScore}</span>
            </div>
            <div className="text-center">
              <span className="text-[9px] uppercase font-bold text-[#9CA3AF] block">Company On Time</span>
              <span className="text-sm font-black text-white">{companyOtScore === '-0%' ? '0%' : companyOtScore}</span>
            </div>
          </div>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search staff by name or mobile..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full min-h-[44px] px-4 bg-[#F9FAFB] border border-[#E8ECF0] rounded-xl text-xs font-medium text-navy-900 focus:border-pink-brand outline-none transition-colors"
        />

        {/* Team score list */}
        {loading ? (
          <div className="mt-3 space-y-2.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-[#F4F6F9] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="mt-3 space-y-3">
          {filteredScores.map((score) => {
            const isExpanded = expandedUser === score.userId;
            const isDonePerfect = score.displayWorkDone === '0%';
            const isOnTimePerfect = score.displayWorkOnTime === '0%';
            const doneCount = score.doneTasksCount || 0;
            const totalCount = score.totalTasks || 0;
            const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 100;

            return (
              <div
                key={score.userId}
                className="rounded-2xl bg-white border border-[#E8ECF0] overflow-hidden transition"
              >
                <div
                  onClick={() => setExpandedUser(isExpanded ? null : score.userId)}
                  className="p-4 cursor-pointer hover:bg-[#F9FAFB] transition space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-sm text-navy-900 flex items-center gap-1.5">
                        <span>{score.name}</span>
                        {score.role !== 'USER' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-black">
                            {score.role}
                          </span>
                        )}
                      </h4>
                      <span className="text-[11px] font-semibold text-slate-400">{score.mobile}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-navy-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                        {doneCount}/{totalCount} Done ({pct}%)
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Progress bar per employee */}
                  <div className="w-full h-1.5 bg-[#F4F6F9] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        pct === 100 ? 'bg-emerald-500' : 'bg-pink-brand'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  {/* Negative MIS Score Badges */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div
                      className={`p-1.5 rounded-xl text-center border ${
                        isDonePerfect
                          ? 'bg-navy-900 text-white border-navy-900'
                          : 'bg-[#FFF5F8] text-[#7A0B45] border-[#F9BFDF]'
                      }`}
                    >
                      <span className="text-[9px] uppercase font-bold block opacity-80">Work Done</span>
                      <span className="text-base font-black">{score.displayWorkDone}</span>
                      <span className="text-[9px] font-semibold opacity-70 block">
                        {score.weightedDone}/{score.weightedDue} wt
                      </span>
                    </div>

                    <div
                      className={`p-1.5 rounded-xl text-center border ${
                        isOnTimePerfect
                          ? 'bg-navy-900 text-white border-navy-900'
                          : 'bg-[#FFF5F8] text-[#7A0B45] border-[#F9BFDF]'
                      }`}
                    >
                      <span className="text-[9px] uppercase font-bold block opacity-80">Work On Time</span>
                      <span className="text-base font-black">{score.displayWorkOnTime}</span>
                      <span className="text-[9px] font-semibold opacity-70 block">
                        {score.weightedOnTime}/{score.weightedDue} wt
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-4 bg-[#F9FAFB] border-t border-[#E8ECF0] space-y-3">
                    {/* Done Tasks */}
                    <div>
                      <h5 className="text-[11px] font-black uppercase text-emerald-800 flex items-center gap-1 mb-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Completed ({score.doneItems?.length || 0})</span>
                      </h5>
                      {score.doneItems && score.doneItems.length > 0 ? (
                        <div className="space-y-1.5">
                          {score.doneItems.map((d: any) => (
                            <div
                              key={d.id}
                              className="p-2 rounded-xl bg-white border border-[#D1FAE5] text-xs flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0 flex-1">
                                <span className="font-semibold text-[#374151] block truncate">{d.titleEn}</span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  {d.taskType && (
                                    <span className="text-[8px] font-black uppercase px-1 py-0.2 rounded bg-slate-100 text-slate-600">
                                      {d.taskType}
                                    </span>
                                  )}
                                  {d.isImportant && (
                                    <span className="text-[8px] font-bold text-[#BF1270] bg-[#FFF5F8] px-1 py-0.2 rounded">
                                      Important
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="shrink-0 text-right">
                                <span className="text-[10px] font-extrabold text-emerald-700 block">
                                  {new Date(d.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span className={`text-[9px] font-bold ${d.isOnTime ? 'text-emerald-600' : 'text-amber-600'}`}>
                                  {d.isOnTime ? '✓ On time' : '⚠ Late'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-[#9CA3AF]">No tasks completed yet in this period.</p>
                      )}
                    </div>

                    {/* Pending Tasks */}
                    <div>
                      <h5 className="text-[11px] font-black uppercase text-[#6B7280] flex items-center gap-1 mb-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Pending ({score.notDoneItems?.length || 0})</span>
                      </h5>
                      {score.notDoneItems && score.notDoneItems.length > 0 ? (
                        <div className="space-y-1.5">
                          {score.notDoneItems.map((nd: any) => (
                            <div
                              key={nd.id}
                              className="p-2 rounded-xl bg-white border border-[#E8ECF0] text-xs flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0 flex-1">
                                <span className="font-semibold text-[#374151] block truncate">{nd.titleEn}</span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  {nd.taskType && (
                                    <span className="text-[8px] font-black uppercase px-1 py-0.2 rounded bg-slate-100 text-slate-600">
                                      {nd.taskType}
                                    </span>
                                  )}
                                  {nd.isImportant && (
                                    <span className="text-[8px] font-bold text-[#BF1270] bg-[#FFF5F8] px-1 py-0.2 rounded">
                                      Important (3×)
                                    </span>
                                  )}
                                  {nd.status === 'FLAGGED_FALSE' && (
                                    <span className="text-[8px] font-bold text-amber-800 bg-amber-50 px-1 py-0.2 rounded">
                                      Audit Flagged
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className="text-[10px] text-[#9CA3AF] font-medium shrink-0">
                                Due: {new Date(nd.plannedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-emerald-700 font-bold">All tasks completed!</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          </div>
        )}
      </div>
    </div>
  );
};

