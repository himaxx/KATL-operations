import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import {
  Users, UserPlus, ChevronDown, ChevronRight, ChevronUp, X, Pin, Shield,
  Plus, Send, Clock, AlertTriangle, CheckCircle2, RefreshCw, Edit3, Trash2,
  CalendarClock, Target, Layers, Lock
} from 'lucide-react';

// ─── API helper ────────────────────────────────────────────────────────
const api = (path: string, opts?: RequestInit) =>
  fetch(path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('katl_token')}`,
      ...(opts?.headers || {}),
    },
  }).then(r => r.json());

// ─── Types ─────────────────────────────────────────────────────────────
interface TeamMember {
  id: string; name: string; mobile: string; role: string;
  selfie_url: string | null; is_active: number; created_at: string;
  designations: { designation_id: string; name: string; department: string }[];
}
interface Designation { id: string; name: string; department: string; }
interface DesigTaskTemplate {
  id: string; title_en: string; title_hi: string; priority: string;
  task_type: string; frequency: string; designation_name: string;
  designation_id: string; is_important: number; is_compliance: number;
  created_by_name: string; created_at: string;
}
interface DelegationTask {
  id: string; title_en: string; title_hi: string; assignee_user_id: string;
  assignee_name: string; assignee_mobile: string; assignee_selfie: string | null;
  deadline_at: string | null; deadline_no: number; status: string;
  is_important: number; created_at: string; work_item_id: string;
}

type SubTab = 'team' | 'assign' | 'delegation' | 'compliance';

// ─── Sub-tab pills ─────────────────────────────────────────────────────
const TABS: { id: SubTab; label: string; icon: React.FC<any> }[] = [
  { id: 'team', label: 'Team', icon: Users },
  { id: 'assign', label: 'Assign', icon: Target },
  { id: 'delegation', label: 'Delegation', icon: Pin },
  { id: 'compliance', label: 'Compliance', icon: Shield },
];

export const MandateHomeView: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<SubTab>('team');
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  return (
    <div className="min-h-full bg-white pb-24">
      {/* Hero */}
      <div className="mx-4 mt-4 rounded-2xl overflow-hidden hero-gradient relative min-h-[90px] flex items-center">
        <div className="relative z-10 px-5 py-4">
          <p className="text-pink-brand font-extrabold text-sm leading-tight mb-0.5">Team & Task Hub</p>
          <p className="text-white text-sm font-medium leading-snug max-w-[260px]">
            Manage people, assign tasks, delegate work, and enforce compliance.
          </p>
        </div>
      </div>

      {/* Sub-tab selector */}
      <div className="mx-4 mt-3 grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-2xl">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 rounded-xl transition-all text-[11px] font-extrabold flex flex-col items-center gap-0.5 ${
                isActive ? 'bg-navy-900 text-white shadow-sm' : 'text-slate-500 hover:text-navy-900'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-hotpink' : ''}`} strokeWidth={2} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="mt-3">
        {activeTab === 'team' && <TeamTab key={refreshKey} onRefresh={refresh} />}
        {activeTab === 'assign' && <AssignTab key={refreshKey} onRefresh={refresh} />}
        {activeTab === 'delegation' && <DelegationTab key={refreshKey} onRefresh={refresh} />}
        {activeTab === 'compliance' && <ComplianceTab key={refreshKey} onRefresh={refresh} />}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// SUB-TAB 1: TEAM MEMBERS
