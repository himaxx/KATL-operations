import React, { useState, useEffect, useCallback } from 'react';
import { Users, Check, Loader2, AlertCircle } from 'lucide-react';

const ALL_SYSTEMS = [
  { code: 'CL', label: 'CL', desc: 'Checklist' },
  { code: 'O2D', label: 'O2D', desc: 'Order to Delivery' },
  { code: 'Purchase', label: 'PUR', desc: 'Purchase FMS' },
];

interface StaffUser {
  id: string;
  name: string;
  mobile: string;
  role: string;
  designations: string[];
  systems: string[];
}

export const SystemAccessView: React.FC = () => {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2500);
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users-with-systems', {
        headers: { Authorization: `Bearer ${localStorage.getItem('katl_token')}` },
      });
      const data = await res.json();
      setUsers(data.users || []);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleToggleSystem = async (userId: string, systemCode: string, currentSystems: string[]) => {
    const isOn = currentSystems.includes(systemCode);
    const newSystems = isOn
      ? currentSystems.filter((s) => s !== systemCode)
      : [...currentSystems, systemCode];

    // Optimistic update
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, systems: newSystems } : u))
    );

    setSaving((prev) => ({ ...prev, [userId]: true }));
    try {
      const res = await fetch(`/api/admin/users/${userId}/systems`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('katl_token')}`,
        },
        body: JSON.stringify({ systems: newSystems }),
      });

      if (res.ok) {
        showToast(`Updated ${systemCode} for user`, true);
      } else {
        throw new Error('Save failed');
      }
    } catch {
      // Revert on error
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, systems: currentSystems } : u))
      );
      showToast('Failed to save — please try again', false);
    } finally {
      setSaving((prev) => ({ ...prev, [userId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-hotpink" />
      </div>
    );
  }

  return (
    <div className="space-y-3 relative">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl text-xs font-extrabold shadow-lg transition-all ${
            toast.ok ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Header info */}
      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex gap-2 items-start">
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
        <span>
          Toggle checkboxes to add or remove a user from a system. Changes take effect on the user's <strong>next login</strong>.
        </span>
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-2 px-1">
        <div className="flex-1" />
        {ALL_SYSTEMS.map((s) => (
          <div key={s.code} className="w-14 text-center">
            <span className="text-[10px] font-black uppercase text-navy-900 block">{s.label}</span>
            <span className="text-[9px] text-slate-400 leading-tight block">{s.desc}</span>
          </div>
        ))}
      </div>

      {/* User rows */}
      <div className="space-y-2">
        {users.map((u) => (
          <div
            key={u.id}
            className="p-3 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-3"
          >
            {/* Avatar + name */}
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-navy-100 text-navy-900 flex items-center justify-center font-extrabold text-xs flex-shrink-0">
                {u.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-sm text-navy-900 leading-tight truncate">{u.name}</h4>
                <p className="text-[11px] text-slate-500 font-medium truncate">
                  {u.designations?.[0] || u.role}
                </p>
              </div>
            </div>

            {/* System checkboxes */}
            {ALL_SYSTEMS.map((sys) => {
              const isOn = u.systems.includes(sys.code);
              const isSaving = saving[u.id];
              return (
                <button
                  key={sys.code}
                  onClick={() => handleToggleSystem(u.id, sys.code, u.systems)}
                  disabled={isSaving}
                  aria-label={`${isOn ? 'Remove' : 'Add'} ${sys.desc} for ${u.name}`}
                  className={`w-14 h-8 rounded-xl flex items-center justify-center transition-all border-2 ${
                    isOn
                      ? 'bg-navy-900 border-navy-900 text-white'
                      : 'bg-white border-slate-200 text-slate-300'
                  } ${isSaving ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
                >
                  {isSaving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : isOn ? (
                    <Check className="w-3.5 h-3.5" strokeWidth={3} />
                  ) : (
                    <span className="w-3.5 h-3.5 rounded border-2 border-slate-300 block" />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <p className="text-[11px] text-center text-slate-400 pt-2">
        {users.length} staff members · Changes are saved instantly
      </p>
    </div>
  );
};
