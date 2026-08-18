import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { UniversalWorkCard, WorkItem } from '../../components/work/UniversalWorkCard';
import { WorkModal } from '../../components/work/WorkModal';
import { HelpSlipModal } from '../../components/help/HelpSlipModal';
import { RefreshCw, Plus, Pin } from 'lucide-react';

export const UserHomeView: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null);
  const [isWorkModalOpen, setIsWorkModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchWorkItems = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    else setIsRefreshing(true);
    try {
      const res = await fetch('/api/work-items/my', {
        headers: { Authorization: `Bearer ${localStorage.getItem('katl_token')}` },
      });
      const data = await res.json();
      setWorkItems(data.work_items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWorkItems(true);
    const interval = setInterval(() => fetchWorkItems(false), 8000);
    return () => clearInterval(interval);
  }, []);

  const handleCardAction = (item: WorkItem) => {
    setSelectedItem(item);
    setIsWorkModalOpen(true);
  };

  const handleTaskCompleted = () => {
    fetchWorkItems(false);
  };

  // ── Partition: FMS pending, pinned (DELEGATION + COMPLIANCE), vs regular today's tasks
  const fmsItems = workItems.filter(
    (w) => w.status !== 'DONE' && !w.is_locked && w.source_module === 'fms'
  );
  const pinnedItems = workItems.filter(
    (w) =>
      w.status !== 'DONE' &&
      !w.is_locked &&
      w.source_module !== 'fms' &&
      (w.source_module === 'delegation' || w.task_type === 'COMPLIANCE')
  );
  const regularItems = workItems.filter(
    (w) =>
      !w.is_locked &&
      w.source_module !== 'fms' &&
      !(w.source_module === 'delegation' && w.status !== 'DONE') &&
      !(w.task_type === 'COMPLIANCE' && w.status !== 'DONE')
  );

  // Pending count excludes locked tasks (they're not actionable on Home)
  const totalPending = workItems.filter((w) => w.status !== 'DONE' && !w.is_locked).length;

  return (
    <div className="min-h-full bg-white pb-24">
      {/* ── Hero Banner ── */}
      <div className="mx-4 mt-4 rounded-2xl overflow-hidden hero-gradient relative min-h-[110px] flex items-center">
        <div className="absolute right-0 top-0 bottom-0 w-28 opacity-20 pointer-events-none overflow-hidden rounded-r-2xl">
          <div className="w-full h-full bg-gradient-to-l from-[#4A5568] to-transparent" />
        </div>
        <div className="relative z-10 px-5 py-5">
          <p className="text-pink-brand font-extrabold text-sm leading-tight mb-1">Your task list.</p>
          <p className="text-white text-sm font-medium leading-snug max-w-[220px]">
            {totalPending > 0
              ? `${totalPending} task${totalPending !== 1 ? 's' : ''} pending — complete before 8:00 PM.`
              : 'All tasks done for today. Great work!'}
          </p>
        </div>
        {isRefreshing && (
          <div className="absolute top-3 right-3">
            <RefreshCw className="w-3.5 h-3.5 text-pink-brand animate-spin" />
          </div>
        )}
      </div>

      {loading ? (
        <div className="mx-4 mt-4 rounded-2xl border border-[#E8ECF0] bg-white">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 m-3 rounded-xl bg-[#F4F6F9] animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* ── FMS PENDING SECTION: Elevated Top Priority ── */}
          {fmsItems.length > 0 && (
            <div className="mx-4 mt-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-brand opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-brand"></span>
                  </span>
                  <p className="text-[11px] font-black tracking-widest uppercase text-navy-900">
                    Flowchart Action Required
                  </p>
                </div>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-pink-50 text-pink-brand border border-pink-200">
                  {fmsItems.length} {fmsItems.length === 1 ? 'Pending Action' : 'Pending Actions'}
                </span>
              </div>
              <div className="space-y-2.5">
                {fmsItems.map((item) => (
                  <UniversalWorkCard key={item.id} item={item} onAction={handleCardAction} />
                ))}
              </div>
            </div>
          )}

          {/* ── PINNED SECTION: Delegation + Compliance ── */}
          {pinnedItems.length > 0 && (
            <div className="mx-4 mt-5">
              <div className="flex items-center gap-2 mb-2">
                <Pin className="w-3 h-3 text-pink-brand" />
                <p className="text-[11px] font-black tracking-widest uppercase text-pink-brand">
                  Pinned Tasks
                </p>
              </div>
              <div className="space-y-2.5">
                {pinnedItems.map((item) => (
                  <UniversalWorkCard key={item.id} item={item} onAction={handleCardAction} />
                ))}
              </div>
            </div>
          )}

          {/* ── TODAY'S TASKS section ── */}
          <div className="mx-4 mt-5 mb-2">
            <p className="text-[11px] font-black tracking-widest uppercase text-[#9CA3AF]">Today's Tasks</p>
          </div>

          <div className="mx-4 space-y-2.5">
            {regularItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#D1D5DB] bg-white py-10 flex flex-col items-center justify-center gap-2.5">
                <svg className="w-10 h-10 text-[#D1D5DB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <div className="text-center px-6">
                  <p className="text-sm font-semibold text-[#4A5568]">No pending tasks for today.</p>
                  <p className="text-[11px] text-[#9CA3AF] mt-0.5">All your tasks for today are done!</p>
                </div>
              </div>
            ) : (
              regularItems.map((item) => (
                <UniversalWorkCard key={item.id} item={item} onAction={handleCardAction} />
              ))
            )}
          </div>
        </>
      )}

      {/* ── Help Slip CTA ── */}
      <div className="mx-4 mt-6">
        <button
          onClick={() => setIsHelpModalOpen(true)}
          className="w-full rounded-2xl bg-[#F4F6F9] hover:bg-[#EBEDF2] transition-colors py-4 flex items-center justify-center gap-2 text-navy-900 text-sm font-bold"
        >
          <Plus className="w-4 h-4 text-pink-brand" />
          <span>Raise a Help Slip / Question</span>
        </button>
        <p className="text-[11px] text-[#9CA3AF] text-center mt-2 px-4 leading-snug">
          Stuck on something? Your question goes to your manager instantly.
        </p>
      </div>

      {/* Modals */}
      <WorkModal
        item={selectedItem}
        isOpen={isWorkModalOpen}
        onClose={() => setIsWorkModalOpen(false)}
        onSuccess={handleTaskCompleted}
      />
      <HelpSlipModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />
    </div>
  );
};