// ═══════════════════════════════════════════════════════════════════════
const MemberTaskForm: React.FC<{ userId: string; onTaskAdded: () => void }> = ({ userId, onTaskAdded }) => {
  const [show, setShow] = useState(false);
  const [titleEn, setTitleEn] = useState('');
  const [titleHi, setTitleHi] = useState('');
  const [freq, setFreq] = useState('DAILY');
  const [dueTime, setDueTime] = useState('19:00');
  const [isImportant, setIsImportant] = useState(false);
  const [isCompliance, setIsCompliance] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleEn || !titleHi) return;
    setSubmitting(true);
    const res = await api('/api/checklists/definitions', {
      method: 'POST',
      body: JSON.stringify({
        title_en: titleEn,
        title_hi: titleHi,
        target_type: 'USER',
        target_id: userId,
        frequency: freq,
        due_time: dueTime,
        is_important: isImportant || isCompliance,
        is_compliance: isCompliance,
      }),
    });
    setSubmitting(false);
    if (res.success) {
      setTitleEn('');
      setTitleHi('');
      setIsImportant(false);
      setIsCompliance(false);
      setShow(false);
      onTaskAdded();
    }
  };

  if (!show) {
    return (
      <button onClick={() => setShow(true)} className="w-full py-1.5 px-3 border border-dashed border-slate-300 text-slate-700 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 active:scale-95 transition">
        <Plus className="w-3.5 h-3.5 text-hotpink" /> + Assign Custom / Compliance Task
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black text-navy-900 uppercase">Assign Task to User</span>
        <button type="button" onClick={() => setShow(false)} className="text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
      </div>
      <input required placeholder="Task Title (English)" value={titleEn} onChange={e => setTitleEn(e.target.value)}
        className="w-full min-h-[38px] px-2.5 bg-white border border-slate-300 rounded-lg text-xs focus:border-hotpink outline-none" />
      <input required placeholder="Task Title (Hindi)" value={titleHi} onChange={e => setTitleHi(e.target.value)}
        className="w-full min-h-[38px] px-2.5 bg-white border border-slate-300 rounded-lg text-xs focus:border-hotpink outline-none" />
      
      <div className="grid grid-cols-2 gap-2">
        <select value={freq} onChange={e => setFreq(e.target.value)}
          className="min-h-[38px] px-2 bg-white border border-slate-300 rounded-lg text-xs focus:border-hotpink outline-none">
          <option value="DAILY">Daily</option>
          <option value="WEEKLY">Weekly</option>
          <option value="MONTHLY">Monthly</option>
        </select>
        <input type="time" value={dueTime} onChange={e => setDueTime(e.target.value)}
          className="min-h-[38px] px-2 bg-white border border-slate-300 rounded-lg text-xs focus:border-hotpink outline-none" />
      </div>

      <div className="flex gap-4 pt-0.5">
        <label className="flex items-center gap-1.5 text-xs text-navy-900 cursor-pointer">
          <input type="checkbox" checked={isImportant} onChange={e => setIsImportant(e.target.checked)} className="w-4 h-4 accent-hotpink" />
          Important
        </label>
        <label className="flex items-center gap-1.5 text-xs text-navy-900 cursor-pointer">
          <input type="checkbox" checked={isCompliance} onChange={e => {
            setIsCompliance(e.target.checked);
            if (e.target.checked) setIsImportant(true);
          }} className="w-4 h-4 accent-lightpink-700" />
          🔒 Compliance Task
        </label>
      </div>

      <button type="submit" disabled={submitting} className="w-full min-h-[38px] rounded-lg bg-navy-900 text-white text-xs font-bold active:scale-95 transition disabled:opacity-60">
        {submitting ? 'Assigning...' : 'Assign Task'}
      </button>
    </form>
  );
};

