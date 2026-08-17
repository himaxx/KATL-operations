import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { UniversalWorkCard, WorkItem } from '../../components/work/UniversalWorkCard';
import { WorkModal } from '../../components/work/WorkModal';
import { HelpSlipModal } from '../../components/help/HelpSlipModal';
import { CheckCircle2, HelpCircle, AlertTriangle, RefreshCw, Plus, BookOpen } from 'lucide-react';

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

  const totalCount = workItems.length;
  const doneCount = workItems.filter((w) => w.status === 'DONE').length;
  const pendingCount = totalCount - doneCount;

  const missedImportant = workItems.filter(
    (w) => w.status !== 'DONE' && Boolean(w.is_important) && new Date(w.planned_at) < new Date() && !w.is_locked
  );

  const designation = user?.designations?.[0] || 'Your';

  return (
    <div className="min-h-full bg-white pb-24">
      {/* ── Hero Banner (dark card like reference) ── */}
      <div className="mx-4 mt-4 rounded-2xl overflow-hidden hero-gradient relative min-h-[110px] flex items-center">
        {/* Decorative right image area */}
        <div className="absolute right-0 top-0 bottom-0 w-28 opacity-20 pointer-events-none overflow-hidden rounded-r-2xl">
          <div className="w-full h-full bg-gradient-to-l from-[#4A5568] to-transparent" />
        </div>
        {/* Text */}
        <div className="relative z-10 px-5 py-5">
          <p className="text-pink-brand font-extrabold text-sm leading-tight mb-1">Your task list.</p>
          <p className="text-white text-sm font-medium leading-snug max-w-[220px]">
            {pendingCount > 0
              ? `${pendingCount} task${pendingCount !== 1 ? 's' : ''} pending today — complete before 8:00 PM.`
              : 'All tasks done for today. Great work!'}
          </p>
        </div>
        {/* Refreshing indicator */}
        {isRefreshing && (
          <div className="absolute top-3 right-3">
            <RefreshCw className="w-3.5 h-3.5 text-pink-brand animate-spin" />
          </div>
        )}
      </div>

      {/* ── Missed Important Alert ── */}
      {missedImportant.length > 0 && (
        <div className="mx-4 mt-3 p-3.5 rounded-xl border border-[#F59AC9] bg-[#FFF5F8] flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-pink-brand mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-bold text-[#7A0B45] leading-tight">Missed Important Task</p>
            <p className="text-[11px] text-[#9F0E5A] leading-snug mt-0.5 font-medium">
              "{missedImportant[0].title_en}" is past deadline. Submit before 8:00 PM lock.
            </p>
          </div>
        </div>
      )}

      {/* ── MY TASKS section header ── */}
      <div className="mx-4 mt-5 mb-2">
        <p className="text-[11px] font-black tracking-widest uppercase text-[#9CA3AF]">My Tasks</p>
      </div>

      {/* ── Task List ── */}
      <div className="mx-4 space-y-2.5">
        {loading ? (
          <div className="rounded-2xl border border-[#E8ECF0] bg-white">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 m-3 rounded-xl bg-[#F4F6F9] animate-pulse" />
            ))}
          </div>
        ) : workItems.length === 0 ? (
          // Empty state — exactly like reference design
          <div className="rounded-2xl border border-dashed border-[#D1D5DB] bg-white py-10 flex flex-col items-center justify-center gap-2.5">
            <svg className="w-10 h-10 text-[#D1D5DB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <div className="text-center px-6">
              <p className="text-sm font-semibold text-[#4A5568]">No pending tasks for you right now.</p>
              <p className="text-[11px] text-[#9CA3AF] mt-0.5">All your tasks for today are done!</p>
            </div>
          </div>
        ) : (
          workItems.map((item) => (
            <UniversalWorkCard key={item.id} item={item} onAction={handleCardAction} />
          ))
        )}
      </div>

      {/* ── Help Slip CTA Card (style like reference's Raise New button) ── */}
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
