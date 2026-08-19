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
import { WhatsAppButton } from '../fms/WhatsAppButton';
import { whatsappTemplates } from '../../../fms';

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

  // O2C Step 4 Dispatch Batch States
  const [o2cBillNo, setO2cBillNo] = useState('');
  const [o2cBillAmount, setO2cBillAmount] = useState('');
  const [o2cQtyDispatched, setO2cQtyDispatched] = useState('');
  const [o2cProductCategory, setO2cProductCategory] = useState('Top / T-Shirt');
  const [o2cTransport, setO2cTransport] = useState('');
  const [o2cCrossCheckVerified, setO2cCrossCheckVerified] = useState('Yes — Fully Verified');
  const [o2cDispatches, setO2cDispatches] = useState<any[]>([]);
  const [o2cTotalDispatched, setO2cTotalDispatched] = useState<number>(0);
  const [o2cTotalBillAmount, setO2cTotalBillAmount] = useState<number>(0);
  const [o2cPercent, setO2cPercent] = useState<number>(0);
  const [o2cSavingBatch, setO2cSavingBatch] = useState(false);

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
    setO2cBillNo('');
    setO2cBillAmount('');
    setO2cQtyDispatched('');
    setO2cProductCategory('Top / T-Shirt');
    setO2cTransport('');
    setO2cCrossCheckVerified('Yes — Fully Verified');

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

          // Initialize O2C dispatches
          if (flow?.all_form_data) {
            const disps = Array.isArray(flow.all_form_data.dispatches) ? flow.all_form_data.dispatches : [];
            setO2cDispatches(disps);
            const totalDispatched = Number(flow.all_form_data.total_dispatched) || 0;
            const totalBill = Number(flow.all_form_data.total_bill_amount) || 0;
            const totalOrdered = Number(flow.all_form_data.quantity) || 0;
            setO2cTotalDispatched(totalDispatched);
            setO2cTotalBillAmount(totalBill);
            setO2cPercent(totalOrdered > 0 ? (totalDispatched / totalOrdered) * 100 : 0);
            if (flow.all_form_data.transport_name && !o2cTransport) {
              setO2cTransport(flow.all_form_data.transport_name);
            }
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
        setO2cTransport(newItemValue.trim());
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
    const fabricName = fmsFlow?.all_form_data?.fabric_name || 'Fabric Quality';
    const agentName = fmsFlow?.all_form_data?.agent_name || 'Partner';
    const todayDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    const message = `🏢 *Ketan Aditya Textiles LLP*\n\nDear ${agentName},\n\nPlease find our Purchase Order details below for processing:\n\n📄 *PO Number:* ${poNumber}\n🧵 *Fabric Quality:* ${fabricName}\n📅 *Date:* ${todayDate}\n\nKindly include the PO Number in the receipt.\n\nBest regards,\n*Purchase Team | Ketan Aditya*`;
    const url = phoneWithCode
      ? `https://wa.me/${phoneWithCode}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(url, '_blank');
  };

  // O2C Step 4: Save Dispatch Entry Batch
  const handleSaveO2CDispatchBatch = async (isMarkingComplete: boolean = false) => {
    setError(null);
    if (!isMarkingComplete && (!o2cBillNo.trim() || !o2cBillAmount || Number(o2cBillAmount) <= 0 || !o2cQtyDispatched || Number(o2cQtyDispatched) <= 0)) {
      setError('Please enter a valid Bill No., Bill Amount (₹), and Dispatch Quantity (Pcs)');
      return;
    }

    const totalOrdered = Number(fmsFlow?.all_form_data?.quantity) || 0;
    const newQty = Number(o2cQtyDispatched) || 0;

    // Warn user if new dispatch quantity causes total dispatched to exceed order quantity
    if (!isMarkingComplete && totalOrdered > 0 && (o2cTotalDispatched + newQty > totalOrdered)) {
      const excess = (o2cTotalDispatched + newQty) - totalOrdered;
      const confirmExcess = window.confirm(
        `⚠️ Warning: Total Dispatched Quantity (${o2cTotalDispatched + newQty} Pcs) will exceed Total Order Quantity (${totalOrdered} Pcs) by ${excess} Pcs.\n\nDo you want to proceed with this entry?`
      );
      if (!confirmExcess) {
        return;
      }
    }

    setO2cSavingBatch(true);
    try {
      let updatedTotal = o2cTotalDispatched;
      let updatedBillTotal = o2cTotalBillAmount;
      let updatedPercent = o2cPercent;
      let updatedDispatches = [...o2cDispatches];

      if (o2cBillNo.trim() && Number(o2cQtyDispatched) > 0) {
        const res = await fetch('/api/fms/o2c/add-dispatch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('katl_token')}`,
          },
          body: JSON.stringify({
            flow_id: item.source_ref_id,
            dispatch_entry: {
              bill_no: o2cBillNo.trim(),
              bill_amount: Number(o2cBillAmount) || 0,
              qty_dispatched: Number(o2cQtyDispatched),
              product_category: o2cProductCategory,
              cross_check_verified: o2cCrossCheckVerified,
              transport: o2cTransport || fmsFlow?.all_form_data?.transport_name || '',
              entered_by_accountant: user?.name || 'Accounts',
            },
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to save dispatch');

        updatedTotal = data.total_dispatched;
        updatedBillTotal = data.total_bill_amount;
        updatedPercent = data.dispatch_percent;
        updatedDispatches = data.dispatches;

        setO2cTotalDispatched(updatedTotal);
        setO2cTotalBillAmount(updatedBillTotal);
        setO2cPercent(updatedPercent);
        setO2cDispatches(updatedDispatches);

        // Reset batch input fields
        setO2cBillNo('');
        setO2cBillAmount('');
        setO2cQtyDispatched('');
      }

      if (isMarkingComplete) {
        if (updatedPercent < 80) {
          throw new Error(`Cannot complete order: Current dispatch is ${Math.round(updatedPercent)}%. Minimum 80% is required to complete.`);
        }
        await handleSubmitStepDirect({
          total_dispatched: updatedTotal,
          total_bill_amount: updatedBillTotal,
          dispatch_percent: updatedPercent,
          completed_by_user: true,
          dispatches: updatedDispatches,
        });
        return;
      }

      // Refresh parent data silently without closing modal or marking work item DONE
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Error saving dispatch');
    } finally {
      setO2cSavingBatch(false);
    }
  };

  const handleRemoveO2CDispatchBatch = async (dispatchId: string) => {
    try {
      const res = await fetch('/api/fms/o2c/remove-dispatch', {
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

      setO2cTotalDispatched(data.total_dispatched);
      setO2cTotalBillAmount(data.total_bill_amount);
      setO2cPercent(data.dispatch_percent);
      setO2cDispatches(data.dispatches);
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

  const isO2CStep4 = item.source_module === 'fms' && item.fms_code === 'O2C' && item.step_no === 4;
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
          {/* O2C STEP 4 CUSTOM UI: Akash Soni / Accounts Multi-Dispatch Staggered Batch Entry */}
          {/* ========================================================================= */}
          {isO2CStep4 && (
            <div className="space-y-4">
              {/* Live Dispatch Progress Bar & Value Card */}
              <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between text-xs font-extrabold text-navy-900">
                  <span className="flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-amber-600" />
                    Dispatch Progress
                  </span>
                  <span className={o2cPercent >= 80 ? 'text-emerald-700 font-black' : 'text-amber-700 font-bold'}>
                    {o2cTotalDispatched} / {Number(fmsFlow?.all_form_data?.quantity) || 0} Pcs ({Math.round(o2cPercent)}%)
                  </span>
                </div>

                <div className="w-full h-3 bg-amber-200/50 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      o2cPercent >= 100
                        ? 'bg-emerald-500'
                        : o2cPercent >= 80
                        ? 'bg-emerald-400'
                        : 'bg-pink-brand'
                    }`}
                    style={{ width: `${Math.min(100, o2cPercent)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1 text-slate-600 border-t border-amber-200/60">
                  <span>
                    Total Dispatched Value: <strong className="text-navy-900 font-black">₹{o2cTotalBillAmount.toLocaleString('en-IN')}</strong>
                  </span>
                  <span>
                    Logged: <strong className="text-navy-900 font-bold">{o2cDispatches.length} Batches</strong>
                  </span>
                </div>

                {o2cPercent >= 80 && (
                  <p className="text-[11px] font-bold text-emerald-700 bg-emerald-100/60 p-2 rounded-xl border border-emerald-200">
                    ✓ Threshold reached (&ge; 80%). You can log additional batches or click <strong>&quot;Complete Dispatch Step (&ge; 80%) ✓&quot;</strong> below to advance to Warehouse check.
                  </p>
                )}
              </div>

              {/* Existing Dispatch Batches Log */}
              {o2cDispatches.length > 0 && (
                <div>
                  <h4 className="text-xs font-black text-navy-900 uppercase tracking-wider mb-2">
                    Logged Dispatch Batches ({o2cDispatches.length})
                  </h4>
                  <div className="space-y-2 max-h-44 overflow-y-auto">
                    {o2cDispatches.map((d: any, idx: number) => (
                      <div
                        key={d.id || idx}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between gap-2 shadow-2xs"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-navy-900 truncate">
                            Bill No: <span className="text-pink-brand">{d.bill_no}</span> • ₹{Number(d.bill_amount || 0).toLocaleString('en-IN')}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {d.product_category || 'Goods'} • {d.transport || 'Transport'} • {new Date(d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-black text-navy-900 text-xs bg-slate-200/70 px-2 py-1 rounded-lg">
                            {d.qty_dispatched} Pcs
                          </span>
                          <button
                            type="button"
                            title="Remove Batch"
                            onClick={() => handleRemoveO2CDispatchBatch(d.id)}
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

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Bill No. / Challan No. *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. BILL-4402"
                      value={o2cBillNo}
                      onChange={(e) => setO2cBillNo(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-navy-900 outline-none focus:border-pink-brand"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Bill Amount (₹) *</label>
                    <input
                      type="number"
                      min="1"
                      required
                      placeholder="e.g. 85000"
                      value={o2cBillAmount}
                      onChange={(e) => setO2cBillAmount(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-navy-900 outline-none focus:border-pink-brand"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Dispatch Qty (Pcs) *</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 250"
                      value={o2cQtyDispatched}
                      onChange={(e) => setO2cQtyDispatched(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-navy-900 outline-none focus:border-pink-brand"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Product Category *</label>
                    <select
                      value={o2cProductCategory}
                      onChange={(e) => setO2cProductCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-navy-900 outline-none focus:border-pink-brand"
                    >
                      <option value="Top / T-Shirt">Top / T-Shirt</option>
                      <option value="Lower / Track Pant">Lower / Track Pant</option>
                      <option value="Kurti">Kurti</option>
                      <option value="Leggings">Leggings</option>
                      <option value="Nightwear / Set">Nightwear / Set</option>
                      <option value="Fancy Suit">Fancy Suit</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
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
                      + Add New Transport
                    </button>
                  </div>
                  <select
                    value={o2cTransport}
                    onChange={(e) => setO2cTransport(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-navy-900 outline-none focus:border-pink-brand"
                  >
                    <option value="">Default ({fmsFlow?.all_form_data?.transport_name || 'Transport'})</option>
                    {(masterLists['transports'] || []).map((tr) => (
                      <option key={tr} value={tr}>
                        {tr}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Customer Cross-Check *</label>
                  <select
                    value={o2cCrossCheckVerified}
                    onChange={(e) => setO2cCrossCheckVerified(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-navy-900 outline-none focus:border-pink-brand"
                  >
                    <option value="Yes — Fully Verified">Yes — Fully Verified (नाम व पार्टी सही है)</option>
                    <option value="No — Discrepancy Found">No — Discrepancy Found (नाम मेल नहीं खाता)</option>
                  </select>
                </div>

                {/* Batch Action Buttons */}
                <div className="pt-2 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={o2cSavingBatch}
                      onClick={() => handleSaveO2CDispatchBatch(false)}
                      className="flex-1 py-3 rounded-xl bg-pink-brand hover:bg-[#C4177A] text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition active:scale-98 shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{o2cSavingBatch ? 'Saving...' : '+ Save Dispatch Batch'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onSuccess();
                        onClose();
                      }}
                      className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs flex items-center justify-center gap-1.5 transition active:scale-98"
                    >
                      <X className="w-4 h-4" />
                      <span>Close</span>
                    </button>
                  </div>

                  {o2cPercent >= 80 && (
                    <button
                      type="button"
                      disabled={o2cSavingBatch}
                      onClick={() => handleSaveO2CDispatchBatch(true)}
                      className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md transition active:scale-98"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Complete Dispatch Step (&ge; 80%) ✓ (Advance to Manoj Bhaiya)</span>
                    </button>
                  )}
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

              <div className="p-3.5 bg-white rounded-xl border border-purple-200 text-xs space-y-1.5 leading-relaxed">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Prefilled Message Preview:</span>
                <div className="text-slate-800 text-[11px] whitespace-pre-line bg-purple-50/50 p-2.5 rounded-lg border border-purple-100 font-sans">
                  {`🏢 *Ketan Aditya Textiles LLP*

Dear ${fmsFlow?.all_form_data?.agent_name || 'Partner'},

Please find our Purchase Order details below for processing:

📄 *PO Number:* ${fmsFlow?.display_number || 'PO'}
🧵 *Fabric Quality:* ${fmsFlow?.all_form_data?.fabric_name || 'Fabric Quality'}
📅 *Date:* ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}

Kindly include the PO Number in the receipt.

Best regards,
*Purchase Team | Ketan Aditya*`}
                </div>
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
          {!isO2CStep4 && !isPurStep3 && (
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

              {/* WhatsApp Action Preview for Steps with whatsapp_template */}
              {currentStepDef?.whatsapp_template && (
                <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-extrabold text-emerald-900">
                    <span className="flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                      WhatsApp Notification Ready
                    </span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full font-bold">
                      1-Tap Send
                    </span>
                  </div>
                  <WhatsAppButton
                    phone={
                      formData.customer_mobile ||
                      fmsFlow?.all_form_data?.customer_mobile ||
                      ''
                    }
                    message={
                      whatsappTemplates[
                        currentStepDef.whatsapp_template.template_key as keyof typeof whatsappTemplates
                      ]?.({
                        customerName:
                          formData.customer_name_corrected ||
                          formData.customer_name ||
                          fmsFlow?.all_form_data?.customer_name_corrected ||
                          fmsFlow?.all_form_data?.customer_name,
                        orderNumber: fmsFlow?.display_number,
                        totalQuantity: formData.quantity || fmsFlow?.all_form_data?.quantity,
                        dispatchedQuantity: fmsFlow?.all_form_data?.total_dispatched,
                        leadTimeDays: formData.lead_time_days || fmsFlow?.all_form_data?.lead_time_days,
                        transportName: formData.transport_name || fmsFlow?.all_form_data?.transport_name,
                        dueDate: fmsFlow?.all_form_data?.payment_due_date,
                        billAmount: fmsFlow?.all_form_data?.total_bill_amount,
                      }) || 'Hello from Ketan Aditya Textiles LLP'
                    }
                    label="📲 Send Message on WhatsApp"
                  />
                </div>
              )}
            </form>
          )}
        </div>

        {/* Footer Actions (for standard forms) */}
        {!isO2CStep4 && (
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
              form={isPurStep3 ? undefined : 'work-form'}
              onClick={isPurStep3 ? handleSubmit : undefined}
              disabled={loading}
              className="flex-1 min-h-[48px] rounded-xl bg-pink-brand hover:bg-[#C4177A] text-white font-extrabold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-md"
            >
              {loading
                ? 'Submitting...'
                : item.source_module === 'fms' && item.step_no === 6 && item.fms_code === 'PUR'
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