const TeamTab: React.FC<{ onRefresh: () => void }> = ({ onRefresh }) => {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [allDesigs, setAllDesigs] = useState<Designation[]>([]);
  const [checklistDefs, setChecklistDefs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const [addForm, setAddForm] = useState({ name: '', mobile: '', role: 'USER', department: '', designation_id: '' });
  const [tempPin, setTempPin] = useState<string | null>(null);

  const departments = Array.from(new Set(allDesigs.map(d => d.department)));
  const filteredDesignations = allDesigs.filter(d => d.department === addForm.department);

  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([
      api('/api/mandate/team'),
      api('/api/checklists/definitions')
    ]).then(([d, c]) => {
      setTeam(d.team || []);
      setAllDesigs(d.all_designations || []);
      setChecklistDefs(c.definitions || []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api('/api/mandate/team', { method: 'POST', body: JSON.stringify(addForm) });
    if (res.success) {
      setTempPin(res.temp_pin);
      setShowAdd(false);
      setAddForm({ name: '', mobile: '', role: 'USER', department: '', designation_id: '' });
      loadData();
      onRefresh();
    }
  };

  const toggleActive = async (userId: string, currentActive: number) => {
    await api(`/api/mandate/team/${userId}`, {
      method: 'PATCH', body: JSON.stringify({ is_active: currentActive ? 0 : 1 }),
    });
    loadData();
    onRefresh();
  };

  const addDesignation = async (userId: string, desigId: string) => {
    await api(`/api/mandate/team/${userId}/designations`, {
      method: 'POST', body: JSON.stringify({ designation_id: desigId }),
    });
    loadData();
    onRefresh();
  };

  const removeDesignation = async (userId: string, desigId: string) => {
    await api(`/api/mandate/team/${userId}/designations/${desigId}`, { method: 'DELETE' });
    loadData();
    onRefresh();
  };

  const removeTask = async (taskId: string) => {
    await api(`/api/checklists/definitions/${taskId}`, { method: 'DELETE' });
    loadData();
    onRefresh();
  };

  return (
    <div className="mx-4 space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-black tracking-widest uppercase text-slate-400">
          Team Members ({team.length})
        </p>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-navy-900 text-white text-[11px] font-extrabold transition active:scale-95"
        >
          <UserPlus className="w-3.5 h-3.5 text-hotpink" /> Add Member
        </button>
      </div>

      {/* Temp PIN toast */}
      {tempPin && (
        <div className="p-3.5 rounded-2xl bg-navy-900 text-white space-y-2 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-hotpink uppercase">Member Created</span>
            <button onClick={() => setTempPin(null)} className="text-[10px] text-slate-400">Close</button>
          </div>
          <p className="text-xs text-slate-300">Default PIN: <span className="text-xl font-black text-hotpink tracking-widest">{tempPin}</span></p>
          <p className="text-[10px] text-slate-500 italic">Share this PIN. User will set a new one on first login.</p>
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <form onSubmit={handleAdd} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2.5">
          <p className="text-xs font-bold text-navy-900">New Team Member</p>
          <input required placeholder="Full Name" value={addForm.name}
            onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
            className="w-full min-h-[44px] px-3 bg-white border border-slate-300 rounded-xl text-sm focus:border-hotpink outline-none"
          />
          <input required placeholder="Mobile (10 digits)" value={addForm.mobile} maxLength={10}
            onChange={e => setAddForm(f => ({ ...f, mobile: e.target.value }))}
            className="w-full min-h-[44px] px-3 bg-white border border-slate-300 rounded-xl text-sm focus:border-hotpink outline-none"
          />
          <div className="space-y-2">
            <select value={addForm.role}
              onChange={e => setAddForm(f => ({ ...f, role: e.target.value }))}
              className="w-full min-h-[44px] px-3 bg-white border border-slate-300 rounded-xl text-sm focus:border-hotpink outline-none"
            >
              <option value="USER">User Role</option>
              <option value="MANDATE_HOLDER">Mandate Holder Role</option>
            </select>

            <div className="grid grid-cols-2 gap-2">
              <select required value={addForm.department}
                onChange={e => setAddForm(f => ({ ...f, department: e.target.value, designation_id: '' }))}
                className="min-h-[44px] px-3 bg-white border border-slate-300 rounded-xl text-sm focus:border-hotpink outline-none"
              >
                <option value="">Select Dept</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>

              <select required value={addForm.designation_id} disabled={!addForm.department}
                onChange={e => setAddForm(f => ({ ...f, designation_id: e.target.value }))}
                className="min-h-[44px] px-3 bg-white border border-slate-300 rounded-xl text-sm focus:border-hotpink outline-none disabled:opacity-50"
              >
                <option value="">Select Desig</option>
                {filteredDesignations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setShowAdd(false)}
              className="flex-1 min-h-[40px] rounded-xl border border-slate-300 text-sm font-bold text-slate-600">Cancel</button>
            <button type="submit"
              className="flex-1 min-h-[40px] rounded-xl bg-pink-brand text-white text-sm font-extrabold active:scale-95 transition">Create</button>
          </div>
        </form>
      )}

      {/* Team list */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-16 rounded-2xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : team.map(member => {
        const isExpanded = expandedId === member.id;
        const memberTasks = checklistDefs.filter(
          (def) => def.target_type === 'USER' && def.target_id === member.id && def.is_active === 1
        );

        return (
          <div key={member.id} className={`rounded-2xl border transition-all ${
            !member.is_active ? 'bg-slate-50 border-slate-200 opacity-70' : 'bg-white border-slate-200'
          }`}>
            {/* Member row */}
            <button className="w-full p-3.5 flex items-center gap-3 text-left" onClick={() => setExpandedId(isExpanded ? null : member.id)}>
              <div className="w-10 h-10 rounded-xl bg-navy-100 text-navy-900 flex items-center justify-center font-extrabold text-sm shrink-0">
                {member.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-navy-900 truncate">{member.name}</p>
                <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                  {member.designations.map(d => (
                    <span key={d.designation_id} className="text-[9px] font-bold text-navy-600 bg-navy-50 border border-navy-100 px-1.5 py-0.5 rounded-full">{d.name} ({d.department})</span>
                  ))}
                  {member.designations.length === 0 && <span className="text-[9px] text-slate-400 italic">No designation</span>}
                  <span className="text-[9px] text-slate-400">· {member.mobile}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${member.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                  {member.is_active ? 'Active' : 'Inactive'}
                </span>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
            </button>

            {/* Expanded panel */}
            {isExpanded && (
              <div className="px-3.5 pb-3.5 pt-0 space-y-3.5 border-t border-slate-100">
                {/* Checklist Tasks List & Management */}
                <div className="pt-3.5 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Checklist Tasks</span>
                  {memberTasks.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No individual tasks assigned.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {memberTasks.map(t => (
                        <div key={t.id} className={`flex items-center justify-between p-2.5 rounded-xl border text-xs ${
                          t.is_compliance ? 'bg-lightpink-50 border-lightpink-200' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <div className="flex-1 min-w-0 pr-2">
                            <p className="font-bold text-navy-950 truncate flex items-center gap-1">
                              {t.is_compliance && <Shield className="w-3.5 h-3.5 text-lightpink-700 shrink-0" />}
                              {t.title_en}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-0.5">{t.frequency} · Due at {t.due_time} {t.is_important ? '· Important' : ''}</p>
                          </div>
                          <button onClick={() => removeTask(t.id)} className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-slate-100 transition">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <MemberTaskForm userId={member.id} onTaskAdded={loadData} />
                </div>

                <hr className="border-slate-100" />

                {/* Designation management */}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Designations</p>
                  <div className="flex flex-wrap gap-1.5">
                    {member.designations.map(d => (
                      <span key={d.designation_id} className="flex items-center gap-1 text-[10px] font-bold bg-navy-100 text-navy-800 px-2 py-1 rounded-lg">
                        {d.name}
                        <button onClick={() => removeDesignation(member.id, d.designation_id)} className="text-lightpink-500 hover:text-red-700">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    <select
                      onChange={e => { if (e.target.value) { addDesignation(member.id, e.target.value); e.target.value = ''; } }}
                      className="text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-100 border border-dashed border-slate-300 text-slate-500"
                    >
                      <option value="">+ Add</option>
                      {allDesigs.filter(d => !member.designations.some(md => md.designation_id === d.id))
                        .map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                </div>
                {/* Toggle active */}
                <button onClick={() => toggleActive(member.id, member.is_active)}
                  className={`w-full min-h-[36px] rounded-xl text-xs font-bold transition ${
                    member.is_active ? 'bg-lightpink-50 text-lightpink-700 border border-lightpink-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {member.is_active ? 'Deactivate Member' : 'Reactivate Member'}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// SUB-TAB 2: ASSIGN BY DESIGNATION
// ═══════════════════════════════════════════════════════════════════════
const AssignTab: React.FC<{ onRefresh: () => void }> = ({ onRefresh }) => {
  const [templates, setTemplates] = useState<DesigTaskTemplate[]>([]);
  const [allDesigs, setAllDesigs] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ count: number; names: string[] } | null>(null);

  const [form, setForm] = useState({
    title_en: '', title_hi: '', designation_id: '', priority: 'MEDIUM',
    task_type: 'REPETITIVE', frequency: 'DAILY', is_important: false, due_time: '19:00',
  });

  useEffect(() => {
    Promise.all([
      api('/api/mandate/designation-tasks'),
      api('/api/mandate/team'),
    ]).then(([tRes, teamRes]) => {
      setTemplates(tRes.templates || []);
      setAllDesigs(teamRes.all_designations || []);
      setLoading(false);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await api('/api/mandate/designation-tasks', { method: 'POST', body: JSON.stringify(form) });
    setSubmitting(false);
    if (res.success) {
      setResult({ count: res.assigned_to_count, names: res.users });
      setShowForm(false);
      setForm({ title_en: '', title_hi: '', designation_id: '', priority: 'MEDIUM', task_type: 'REPETITIVE', frequency: 'DAILY', is_important: false, due_time: '19:00' });
      onRefresh();
    }
  };

  const deactivateTemplate = async (id: string) => {
    await api(`/api/mandate/designation-tasks/${id}`, { method: 'DELETE' });
    onRefresh();
  };

  return (
    <div className="mx-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-black tracking-widest uppercase text-slate-400">Assign by Designation</p>
        <button onClick={() => { setShowForm(!showForm); setResult(null); }}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-navy-900 text-white text-[11px] font-extrabold transition active:scale-95">
          <Plus className="w-3.5 h-3.5 text-hotpink" /> New Task
        </button>
      </div>

      {/* Result toast */}
      {result && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
          <p className="text-xs font-bold text-emerald-800">Assigned to {result.count} member{result.count !== 1 ? 's' : ''}</p>
          <p className="text-[10px] text-emerald-600">{result.names.join(', ')}</p>
          <button onClick={() => setResult(null)} className="text-[10px] text-emerald-500 underline">Dismiss</button>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2.5">
          <p className="text-xs font-bold text-navy-900">Create Task for a Designation</p>
          <input required placeholder="Task Title (English)" value={form.title_en}
            onChange={e => setForm(f => ({ ...f, title_en: e.target.value }))}
            className="w-full min-h-[44px] px-3 bg-white border border-slate-300 rounded-xl text-sm focus:border-hotpink outline-none" />
          <input required placeholder="Task Title (Hindi)" value={form.title_hi}
            onChange={e => setForm(f => ({ ...f, title_hi: e.target.value }))}
            className="w-full min-h-[44px] px-3 bg-white border border-slate-300 rounded-xl text-sm focus:border-hotpink outline-none" />

          <select required value={form.designation_id}
            onChange={e => setForm(f => ({ ...f, designation_id: e.target.value }))}
            className="w-full min-h-[44px] px-3 bg-white border border-slate-300 rounded-xl text-sm focus:border-hotpink outline-none">
            <option value="">Select Designation</option>
            {allDesigs.map(d => <option key={d.id} value={d.id}>{d.name} ({d.department})</option>)}
          </select>

          <div className="grid grid-cols-3 gap-2">
            <select value={form.priority}
              onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
              className="min-h-[44px] px-2 bg-white border border-slate-300 rounded-xl text-xs focus:border-hotpink outline-none">
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
            <select value={form.frequency}
              onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}
              className="min-h-[44px] px-2 bg-white border border-slate-300 rounded-xl text-xs focus:border-hotpink outline-none">
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
            </select>
            <select value={form.task_type}
              onChange={e => setForm(f => ({ ...f, task_type: e.target.value, is_important: e.target.value === 'COMPLIANCE' ? true : f.is_important }))}
              className="min-h-[44px] px-2 bg-white border border-slate-300 rounded-xl text-xs focus:border-hotpink outline-none">
              <option value="REPETITIVE">Repetitive</option>
              <option value="COMPLIANCE">Compliance</option>
            </select>
          </div>

          <label className="flex items-center gap-2 text-xs font-bold text-navy-900 cursor-pointer">
            <input type="checkbox" checked={form.is_important}
              onChange={e => setForm(f => ({ ...f, is_important: e.target.checked }))}
              className="w-4 h-4 rounded accent-hotpink"
            />
            Mark as Important (3x weight)
          </label>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 min-h-[40px] rounded-xl border border-slate-300 text-sm font-bold text-slate-600">Cancel</button>
            <button type="submit" disabled={submitting}
              className="flex-1 min-h-[40px] rounded-xl bg-pink-brand text-white text-sm font-extrabold active:scale-95 transition disabled:opacity-60">
              {submitting ? 'Assigning...' : 'Assign to All'}
            </button>
          </div>
        </form>
      )}

      {/* Existing templates */}
      <p className="text-[10px] font-bold text-slate-400 uppercase mt-4">Active Templates</p>
      {loading ? (
        <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-14 rounded-2xl bg-slate-100 animate-pulse" />)}</div>
      ) : templates.length === 0 ? (
        <div className="p-6 text-center rounded-2xl border border-dashed border-slate-300">
          <p className="text-sm font-semibold text-slate-500">No task templates yet.</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Create a task to assign it to an entire designation.</p>
        </div>
      ) : templates.map(tpl => (
        <div key={tpl.id} className={`p-3.5 rounded-2xl border ${
          tpl.is_compliance ? 'border-lightpink-200 bg-lightpink-50' : 'border-slate-200 bg-white'
        }`}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-navy-900 truncate">{tpl.title_en}</p>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span className="text-[9px] font-bold bg-navy-100 text-navy-700 px-1.5 py-0.5 rounded-full">{tpl.designation_name}</span>
                <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">{tpl.frequency}</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                  tpl.priority === 'HIGH' ? 'bg-hotpink-50 text-hotpink-700' :
                  tpl.priority === 'LOW' ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-700'
                }`}>{tpl.priority}</span>
                {tpl.is_compliance ? <span className="text-[9px] font-bold bg-lightpink-100 text-lightpink-700 px-1.5 py-0.5 rounded-full">Compliance</span> : null}
              </div>
            </div>
            <button onClick={() => deactivateTemplate(tpl.id)} className="p-1.5 rounded-lg hover:bg-slate-100 transition text-slate-400">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// SUB-TAB 3: DELEGATION TASKS
// ═══════════════════════════════════════════════════════════════════════
const DelegationTab: React.FC<{ onRefresh: () => void }> = ({ onRefresh }) => {
  const [tasks, setTasks] = useState<DelegationTask[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [extendingId, setExtendingId] = useState<string | null>(null);
  const [extendDate, setExtendDate] = useState('');

  const [form, setForm] = useState({ assignee_user_id: '', title_en: '', title_hi: '', deadline_at: '', is_important: false });

  useEffect(() => {
    Promise.all([
      api('/api/mandate/delegation-tasks'),
      api('/api/mandate/team'),
    ]).then(([dRes, tRes]) => {
      setTasks(dRes.delegation_tasks || []);
      setTeam(tRes.team || []);
      setLoading(false);
    });
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const body = { ...form, deadline_at: form.deadline_at || null };
    const res = await api('/api/mandate/delegation-tasks', { method: 'POST', body: JSON.stringify(body) });
    setSubmitting(false);
    if (res.success) {
      setShowForm(false);
      setForm({ assignee_user_id: '', title_en: '', title_hi: '', deadline_at: '', is_important: false });
      onRefresh();
    }
  };

  const handleExtend = async (taskId: string) => {
    if (!extendDate) return;
    await api(`/api/mandate/delegation-tasks/${taskId}/extend-deadline`, {
      method: 'PATCH', body: JSON.stringify({ new_deadline: new Date(extendDate).toISOString() }),
    });
    setExtendingId(null);
    setExtendDate('');
    onRefresh();
  };

  const handleMarkDone = async (taskId: string) => {
    await api(`/api/mandate/delegation-tasks/${taskId}/mark-done`, { method: 'POST' });
    onRefresh();
  };

  const isOverdue = (task: DelegationTask) => task.deadline_at && new Date(task.deadline_at) < new Date() && task.status === 'OPEN';

  return (
    <div className="mx-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-black tracking-widest uppercase text-slate-400">
          Delegation Tasks ({tasks.filter(t => t.status === 'OPEN').length} active)
        </p>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-navy-900 text-white text-[11px] font-extrabold transition active:scale-95">
          <Plus className="w-3.5 h-3.5 text-hotpink" /> Delegate
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="p-4 rounded-2xl border-2 border-hotpink-200 bg-hotpink-50 space-y-2.5">
          <p className="text-xs font-bold text-navy-900 flex items-center gap-1">
            <Pin className="w-3.5 h-3.5 text-hotpink" /> Create Delegation Task
          </p>
          <select required value={form.assignee_user_id}
            onChange={e => setForm(f => ({ ...f, assignee_user_id: e.target.value }))}
            className="w-full min-h-[44px] px-3 bg-white border border-slate-300 rounded-xl text-sm focus:border-hotpink outline-none">
            <option value="">Select Team Member</option>
            {team.filter(m => m.is_active).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <input required placeholder="Task Title (English)" value={form.title_en}
            onChange={e => setForm(f => ({ ...f, title_en: e.target.value }))}
            className="w-full min-h-[44px] px-3 bg-white border border-slate-300 rounded-xl text-sm focus:border-hotpink outline-none" />
          <input required placeholder="Task Title (Hindi)" value={form.title_hi}
            onChange={e => setForm(f => ({ ...f, title_hi: e.target.value }))}
            className="w-full min-h-[44px] px-3 bg-white border border-slate-300 rounded-xl text-sm focus:border-hotpink outline-none" />
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Deadline (optional — member sets if blank)</label>
            <input type="datetime-local" value={form.deadline_at}
              onChange={e => setForm(f => ({ ...f, deadline_at: e.target.value }))}
              className="w-full min-h-[44px] px-3 bg-white border border-slate-300 rounded-xl text-sm focus:border-hotpink outline-none" />
          </div>
          <label className="flex items-center gap-2 text-xs font-bold text-navy-900 cursor-pointer">
            <input type="checkbox" checked={form.is_important}
              onChange={e => setForm(f => ({ ...f, is_important: e.target.checked }))}
              className="w-4 h-4 rounded accent-hotpink" />
            Important (3x weight)
          </label>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 min-h-[40px] rounded-xl border border-slate-300 text-sm font-bold text-slate-600">Cancel</button>
            <button type="submit" disabled={submitting}
              className="flex-1 min-h-[40px] rounded-xl bg-hotpink text-white text-sm font-extrabold active:scale-95 transition disabled:opacity-60">
              {submitting ? 'Creating...' : 'Delegate Task'}
            </button>
          </div>
        </form>
      )}

      {/* Task list */}
      {loading ? (
        <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-20 rounded-2xl bg-slate-100 animate-pulse" />)}</div>
      ) : tasks.filter(t => t.status === 'OPEN').length === 0 ? (
        <div className="p-6 text-center rounded-2xl border border-dashed border-hotpink-200 bg-hotpink-50">
          <Pin className="w-6 h-6 text-hotpink mx-auto mb-1.5" />
          <p className="text-sm font-semibold text-navy-900">No active delegation tasks.</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Delegate work that needs to get done.</p>
        </div>
      ) : tasks.filter(t => t.status === 'OPEN').map(task => (
        <div key={task.id} className={`rounded-2xl border-l-[3px] border ${
          isOverdue(task) ? 'border-l-lightpink-500 border-lightpink-200 bg-lightpink-50' : 'border-l-hotpink border-slate-200 bg-white'
        }`}>
          <div className="p-3.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[9px] font-bold bg-hotpink-50 text-hotpink-700 border border-hotpink-200 px-1.5 py-0.5 rounded-full">Delegation</span>
                  {task.is_important ? <span className="text-[9px] font-bold bg-lightpink-50 text-lightpink-700 border border-lightpink-200 px-1.5 py-0.5 rounded-full">Important</span> : null}
                </div>
                <p className="text-sm font-bold text-navy-900">{task.title_en}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Assigned to: <span className="font-bold text-navy-800">{task.assignee_name}</span>
                </p>
              </div>
            </div>

            {/* Deadline info */}
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              {task.deadline_at ? (
                <span className={`text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 ${
                  isOverdue(task) ? 'bg-lightpink-100 text-lightpink-800' : 'bg-navy-50 text-navy-700'
                }`}>
                  <CalendarClock className="w-3 h-3" />
                  Deadline #{task.deadline_no}: {new Date(task.deadline_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {isOverdue(task) && ' — OVERDUE'}
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-50 text-amber-700 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Member will set deadline
                </span>
              )}
              {task.deadline_no > 1 && (
                <span className="text-[9px] font-bold text-slate-400">
                  ({task.deadline_no}/3 deadlines used)
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="mt-3 flex gap-2">
              {isOverdue(task) && task.deadline_no < 3 && (
                extendingId === task.id ? (
                  <div className="flex-1 flex gap-1.5">
                    <input type="datetime-local" value={extendDate}
                      onChange={e => setExtendDate(e.target.value)}
                      className="flex-1 min-h-[36px] px-2 bg-white border border-slate-300 rounded-lg text-[11px] focus:border-hotpink outline-none" />
                    <button onClick={() => handleExtend(task.id)}
                      className="px-3 min-h-[36px] rounded-lg bg-amber-500 text-white text-[11px] font-bold">Set #{task.deadline_no + 1}</button>
                    <button onClick={() => setExtendingId(null)}
                      className="px-2 min-h-[36px] rounded-lg bg-slate-100 text-slate-500 text-[11px] font-bold">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setExtendingId(task.id)}
                    className="flex-1 min-h-[36px] rounded-xl bg-amber-100 text-amber-800 text-xs font-bold flex items-center justify-center gap-1">
                    <CalendarClock className="w-3.5 h-3.5" /> Extend Deadline
                  </button>
                )
              )}
              <button onClick={() => handleMarkDone(task.id)}
                className="flex-1 min-h-[36px] rounded-xl bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition">
                <CheckCircle2 className="w-3.5 h-3.5" /> Mark Done
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Completed / Missed (collapsed) */}
      {tasks.filter(t => t.status !== 'OPEN').length > 0 && (
        <details className="mt-3">
          <summary className="text-[10px] font-bold text-slate-400 uppercase cursor-pointer">
            Completed / Replaced ({tasks.filter(t => t.status !== 'OPEN').length})
          </summary>
          <div className="space-y-2 mt-2">
            {tasks.filter(t => t.status !== 'OPEN').map(task => (
              <div key={task.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 opacity-60">
                <p className="text-xs font-bold text-slate-600">{task.title_en}</p>
                <p className="text-[10px] text-slate-400">{task.assignee_name} - {task.status}</p>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// SUB-TAB 4: COMPLIANCE TASKS
// ═══════════════════════════════════════════════════════════════════════
const ComplianceTab: React.FC<{ onRefresh: () => void }> = ({ onRefresh }) => {
  const [definitions, setDefinitions] = useState<any[]>([]);
  const [allDesigs, setAllDesigs] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ count: number; names: string[] } | null>(null);

  const [form, setForm] = useState({ title_en: '', title_hi: '', designation_id: '', frequency: 'DAILY', due_time: '19:00' });

  useEffect(() => {
    Promise.all([
      api('/api/checklists/definitions'),
      api('/api/mandate/team'),
    ]).then(([cRes, tRes]) => {
      const complianceDefs = (cRes.definitions || []).filter((d: any) => d.is_compliance);
      setDefinitions(complianceDefs);
      setAllDesigs(tRes.all_designations || []);
      setLoading(false);
    });
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await api('/api/mandate/designation-tasks', {
      method: 'POST',
      body: JSON.stringify({ ...form, task_type: 'COMPLIANCE', is_important: true, priority: 'HIGH' }),
    });
    setSubmitting(false);
    if (res.success) {
      setResult({ count: res.assigned_to_count, names: res.users });
      setShowForm(false);
      setForm({ title_en: '', title_hi: '', designation_id: '', frequency: 'DAILY', due_time: '19:00' });
      onRefresh();
    }
  };

  return (
    <div className="mx-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-black tracking-widest uppercase text-slate-400">Compliance Tasks</p>
        <button onClick={() => { setShowForm(!showForm); setResult(null); }}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-lightpink-700 text-white text-[11px] font-extrabold transition active:scale-95">
          <Lock className="w-3.5 h-3.5" /> New
        </button>
      </div>

      <div className="p-3 rounded-xl bg-lightpink-50 border border-lightpink-200">
        <p className="text-[11px] font-bold text-lightpink-800 flex items-center gap-1">
          <Shield className="w-3.5 h-3.5" />
          Compliance tasks are mandatory. They remain sticky on the member's screen until completed before the deadline.
        </p>
      </div>

      {/* Result toast */}
      {result && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
          <p className="text-xs font-bold text-emerald-800">Compliance task assigned to {result.count} member{result.count !== 1 ? 's' : ''}</p>
          <p className="text-[10px] text-emerald-600">{result.names.join(', ')}</p>
          <button onClick={() => setResult(null)} className="text-[10px] text-emerald-500 underline">Dismiss</button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="p-4 rounded-2xl border-2 border-lightpink-300 bg-lightpink-50 space-y-2.5">
          <p className="text-xs font-bold text-navy-900 flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-lightpink-700" /> New Compliance Task
          </p>
          <input required placeholder="Task Title (English)" value={form.title_en}
            onChange={e => setForm(f => ({ ...f, title_en: e.target.value }))}
            className="w-full min-h-[44px] px-3 bg-white border border-slate-300 rounded-xl text-sm focus:border-lightpink-500 outline-none" />
          <input required placeholder="Task Title (Hindi)" value={form.title_hi}
            onChange={e => setForm(f => ({ ...f, title_hi: e.target.value }))}
            className="w-full min-h-[44px] px-3 bg-white border border-slate-300 rounded-xl text-sm focus:border-lightpink-500 outline-none" />
          <select required value={form.designation_id}
            onChange={e => setForm(f => ({ ...f, designation_id: e.target.value }))}
            className="w-full min-h-[44px] px-3 bg-white border border-slate-300 rounded-xl text-sm focus:border-lightpink-500 outline-none">
            <option value="">Select Designation</option>
            {allDesigs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <select value={form.frequency}
              onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}
              className="min-h-[44px] px-2 bg-white border border-slate-300 rounded-xl text-xs focus:border-lightpink-500 outline-none">
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
            </select>
            <input type="time" value={form.due_time}
              onChange={e => setForm(f => ({ ...f, due_time: e.target.value }))}
              className="min-h-[44px] px-2 bg-white border border-slate-300 rounded-xl text-xs focus:border-lightpink-500 outline-none" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 min-h-[40px] rounded-xl border border-slate-300 text-sm font-bold text-slate-600">Cancel</button>
            <button type="submit" disabled={submitting}
              className="flex-1 min-h-[40px] rounded-xl bg-lightpink-700 text-white text-sm font-extrabold active:scale-95 transition disabled:opacity-60">
              {submitting ? 'Assigning...' : 'Assign Compliance'}
            </button>
          </div>
        </form>
      )}

      {/* Existing compliance definitions */}
      <p className="text-[10px] font-bold text-slate-400 uppercase mt-4">Active Compliance Definitions</p>
      {loading ? (
        <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-14 rounded-2xl bg-slate-100 animate-pulse" />)}</div>
      ) : definitions.length === 0 ? (
        <div className="p-6 text-center rounded-2xl border border-dashed border-lightpink-300 bg-lightpink-50">
          <Shield className="w-6 h-6 text-lightpink-400 mx-auto mb-1.5" />
          <p className="text-sm font-semibold text-navy-900">No compliance tasks yet.</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Create mandatory tasks that must be done before deadline.</p>
        </div>
      ) : definitions.map((def: any) => (
        <div key={def.id} className="p-3.5 rounded-2xl border border-lightpink-200 bg-lightpink-50 border-l-[3px] border-l-lightpink-500">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-navy-900">{def.title_en}</p>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span className="text-[9px] font-bold bg-lightpink-100 text-lightpink-700 px-1.5 py-0.5 rounded-full">Compliance</span>
                <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">{def.frequency}</span>
                <span className="text-[9px] text-slate-400">Target: {def.target_name || def.target_id}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
