import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  Play,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  ExternalLink,
  Plus,
  Check,
  Phone,
  Image as ImageIcon,
  AlertTriangle,
  Truck,
  TrendingUp,
  PackageCheck,
  Layers,
} from 'lucide-react';
import { WorkItem } from './UniversalWorkCard';

interface WorkModalProps {
  item: WorkItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const WorkModal: React.FC<WorkModalProps> = ({ item, isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const [fmsFlow, setFmsFlow] = useState<any>(null);
  const [fmsDef, setFmsDef] = useState<any>(null);
  const [masterLists, setMasterLists] = useState<Record<string, string[]>>({});
  const [detailedLists, setDetailedLists] = useState<Record<string, any[]>>({});
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dynamic add master list inline state
  const [showAddMasterModal, setShowAddMasterModal] = useState(false);
  const [addListKey, setAddListKey] = useState<string>('');
  const [newItemValue, setNewItemValue] = useState('');
  const [newAgentPhone, setNewAgentPhone] = useState('');
  const [addingMaster, setAddingMaster] = useState(false);

  // O2D Step 2 Local Dispatch States
  const [o2dBillNo, setO2dBillNo] = useState('');
  const [o2dCustomerVerified, setO2dCustomerVerified] = useState('Yes Correct');
  const [o2dQtyDispatched, setO2dQtyDispatched] = useState('');
  const [o2dTransport, setO2dTransport] = useState('');
  const [o2dDispatches, setO2dDispatches] = useState<any[]>([]);
  const [o2dTotalDispatched, setO2dTotalDispatched] = useState<number>(0);
  const [o2dPercent, setO2dPercent] = useState<number>(0);
  const [o2dSavingBatch, setO2dSavingBatch] = useState(false);

  const fetchMasterData = async () => {
    try {
      const res = await fetch('/api/admin/master-lists', {
        headers: { Authorization: `Bearer ${localStorage.getItem('katl_token')}` },
      });
      const data = await res.json();
      setMasterLists(data.master_lists || {});
      setDetailedLists(data.detailed_lists || {});
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!item || !isOpen) return;
    setError(null);
    setFormData({});
    setNotes('');
    setO2dBillNo('');
    setO2dCustomerVerified('Yes Correct');
    setO2dQtyDispatched('');
    setO2dTransport('');

    // Mark first opened in backend for bottleneck analysis
    fetch(`/api/work-items/${item.id}/open`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('katl_token')}` },
    });

    if (item.source_module === 'fms' && item.source_ref_id) {
      setLoading(true);
      Promise.all([
        fetch(`/api/fms/flows/${item.source_ref_id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('katl_token')}` },
        }).then((r) => r.json()),
        fetch('/api/fms/definitions', {
          headers: { Authorization: `Bearer ${localStorage.getItem('katl_token')}` },
        }).then((r) => r.json()),
        fetchMasterData(),
      ])
        .then(([flowData, defsData]) => {
          const flow = flowData.flow;
          setFmsFlow(flow);
          const def = defsData.definitions?.find((d: any) => d.code === item.fms_code);
          setFmsDef(def);

          // If O2D flow, init dispatches
          if (flow?.all_form_data) {
            const disps = Array.isArray(flow.all_form_data.dispatches) ? flow.all_form_data.dispatches : [];
            setO2dDispatches(disps);
            const totalDispatched = Number(flow.all_form_data.total_dispatched) || 0;
            const totalOrdered = Number(flow.all_form_data.quantity) || 0;
            setO2dTotalDispatched(totalDispatched);
            setO2dPercent(totalOrdered > 0 ? (totalDispatched / totalOrdered) * 100 : 0);
            if (flow.all_form_data.transport && !o2dTransport) {
              setO2dTransport(flow.all_form_data.transport);
            }
          }
          if (item.fms_code === 'O2D' && item.step_no === 3) {
            setFormData({
              order_80_percent_dispatched: 'Yes / Haan',
              confirmed_by_name: user?.name || '',
            });
          }
        })
        .finally(() => setLoading(false));
    }
  }, [item, isOpen]);

  if (!isOpen || !item) return null;

  const title =
    (language === 'hi' || language === 'hi_ro') && item.title_hi ? item.title_hi : item.title_en;
  const currentStepDef = fmsDef?.steps?.find((s: any) => s.step_no === item.step_no);

  const handleAddNewMasterItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemValue.trim()) return;

    setAddingMaster(true);
    try {
      const extra: any = {};
      if (addListKey === 'agents' && newAgentPhone.trim()) {
        extra.phone = newAgentPhone.trim();
      }

      const res = await fetch('/api/master-lists/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('katl_token')}`,
        },
        body: JSON.stringify({
          list_key: addListKey,
          item_value: newItemValue.trim(),
          extra,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add item');

      await fetchMasterData();
      if (addListKey === 'transports') {
        setO2dTransport(newItemValue.trim());
      } else {
        setFormData({ ...formData, [addListKey === 'agents' ? 'agent_name' : 'fabric_name']: newItemValue.trim() });
      }
      setShowAddMasterModal(false);
      setNewItemValue('');
      setNewAgentPhone('');
    } catch (err: any) {
      alert(err.message || 'Error adding item');
    } finally {
      setAddingMaster(false);
    }
  };

  // Helper to find agent phone number for WhatsApp in Step 3 (PUR)
  const getAgentPhone = () => {
    const agentName = fmsFlow?.all_form_data?.agent_name || '';
    if (!agentName) return '9165072008';

    const agentObj = detailedLists['agents']?.find(
      (a) => a.value?.toLowerCase() === agentName.toLowerCase()
    );
    if (agentObj?.extra?.phone) return agentObj.extra.phone;

    if (agentName.toLowerCase().includes('mansi')) return '9165072008';
    if (agentName.toLowerCase().includes('shekhani')) return '8109385126';
    return '';
  };

  const handleSendWhatsApp = () => {
    const rawPhone = getAgentPhone();
    const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
    const phoneWithCode = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const poNumber = fmsFlow?.display_number || 'PO';
    const fabricName = fmsFlow?.all_form_data?.fabric_name || 'Fabric';

    const message = `Hey, this is the PO number : ${poNumber} of ${fabricName}`;
    const url = phoneWithCode
      ? `https://wa.me/${phoneWithCode}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(url, '_blank');
  };

  // O2D Step 2: Save Dispatch Entry Batch
  const handleSaveO2DDispatchBatch = async (isMarkingComplete: boolean = false) => {
    setError(null);
    if (!isMarkingComplete && (!o2dBillNo.trim() || !o2dQtyDispatched || Number(o2dQtyDispatched) <= 0)) {
      setError('Please enter a valid Bill No. and Dispatch Quantity (Pcs)');
      return;
    }

    setO2dSavingBatch(true);
    try {
      let updatedTotal = o2dTotalDispatched;
      let updatedPercent = o2dPercent;
      let updatedDispatches = [...o2dDispatches];

      if (o2dBillNo.trim() && Number(o2dQtyDispatched) > 0) {
        const res = await fetch('/api/fms/o2d/add-dispatch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('katl_token')}`,
          },
          body: JSON.stringify({
            flow_id: item.source_ref_id,
            dispatch_entry: {
              bill_no: o2dBillNo.trim(),
              customer_verified: o2dCustomerVerified,
              qty_dispatched: Number(o2dQtyDispatched),
              transport: o2dTransport || fmsFlow?.all_form_data?.transport || '',
            },
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to save dispatch');

        updatedTotal = data.total_dispatched;
        updatedPercent = data.dispatch_percent;
        updatedDispatches = data.dispatches;

        setO2dTotalDispatched(updatedTotal);
        setO2dPercent(updatedPercent);
        setO2dDispatches(updatedDispatches);

        // Reset batch input fields
        setO2dBillNo('');
        setO2dQtyDispatched('');

        // If auto-advance threshold (>120%) exceeded
        if (data.auto_advance) {
          await handleSubmitStepDirect({
            total_dispatched: updatedTotal,
            dispatch_percent: updatedPercent,
            auto_closed_due_to_threshold: true,
          });
          return;
        }
      }

      if (isMarkingComplete) {
        await handleSubmitStepDirect({
          total_dispatched: updatedTotal,
          dispatch_percent: updatedPercent,
          completed_by_user: true,
        });
        return;
      }

      // If just saving a batch (< 80%), close modal or notify success
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Error saving dispatch');
    } finally {
      setO2dSavingBatch(false);
    }
  };

  const handleRemoveO2DDispatchBatch = async (dispatchId: string) => {
    try {
      const res = await fetch('/api/fms/o2d/remove-dispatch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('katl_token')}`,
        },
        body: JSON.stringify({
          flow_id: item.source_ref_id,
          dispatch_id: dispatchId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove batch');

      setO2dTotalDispatched(data.total_dispatched);
      setO2dPercent(data.dispatch_percent);
      setO2dDispatches(data.dispatches);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Error removing batch');
    }
  };

  const handleSubmitStepDirect = async (overrideFormData?: any) => {
    setLoading(true);
    try {
      const res = await fetch('/api/fms/submit-step', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('katl_token')}`,
        },
        body: JSON.stringify({
          flow_id: item.source_ref_id,
          step_no: item.step_no,
          form_data: overrideFormData || formData,
          work_item_id: item.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to advance step');

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Submission error');
    } finally {
      setLoading(false);
    }
  };

  // Validation before submit for standard forms
  const validateBeforeSubmit = () => {
    if (item.source_module === 'fms' && item.fms_code === 'PUR') {
      if (item.step_no === 5) {
        if (
          formData.rate_check_ok !== 'Yes / Haan' ||
          formData.discount_check_ok !== 'Yes / Haan' ||
          formData.tally_entry_done !== 'Yes / Haan'
        ) {
          setError('Bill verification incomplete: Rate, Discount %, and Tally entry must all be verified "Yes / Haan" to proceed.');
          return false;
        }
      }

      if (item.step_no === 3 && formData.po_sent_confirmation !== 'Yes') {
        setError('Please confirm that you have sent the PO number before submitting.');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateBeforeSubmit()) return;

    setLoading(true);
    setError(null);

    try {
      if (item.source_module === 'fms') {
        await handleSubmitStepDirect(formData);
      } else {
        // Checklist or Delegation
        const res = await fetch(`/api/work-items/${item.id}/complete`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('katl_token')}`,
          },
          body: JSON.stringify({ notes }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to complete task');
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Submission error');
    } finally {
      setLoading(false);
    }
  };

  const isO2DStep2 = item.source_module === 'fms' && item.fms_code === 'O2D' && item.step_no === 2;
  const isO2DStep3 = item.source_module === 'fms' && item.fms_code === 'O2D' && item.step_no === 3;
  const isPurStep3 = item.source_module === 'fms' && item.fms_code === 'PUR' && item.step_no === 3;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#1A1F36]/60 backdrop-blur-sm animate-slide-up p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#E8ECF0] flex items-center justify-between bg-gradient-to-r from-navy-900 to-navy-800 text-white">
          <div>
            <span className="text-[10px] uppercase font-black tracking-wider text-pink-brand">
              {item.source_module === 'fms'
                ? `${fmsDef?.name?.en || item.fms_code} • Step ${item.step_no}`
                : item.source_module.toUpperCase()}
            </span>
            <h2 className="text-base font-extrabold text-white line-clamp-1 mt-0.5">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-[#FFF5F8] border border-[#F9BFDF] text-[#9F0E5A] text-xs font-bold flex items-center gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-pink-brand shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Context Overview Card for FMS Flows */}
          {item.source_module === 'fms' && fmsFlow && (
            <div className="p-3.5 rounded-2xl bg-[#F8F9FB] border border-[#E8ECF0] text-xs space-y-2">
              <div className="font-extrabold text-navy-900 text-xs border-b border-[#E8ECF0] pb-1.5 flex justify-between items-center">
                <span className="bg-navy-900 text-white px-2 py-0.5 rounded text-[11px]">
                  {fmsFlow.display_number}
                </span>
                <span className="text-[#6B7280]">
                  Step {item.step_no} of {fmsDef?.steps?.length || 3}
                </span>
              </div>

              {fmsFlow.all_form_data && (
                <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                  {fmsFlow.all_form_data.customer_name && (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#9CA3AF] block">Customer</span>
                      <span className="font-extrabold text-navy-900">{fmsFlow.all_form_data.customer_name}</span>
                    </div>
                  )}
                  {fmsFlow.all_form_data.fabric_name && (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#9CA3AF] block">Fabric</span>
                      <span className="font-extrabold text-navy-900">{fmsFlow.all_form_data.fabric_name}</span>
                    </div>
                  )}
                  {fmsFlow.all_form_data.quantity && (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#9CA3AF] block">Total Ordered</span>
                      <span className="font-extrabold text-navy-900">{fmsFlow.all_form_data.quantity} Pcs</span>
                    </div>
                  )}
                  {fmsFlow.all_form_data.products_ordered && (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#9CA3AF] block">Products</span>
                      <span className="font-bold text-navy-900">
                        {Array.isArray(fmsFlow.all_form_data.products_ordered)
                          ? fmsFlow.all_form_data.products_ordered.join(', ')
                          : fmsFlow.all_form_data.products_ordered}
                      </span>
                    </div>
                  )}
                  {fmsFlow.all_form_data.transport && (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#9CA3AF] block">Transport</span>
                      <span className="font-bold text-navy-900">{fmsFlow.all_form_data.transport}</span>
                    </div>
                  )}
                  {fmsFlow.all_form_data.agent_name && (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#9CA3AF] block">Agent</span>
                      <span className="font-bold text-navy-900">{fmsFlow.all_form_data.agent_name}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* O2D STEP 2 CUSTOM UI: Akash Soni Multi-Dispatch Staggered Batch Entry */}
          {/* ========================================================================= */}
          {isO2DStep2 && (
            <div className="space-y-4">
              {/* Live Dispatch Progress Bar */}
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs font-extrabold text-navy-900">
                  <span className="flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-amber-600" />
                    Dispatch Progress
                  </span>
                  <span className={o2dPercent >= 80 ? 'text-emerald-700' : 'text-amber-700'}>
                    {o2dTotalDispatched} / {Number(fmsFlow?.all_form_data?.quantity) || 0} Pcs ({Math.round(o2dPercent)}%)
                  </span>
                </div>
                <div className="w-full h-3 bg-amber-200/50 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      o2dPercent >= 100
                        ? 'bg-emerald-500'
                        : o2dPercent >= 80
                        ? 'bg-emerald-400'
                        : 'bg-pink-brand'
                    }`}
                    style={{ width: `${Math.min(100, o2dPercent)}%` }}
                  />
                </div>
                {o2dPercent >= 80 && (
                  <p className="text-[11px] font-bold text-emerald-700">
                    ✓ Threshold reached (&ge; 80%). You can now mark dispatch completed or log additional batches.
                  </p>
                )}
              </div>

              {/* Existing Dispatch Batches Log */}
              {o2dDispatches.length > 0 && (
                <div>
                  <h4 className="text-xs font-black text-navy-900 uppercase tracking-wider mb-2">
                    Logged Dispatch Batches ({o2dDispatches.length})
                  </h4>
                  <div className="space-y-2 max-h-36 overflow-y-auto">
                    {o2dDispatches.map((d: any, idx: number) => (
                      <div
                        key={d.id || idx}
                        className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between gap-2"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-navy-900 truncate">Bill: {d.bill_no}</p>
                          <p className="text-[10px] text-slate-400">
                            {new Date(d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {d.transport || 'Transport'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-black text-navy-900 text-xs bg-slate-200/70 px-2 py-1 rounded-lg">
                            {d.qty_dispatched} Pcs
                          </span>
                          <button
                            type="button"
                            title="Remove Batch"
                            onClick={() => handleRemoveO2DDispatchBatch(d.id)}
                            className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New Batch Input Form */}
              <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-xs">
                <h4 className="text-xs font-black text-navy-900 uppercase tracking-wider">
                  + Enter New Dispatch Batch
                </h4>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Bill No. / Challan No. *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BILL-4402"
                    value={o2dBillNo}
                    onChange={(e) => setO2dBillNo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-navy-900 outline-none focus:border-pink-brand"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Customer Name Cross-Check *</label>
                  <select
                    value={o2dCustomerVerified}
                    onChange={(e) => setO2dCustomerVerified(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-navy-900 outline-none focus:border-pink-brand"
                  >
                    <option value="Yes Correct">Yes Correct (नाम सही है)</option>
                    <option value="No Not Match">No Not Match (नाम मेल नहीं खाता)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Dispatch Qty (Pcs) *</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 200"
                      value={o2dQtyDispatched}
                      onChange={(e) => setO2dQtyDispatched(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-navy-900 outline-none focus:border-pink-brand"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-700">Transport</label>
                      <button
                        type="button"
                        onClick={() => {
                          setAddListKey('transports');
                          setShowAddMasterModal(true);
                        }}
                        className="text-[10px] font-bold text-pink-brand hover:underline"
                      >
                        + Add
                      </button>
                    </div>
                    <select
                      value={o2dTransport}
                      onChange={(e) => setO2dTransport(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-navy-900 outline-none focus:border-pink-brand"
                    >
                      <option value="">Default ({fmsFlow?.all_form_data?.transport || 'Transport'})</option>
                      {(masterLists['transports'] || []).map((tr) => (
                        <option key={tr} value={tr}>
                          {tr}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Batch Action Buttons */}
                <div className="pt-2 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={o2dSavingBatch}
                      onClick={() => handleSaveO2DDispatchBatch(false)}
                      className="flex-1 py-3 rounded-xl bg-pink-brand hover:bg-[#C4177A] text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition active:scale-98 shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{o2dSavingBatch ? 'Saving...' : '+ Save & Add More'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onSuccess();
                        onClose();
                      }}
                      className="py-3 px-4 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold text-xs flex items-center justify-center gap-1.5 transition active:scale-98"
                    >
                      <X className="w-4 h-4" />
                      <span>Close / Back</span>
                    </button>
                  </div>

                  {o2dPercent >= 80 && (
                    <button
                      type="button"
                      disabled={o2dSavingBatch}
                      onClick={() => handleSaveO2DDispatchBatch(true)}
                      className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition active:scale-98"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Dispatch Completed (हस्तांतरित करें KR / हिमांशु को)</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* O2D STEP 3 CUSTOM UI: KR / Himanshu Gurjar Complete the Order */}
          {/* ========================================================================= */}
          {isO2DStep3 && (
            <div className="space-y-4">
              <div className="p-4 bg-purple-50/80 border border-purple-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-purple-900 uppercase">
                    Step 3 • Order Settlement &amp; Closure
                  </span>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Dispatched: {o2dTotalDispatched} / {fmsFlow?.all_form_data?.quantity} Pcs ({Math.round(o2dPercent)}%)
                  </span>
                </div>

                {/* Dispatch history summary */}
                <div className="p-3 bg-white rounded-xl border border-purple-200 text-xs space-y-1.5 max-h-36 overflow-y-auto">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Dispatch Batches Verified:</span>
                  {o2dDispatches.map((d: any, idx: number) => (
                    <div key={idx} className="flex justify-between border-b border-slate-100 pb-1 text-slate-700">
                      <span>Bill: {d.bill_no} ({d.transport})</span>
                      <strong>{d.qty_dispatched} Pcs</strong>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 pt-1">
                  <label className="block text-xs font-extrabold text-navy-900">
                    Order 80% se jyada dispatch hogaya? <span className="text-pink-brand">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Yes / Haan', 'No / Nahi'].map((opt) => {
                      const isSelected = formData.order_80_percent_dispatched === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setFormData({ ...formData, order_80_percent_dispatched: opt })}
                          className={`py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition ${
                            isSelected
                              ? 'bg-navy-900 text-white shadow-xs'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-extrabold text-navy-900">
                    Your Name (Confirmer) <span className="text-pink-brand">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.confirmed_by_name || ''}
                    onChange={(e) => setFormData({ ...formData, confirmed_by_name: e.target.value })}
                    placeholder="Enter your name (e.g. KR / Himanshu)"
                    className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs font-bold text-navy-900 outline-none focus:border-pink-brand"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PURCHASE FMS STEP 3: Sapna Sahu WhatsApp Action */}
          {/* ========================================================================= */}
          {isPurStep3 && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-purple-900 uppercase">
                  Step 3 • WhatsApp Dispatch
                </span>
                <span className="text-xs font-bold text-purple-700">
                  Agent: {fmsFlow?.all_form_data?.agent_name || 'Supplier'}
                </span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-purple-200 text-xs space-y-1">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Prefilled Message:</span>
                <p className="font-semibold text-slate-800 italic">
                  "Hey, this is the PO number : {fmsFlow?.display_number} of {fmsFlow?.all_form_data?.fabric_name}"
                </p>
              </div>

              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-98"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Send to WhatsApp (व्हाट्सएप पर भेजें)</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </button>

              <div className="pt-2 border-t border-purple-200 space-y-2">
                <label className="block text-xs font-extrabold text-navy-900">
                  Have you sent the PO number? (क्या आपने भेज दिया?) <span className="text-pink-brand">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, po_sent_confirmation: 'Yes' })}
                    className={`py-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition ${
                      formData.po_sent_confirmation === 'Yes'
                        ? 'bg-navy-900 text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {formData.po_sent_confirmation === 'Yes' && <Check className="w-4 h-4" />}
                    Yes, Sent &amp; Done
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, po_sent_confirmation: 'No' })}
                    className={`py-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition ${
                      formData.po_sent_confirmation === 'No'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    No, Not Yet
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* REGULAR FMS STEPS / CHECKLIST FORMS */}
          {/* ========================================================================= */}
          {!isO2DStep2 && !isO2DStep3 && !isPurStep3 && (
            <form id="work-form" onSubmit={handleSubmit} className="space-y-4">
              {item.source_module === 'fms' && currentStepDef ? (
                currentStepDef.questions.map((q: any) => {
                  const label =
                    (language === 'hi' || language === 'hi_ro') && q.label.hi ? q.label.hi : q.label.en;

                  // Master list dropdown
                  if (q.type === 'master_list') {
                    const listItems = masterLists[q.master_list_key || ''] || [];
                    return (
                      <div key={q.key} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold text-[#374151]">
                            {label} {q.required && <span className="text-pink-brand">*</span>}
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setAddListKey(q.master_list_key || 'agents');
                              setShowAddMasterModal(true);
                            }}
                            className="text-xs font-bold text-pink-brand hover:underline flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Add New
                          </button>
                        </div>

                        <select
                          required={q.required}
                          value={formData[q.key] || ''}
                          onChange={(e) => {
                            if (e.target.value === '__ADD_NEW__') {
                              setAddListKey(q.master_list_key || 'agents');
                              setShowAddMasterModal(true);
                            } else {
                              setFormData({ ...formData, [q.key]: e.target.value });
                            }
                          }}
                          className="w-full min-h-[48px] px-3.5 bg-[#F9FAFB] border border-[#E8ECF0] rounded-xl text-sm font-semibold text-navy-900 focus:bg-white focus:border-pink-brand outline-none"
                        >
                          <option value="">Select {q.master_list_key || 'item'}...</option>
                          {listItems.map((itemVal: string) => (
                            <option key={itemVal} value={itemVal}>
                              {itemVal}
                            </option>
                          ))}
                          <option value="__ADD_NEW__">+ Add New / नया जोड़ें...</option>
                        </select>
                      </div>
                    );
                  }

                  // 2-Option Radio / Button Selector (Yes/No, Pass/Fail)
                  if (q.type === 'select' && q.options?.length === 2) {
                    return (
                      <div key={q.key} className="space-y-1.5">
                        <label className="block text-xs font-bold text-[#374151]">
                          {label} {q.required && <span className="text-pink-brand">*</span>}
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {q.options.map((opt: string) => {
                            const isSelected = formData[q.key] === opt;
                            const isPositive =
                              opt.includes('Passed') || opt.includes('Yes') || opt.includes('Haan') || opt.includes('OK');
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setFormData({ ...formData, [q.key]: opt })}
                                className={`py-3 px-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 border transition ${
                                  isSelected
                                    ? isPositive
                                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                      : 'bg-rose-600 text-white border-rose-600 shadow-sm'
                                    : 'bg-[#F9FAFB] border-[#E8ECF0] text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                {isSelected && <Check className="w-4 h-4" />}
                                <span>{opt}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  // Regular select
                  if (q.type === 'select') {
                    return (
                      <div key={q.key} className="space-y-1.5">
                        <label className="block text-xs font-bold text-[#374151]">
                          {label} {q.required && <span className="text-pink-brand">*</span>}
                        </label>
                        <select
                          required={q.required}
                          value={formData[q.key] || ''}
                          onChange={(e) => setFormData({ ...formData, [q.key]: e.target.value })}
                          className="w-full min-h-[48px] px-3.5 py-2 bg-[#F9FAFB] border border-[#E8ECF0] rounded-xl text-sm font-semibold text-navy-900 focus:bg-white focus:border-pink-brand outline-none"
                        >
                          <option value="">Select an option...</option>
                          {q.options?.map((opt: string) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  }

                  // Inputs (number, text, date)
                  return (
                    <div key={q.key} className="space-y-1.5">
                      <label className="block text-xs font-bold text-[#374151]">
                        {label} {q.required && <span className="text-pink-brand">*</span>}
                      </label>
                      <input
                        type={q.type === 'number' ? 'number' : q.type === 'date' ? 'date' : 'text'}
                        step={q.type === 'number' ? 'any' : undefined}
                        required={q.required}
                        value={formData[q.key] ?? ''}
                        onChange={(e) => setFormData({ ...formData, [q.key]: e.target.value })}
                        placeholder={label}
                        className="w-full min-h-[48px] px-4 bg-[#F9FAFB] border border-[#E8ECF0] rounded-xl text-sm font-semibold text-navy-900 focus:bg-white focus:border-pink-brand outline-none transition-colors"
                      />
                    </div>
                  );
                })
              ) : (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#374151]">
                    Notes / Remarks (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any specific update..."
                    rows={3}
                    className="w-full p-4 bg-[#F9FAFB] border border-[#E8ECF0] rounded-xl text-sm font-medium text-navy-900 focus:bg-white focus:border-pink-brand outline-none resize-none transition-colors"
                  />
                </div>
              )}
            </form>
          )}
        </div>

        {/* Footer Actions (for standard forms & O2D Step 3) */}
        {!isO2DStep2 && (
          <div className="p-4 border-t border-[#E8ECF0] flex items-center gap-3 bg-white">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 min-h-[48px] rounded-xl bg-[#F4F6F9] text-sm font-bold text-[#6B7280] hover:bg-[#EBEDF2] transition-colors"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              form={isPurStep3 || isO2DStep3 ? undefined : 'work-form'}
              onClick={isPurStep3 || isO2DStep3 ? handleSubmit : undefined}
              disabled={loading}
              className="flex-1 min-h-[48px] rounded-xl bg-pink-brand hover:bg-[#C4177A] text-white font-extrabold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-md"
            >
              {loading
                ? 'Submitting...'
                : isO2DStep3
                ? 'Complete & Close Order ✓'
                : item.source_module === 'fms' && item.step_no === 6
                ? 'Confirm & Complete PO ✓'
                : t.submit}
            </button>
          </div>
        )}
      </div>

      {/* Inline Modal: Add New Agent / Transport / Master List */}
      {showAddMasterModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-extrabold text-sm text-navy-900">
                Add New {addListKey === 'agents' ? 'Agent' : addListKey === 'transports' ? 'Transport' : 'Item'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddMasterModal(false)}
                className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleAddNewMasterItem} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  {addListKey === 'agents'
                    ? 'Agent Name *'
                    : addListKey === 'transports'
                    ? 'Transport Name (e.g. VRL LOGISTICS) *'
                    : 'Item Name *'}
                </label>
                <input
                  required
                  autoFocus
                  placeholder={addListKey === 'agents' ? 'e.g. Surat Threads Agency' : 'Name'}
                  value={newItemValue}
                  onChange={(e) => setNewItemValue(e.target.value)}
                  className="w-full min-h-[42px] px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-navy-900 focus:bg-white focus:border-pink-brand outline-none uppercase"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddMasterModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingMaster || !newItemValue.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-navy-900 text-white text-xs font-extrabold"
                >
                  {addingMaster ? 'Saving...' : 'Save & Select'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
