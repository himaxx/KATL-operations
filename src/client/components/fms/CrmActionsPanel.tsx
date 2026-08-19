import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle2, Truck, Send, AlertCircle, RefreshCw, X, ChevronRight } from 'lucide-react';
import { WhatsAppButton } from './WhatsAppButton';
import { whatsappTemplates } from '../../../fms';

interface CrmActionItem {
  id: string;
  flow_id: string;
  action_type: 'DISPATCH_25' | 'DISPATCH_50' | 'DISPATCH_70';
  display_number: string;
  customer_name: string;
  customer_mobile: string;
  agent_name: string;
  transport: string;
  total_quantity: number;
  total_dispatched: number;
  dispatch_percent: number;
  dispatches: any[];
  lr_number?: string;
  triggered_at: string;
}

interface CrmActionsPanelProps {
  onClose?: () => void;
  onActionCompleted?: () => void;
}

export const CrmActionsPanel: React.FC<CrmActionsPanelProps> = ({ onClose, onActionCompleted }) => {
  const [actions, setActions] = useState<CrmActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lrInputs, setLrInputs] = useState<Record<string, string>>({});
  const [completingId, setCompletingId] = useState<string | null>(null);

  const fetchActions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/fms/o2c/crm-actions', {
        headers: { Authorization: `Bearer ${localStorage.getItem('katl_token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        setActions(data.crm_actions || []);
      }
    } catch (e) {
      console.error('Error loading CRM actions', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActions();
  }, []);

  const handleMarkDone = async (action: CrmActionItem) => {
    setCompletingId(action.id);
    try {
      const res = await fetch('/api/fms/o2c/complete-crm-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('katl_token')}`,
        },
        body: JSON.stringify({
          action_id: action.id,
          lr_number: lrInputs[action.id] || action.lr_number || null,
          customer_sent: true,
          agent_sent: true,
        }),
      });

      if (res.ok) {
        setActions((prev) => prev.filter((a) => a.id !== action.id));
        if (onActionCompleted) onActionCompleted();
      }
    } catch (e) {
      console.error('Failed to complete CRM action', e);
    } finally {
      setCompletingId(null);
    }
  };

  const getMilestoneBadge = (type: string) => {
    switch (type) {
      case 'DISPATCH_25':
        return <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-extrabold text-[10px] border border-blue-200">25% Dispatch Milestone</span>;
      case 'DISPATCH_50':
        return <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-extrabold text-[10px] border border-amber-200">50% Dispatch Milestone</span>;
      case 'DISPATCH_70':
        return <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-extrabold text-[10px] border border-emerald-200">70% Dispatch Milestone</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-pink-brand/10 text-pink-brand flex items-center justify-center font-bold">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-navy-900 leading-tight">CRM Action Items</h3>
            <p className="text-[11px] text-slate-500">Dispatch % notifications for Customer &amp; Agent</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchActions}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 active:scale-95 transition text-xs"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 active:scale-95 transition text-xs"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* List of Action Items */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 bg-white rounded-2xl animate-pulse border border-slate-200" />
          ))}
        </div>
      ) : actions.length === 0 ? (
        <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center space-y-2">
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <p className="font-bold text-sm text-navy-900">All CRM Actions Completed!</p>
          <p className="text-xs text-slate-400">No pending milestone notifications for dispatch.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {actions.map((act) => {
            const lrVal = lrInputs[act.id] !== undefined ? lrInputs[act.id] : act.lr_number || '';
            const msgData = {
              customerName: act.customer_name,
              orderNumber: act.display_number,
              totalQuantity: act.total_quantity,
              dispatchedQuantity: act.total_dispatched,
              dispatchPercent: act.dispatch_percent,
              transportName: act.transport,
              lrNumber: lrVal,
            };

            const customerMsg =
              act.action_type === 'DISPATCH_25'
                ? whatsappTemplates.dispatch25(msgData)
                : act.action_type === 'DISPATCH_50'
                ? whatsappTemplates.dispatch50(msgData)
                : whatsappTemplates.dispatch70(msgData);

            return (
              <div
                key={act.id}
                className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3"
              >
                {/* Header Row */}
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-navy-900 text-white font-black text-xs">
                    {act.display_number}
                  </span>
                  {getMilestoneBadge(act.action_type)}
                </div>

                {/* Customer Details */}
                <div>
                  <h4 className="font-extrabold text-sm text-navy-900">{act.customer_name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Dispatched: <strong className="text-navy-900">{act.total_dispatched}</strong> / {act.total_quantity} Pcs ({act.dispatch_percent}%)
                  </p>
                </div>

                {/* Optional LR Number Input */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    LR / Bilty Number (if requested by party)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. LR-98712"
                    value={lrVal}
                    onChange={(e) => setLrInputs({ ...lrInputs, [act.id]: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-navy-900 outline-none focus:border-pink-brand"
                  />
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-1 gap-2 pt-1 border-t border-slate-100">
                  <WhatsAppButton
                    phone={act.customer_mobile}
                    message={customerMsg}
                    label="📲 Send Update to Customer (WhatsApp)"
                  />

                  <button
                    type="button"
                    onClick={() => handleMarkDone(act)}
                    disabled={completingId === act.id}
                    className="w-full py-2.5 px-4 rounded-xl bg-navy-900 hover:bg-navy-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-98 disabled:opacity-50 shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{completingId === act.id ? 'Marking Done...' : 'Mark as Sent & Done'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
