import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Users, Key, Plus, CheckCircle2, MessageSquare, Database, Calendar } from 'lucide-react';

export const MandateManageView: React.FC = () => {
  const { t } = useLanguage();
  const [users, setUsers] = useState<any[]>([]);
  const [helpSlips, setHelpSlips] = useState<any[]>([]);
  const [masterLists, setMasterLists] = useState<Record<string, string[]>>({});
  const [selectedListKey, setSelectedListKey] = useState('customers');
  const [newMasterItem, setNewMasterItem] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'slips' | 'masters'>('users');
  const [tempPinData, setTempPinData] = useState<{ name: string; pin: string } | null>(null);
  const [replyingSlipId, setReplyingSlipId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [uRes, hsRes, mRes] = await Promise.all([
        fetch('/api/admin/users', { headers: { Authorization: `Bearer ${localStorage.getItem('katl_token')}` } }),
        fetch('/api/help-slips', { headers: { Authorization: `Bearer ${localStorage.getItem('katl_token')}` } }),
        fetch('/api/admin/master-lists', { headers: { Authorization: `Bearer ${localStorage.getItem('katl_token')}` } }),
      ]);

      const [uData, hsData, mData] = await Promise.all([uRes.json(), hsRes.json(), mRes.json()]);
      setUsers(uData.users || []);
      setHelpSlips(hsData.help_slips || []);
      setMasterLists(mData.master_lists || {});
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleResetPin = async (userId: string, userName: string) => {
    try {
      const res = await fetch('/api/auth/reset-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('katl_token')}`,
        },
        body: JSON.stringify({ target_user_id: userId }),
      });
      const data = await res.json();
      if (res.ok && data.temp_pin) {
        setTempPinData({ name: userName, pin: data.temp_pin });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAnswerHelpSlip = async (slipId: string) => {
    if (!replyText.trim()) return;
    try {
      await fetch(`/api/help-slips/${slipId}/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('katl_token')}`,
        },
        body: JSON.stringify({ answer_text: replyText }),
      });

      setReplyingSlipId(null);
      setReplyText('');
      fetchAdminData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddMasterItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMasterItem.trim()) return;

    try {
      await fetch('/api/admin/master-lists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('katl_token')}`,
        },
        body: JSON.stringify({
          list_key: selectedListKey,
          item_value: newMasterItem.trim(),
        }),
      });

      setNewMasterItem('');
      fetchAdminData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-4 pb-20 max-w-md mx-auto px-4 pt-4">
      <div>
        <h2 className="text-xl font-extrabold text-navy-900">{t.navManage}</h2>
        <p className="text-xs font-medium text-slate-500">Master Operations: Staff, PIN Resets & Master Lists</p>
      </div>

      {/* Sub Tabs */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-slate-200/80 rounded-2xl text-xs font-extrabold">
        <button
          onClick={() => setActiveTab('users')}
          className={`py-2 rounded-xl transition ${
            activeTab === 'users' ? 'bg-navy-900 text-white shadow-sm' : 'text-slate-600'
          }`}
        >
          Staff & PINs
        </button>
        <button
          onClick={() => setActiveTab('slips')}
          className={`py-2 rounded-xl transition relative ${
            activeTab === 'slips' ? 'bg-navy-900 text-white shadow-sm' : 'text-slate-600'
          }`}
        >
          Help Slips {helpSlips.filter((s) => s.status === 'ASKED').length > 0 && '🔴'}
        </button>
        <button
          onClick={() => setActiveTab('masters')}
          className={`py-2 rounded-xl transition ${
            activeTab === 'masters' ? 'bg-navy-900 text-white shadow-sm' : 'text-slate-600'
          }`}
        >
          Master Lists
        </button>
      </div>

      {/* Temporary PIN Popup Modal */}
      {tempPinData && (
        <div className="p-4 rounded-2xl bg-navy-900 text-white space-y-3 shadow-lg animate-fadeIn border border-navy-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-hotpink uppercase">PIN Reset Successfully</span>
            <button onClick={() => setTempPinData(null)} className="text-xs text-slate-400">Close</button>
          </div>
          <p className="text-xs text-slate-300">
            Temporary 4-digit PIN for <strong>{tempPinData.name}</strong>:
          </p>
          <div className="text-3xl font-black tracking-widest text-center py-2 bg-navy-950 rounded-xl text-hotpink border border-navy-800">
            {tempPinData.pin}
          </div>
          <p className="text-[11px] text-slate-400 italic text-center">
            Valid for 24 hours. Staff will be asked to choose their own permanent PIN upon login.
          </p>
        </div>
      )}

      {/* TAB 1: Staff & PIN Management */}
      {activeTab === 'users' && (
        <div className="space-y-2.5">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            All Staff Members ({users.length})
          </div>

          <div className="space-y-2">
            {users.map((u) => (
              <div key={u.id} className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-navy-100 text-navy-900 flex items-center justify-center font-extrabold text-sm">
                    {u.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-navy-900 leading-tight">{u.name}</h4>
                    <p className="text-xs text-slate-500 font-medium">{u.designations?.[0] || u.role} · {u.mobile}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleResetPin(u.id, u.name)}
                  className="min-h-[40px] px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-navy-900 text-xs font-extrabold flex items-center gap-1 transition"
                >
                  <Key className="w-3.5 h-3.5 text-hotpink" />
                  <span>Reset PIN</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: Help Slips Desk */}
      {activeTab === 'slips' && (
        <div className="space-y-3">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Open Help Slips ({helpSlips.filter((s) => s.status === 'ASKED').length} Pending)
          </div>

          {helpSlips.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <h4 className="font-bold text-sm text-navy-900">No open help slips</h4>
            </div>
          ) : (
            helpSlips.map((slip) => (
              <div key={slip.id} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-navy-900">From: {slip.raised_by_name}</span>
                  <span className="text-[11px] text-slate-400">
                    {new Date(slip.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                </div>

                {slip.text_content && (
                  <p className="text-sm font-medium text-slate-800">{slip.text_content}</p>
                )}

                {slip.audio_url && (
                  <audio controls src={slip.audio_url} className="w-full h-8" />
                )}

                {slip.status === 'ANSWERED' ? (
                  <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs font-semibold text-emerald-900">
                    Answered: {slip.answer_text}
                  </div>
                ) : replyingSlipId === slip.id ? (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <textarea
                      rows={2}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type simple instructions here..."
                      className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:border-hotpink outline-none resize-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setReplyingSlipId(null)} className="px-3 py-1.5 text-xs font-bold text-slate-500">
                        Cancel
                      </button>
                      <button
                        onClick={() => handleAnswerHelpSlip(slip.id)}
                        className="px-4 py-1.5 rounded-xl bg-hotpink text-white text-xs font-extrabold"
                      >
                        Send Answer
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setReplyingSlipId(slip.id); setReplyText(''); }}
                    className="w-full min-h-[40px] rounded-xl bg-navy-900 text-white font-extrabold text-xs flex items-center justify-center gap-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-hotpink" />
                    <span>Answer Help Slip</span>
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: Master Lists */}
      {activeTab === 'masters' && (
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {Object.keys(masterLists).map((k) => (
              <button
                key={k}
                onClick={() => setSelectedListKey(k)}
                className={`px-3 py-1.5 text-xs font-extrabold rounded-xl uppercase tracking-wider whitespace-nowrap transition ${
                  selectedListKey === k ? 'bg-hotpink text-white' : 'bg-white border border-slate-200 text-slate-600'
                }`}
              >
                {k}
              </button>
            ))}
          </div>

          <form onSubmit={handleAddMasterItem} className="flex gap-2">
            <input
              type="text"
              required
              placeholder={`Add new ${selectedListKey} item...`}
              value={newMasterItem}
              onChange={(e) => setNewMasterItem(e.target.value)}
              className="flex-1 min-h-[44px] px-3 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:border-hotpink outline-none"
            />
            <button
              type="submit"
              className="px-4 rounded-xl bg-navy-900 text-white text-xs font-extrabold"
            >
              Add
            </button>
          </form>

          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <h4 className="text-xs font-bold uppercase text-slate-400">{selectedListKey} List</h4>
            <div className="divide-y divide-slate-100">
              {masterLists[selectedListKey]?.map((item, idx) => (
                <div key={idx} className="py-2 text-xs font-semibold text-navy-900 flex items-center justify-between">
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
