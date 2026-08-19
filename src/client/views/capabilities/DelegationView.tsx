import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Send, Plus, UserCheck, Clock, AlertTriangle, CheckCircle2, MessageSquare } from 'lucide-react';

export const DelegationView: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [delegations, setDelegations] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [assigneeId, setAssigneeId] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [titleHi, setTitleHi] = useState('');
  const [tatHours, setTatHours] = useState('9');
  const [isImportant, setIsImportant] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastAssigned, setLastAssigned] = useState<any>(null);

  const fetchDelegations = async () => {
    setLoading(true);
    try {
      const [delRes, usersRes] = await Promise.all([
        fetch('/api/delegations', {
          headers: { Authorization: `Bearer ${localStorage.getItem('katl_token')}` },
        }),
        fetch('/api/admin/users', {
          headers: { Authorization: `Bearer ${localStorage.getItem('katl_token')}` },
        }),
      ]);

      const [delData, usersData] = await Promise.all([delRes.json(), usersRes.json()]);
      setDelegations(delData.delegations || []);
      setUsers(usersData.users || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDelegations();
  }, []);

  const handleCreateDelegation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigneeId || !titleEn.trim()) return;

    try {
      const res = await fetch('/api/delegations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('katl_token')}`,
        },
        body: JSON.stringify({
          assignee_user_id: assigneeId,
          title_en: titleEn,
          title_hi: titleHi || titleEn,
          tat_hours: Number(tatHours) || 9,
          is_important: isImportant,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        const assignedUser = users.find((u) => u.id === assigneeId);
        setLastAssigned({
          titleEn,
          userName: assignedUser?.name,
          mobile: assignedUser?.mobile,
        });

        setTitleEn('');
        setTitleHi('');
        setShowAssignModal(false);
        fetchDelegations();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-navy-900">{t.delegatedWork}</h2>
          <p className="text-xs text-slate-500">One-off direct assignments with 1-tap WhatsApp nudge</p>
        </div>

        <button
          onClick={() => setShowAssignModal(true)}
          className="min-h-[44px] px-3.5 py-2 rounded-xl bg-hotpink hover:bg-hotpink-hover text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition"
        >
          <Plus className="w-4 h-4" />
          <span>{t.delegateNewTask}</span>
        </button>
      </div>

      {/* Success banner with WhatsApp Link */}
      {lastAssigned && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 space-y-2 shadow-sm animate-fadeIn">
          <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Task assigned to {lastAssigned.userName}!</span>
          </div>
          <p className="text-xs text-emerald-800">{lastAssigned.titleEn}</p>
          <a
            href={`https://wa.me/91${lastAssigned.mobile}?text=${encodeURIComponent(
              `📌 *KATL Operations | Task Assignment*\n\nHello, a new delegated task for you:\n\n📝 *Task:* ${lastAssigned.titleEn}\n📅 *Due By:* Today, 8:00 PM IST\n👤 *Assigned By:* ${user?.name || 'Management'}\n\nPlease review the details in the KATL Ops app and mark it complete once done. Thank you!`
            )}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-[40px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs items-center gap-2 shadow-sm transition"
          >
            <MessageSquare className="w-4 h-4" />
            <span>{t.sendOnWhatsApp}</span>
          </a>
        </div>
      )}

      {/* List of Delegated Tasks */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-slate-200/70 animate-pulse" />
          ))}
        </div>
      ) : delegations.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-sm space-y-2">
          <Send className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="font-extrabold text-base text-navy-900">No active delegations</h3>
          <p className="text-xs text-slate-500">Tap "Assign One-Off Work" to delegate a task to any staff member.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {delegations.map((d) => (
            <div key={d.id} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                  Assigned to: {d.assignee_name}
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  {new Date(d.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </span>
              </div>

              <h4 className="font-bold text-sm text-navy-900 leading-snug">{d.title_en}</h4>

              {d.assignee_mobile && (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400">By: {d.created_by_name}</span>
                  <a
                    href={`https://wa.me/91${d.assignee_mobile}?text=${encodeURIComponent(
                      `📌 *KATL Operations | Task Assignment*\n\nHello, a new delegated task for you:\n\n📝 *Task:* ${d.title_en}\n📅 *Due By:* Today, 8:00 PM IST\n👤 *Assigned By:* ${d.created_by_name || user?.name || 'Management'}\n\nPlease review the details in the KATL Ops app and mark it complete once done. Thank you!`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp Nudge</span>
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-extrabold text-base text-navy-900">{t.delegateNewTask}</h3>

            <form onSubmit={handleCreateDelegation} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">Assign to Staff Member *</label>
                <select
                  required
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full min-h-[48px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:border-hotpink focus:ring-1 focus:ring-hotpink outline-none"
                >
                  <option value="">Choose staff...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.designations?.[0] || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">Task Title (English) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Verify fabric rolls for Lot 42"
                  value={titleEn}
                  onChange={(e) => setTitleEn(e.target.value)}
                  className="w-full min-h-[48px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:border-hotpink focus:ring-1 focus:ring-hotpink outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">Task Title (Hindi)</label>
                <input
                  type="text"
                  placeholder="e.g. लॉट 42 के कपड़े के रोल चेक करें"
                  value={titleHi}
                  onChange={(e) => setTitleHi(e.target.value)}
                  className="w-full min-h-[48px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:border-hotpink focus:ring-1 focus:ring-hotpink outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-navy-900 mb-1">Due (Working Hours)</label>
                  <input
                    type="number"
                    min={1}
                    value={tatHours}
                    onChange={(e) => setTatHours(e.target.value)}
                    className="w-full min-h-[48px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:border-hotpink focus:ring-1 focus:ring-hotpink outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="imp"
                    checked={isImportant}
                    onChange={(e) => setIsImportant(e.target.checked)}
                    className="w-5 h-5 rounded text-hotpink focus:ring-hotpink"
                  />
                  <label htmlFor="imp" className="text-xs font-bold text-navy-900">
                    Important (3x weight)
                  </label>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="min-h-[48px] px-4 text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[48px] px-6 rounded-xl bg-hotpink hover:bg-hotpink-hover text-white font-extrabold text-sm shadow-md"
                >
                  Assign Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
