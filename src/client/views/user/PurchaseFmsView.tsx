import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  ShoppingCart,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronRight,
  ArrowLeft,
  Filter,
  Eye,
  Calendar,
  Layers,
  FileText,
  Phone,
  MessageSquare,
  Check,
  AlertCircle
} from 'lucide-react';
import { FabricRequirementModal } from '../../components/fms/FabricRequirementModal';

interface PurchaseFmsViewProps {
  onBack?: () => void;
}

export const PurchaseFmsView: React.FC<PurchaseFmsViewProps> = ({ onBack }) => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [flows, setFlows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'REJECTED'>('ALL');
  const [isRequirementModalOpen, setIsRequirementModalOpen] = useState(false);
  const [selectedFlowDetail, setSelectedFlowDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchFlows = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/fms/flows', {
        headers: { Authorization: `Bearer ${localStorage.getItem('katl_token')}` },
      });
      const data = await res.json();
      const purFlows = (data.flows || []).filter((f: any) => f.fms_code === 'PUR');
      setFlows(purFlows);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlows();
  }, []);

  const handleInspectFlow = async (flowId: string) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/fms/flows/${flowId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('katl_token')}` },
      });
      const data = await res.json();
      setSelectedFlowDetail(data.flow);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Permission: Santosh Rajput, Mandate Holder, Owner
  const isSantosh =
    user?.mobile === '9399906456' ||
    user?.name?.toLowerCase().includes('santosh');
  const isMandateOrOwner =
    user?.role === 'OWNER' || user?.role === 'MANDATE_HOLDER';
  const canCreateRequirement = isSantosh || isMandateOrOwner;

  // Filter flows
  const filteredFlows = flows.filter((f) => {
    const data = f.all_form_data || {};
    const matchesSearch =
      (f.display_number && f.display_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (data.fabric_name && data.fabric_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (data.agent_name && data.agent_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (data.purpose && data.purpose.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (f.started_by_name && f.started_by_name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'ACTIVE') return f.status === 'ACTIVE';
    if (statusFilter === 'COMPLETED') {
      const isRejected = f.all_form_data?.quality_status?.includes('Rejected');
      return f.status === 'COMPLETED' && !isRejected;
    }
    if (statusFilter === 'REJECTED') {
      const isRejected = f.all_form_data?.quality_status?.includes('Rejected');
      return isRejected;
    }
    return true;
  });

  // Summary counts
  const totalCount = flows.length;
  const activeCount = flows.filter((f) => f.status === 'ACTIVE').length;
  const completedCount = flows.filter(
    (f) => f.status === 'COMPLETED' && !f.all_form_data?.quality_status?.includes('Rejected')
  ).length;
  const rejectedCount = flows.filter((f) =>
    f.all_form_data?.quality_status?.includes('Rejected')
  ).length;

  const getStepLabel = (flow: any) => {
    if (flow.all_form_data?.quality_status?.includes('Rejected')) {
      return { text: 'Quality Rejected (Closed)', color: 'bg-rose-50 text-rose-700 border-rose-200' };
    }
    if (flow.status === 'COMPLETED') {
      return { text: 'Completed / Paid', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }
    switch (flow.current_step) {
      case 1:
        return { text: '1. Requirements (Santosh)', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 2:
        return { text: '2. Order Done (KR)', color: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 3:
        return { text: '3. Send PO (Sapna)', color: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 4:
        return { text: '4. Quality Check (Santosh)', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 5:
        return { text: '5. Rate & Tally Check (Sanjay)', color: 'bg-teal-50 text-teal-700 border-teal-200' };
      case 6:
        return { text: '6. Payment Initiate (Sanjay)', color: 'bg-orange-50 text-orange-700 border-orange-200' };
      default:
        return { text: `Step ${flow.current_step}`, color: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  return (
    <div className="space-y-4 pb-24 max-w-2xl mx-auto px-4 pt-4 animate-fade-in">
      {/* Top Navigation & Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h2 className="text-xl font-extrabold text-navy-900 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-pink-brand" />
              Purchase FMS
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              6-Step Raw Material &amp; Fabric Procurement Tracker
            </p>
          </div>
        </div>

        {/* Fabric Requirements CTA (Only Santosh, Mandate Holder, Owner) */}
        {canCreateRequirement && (
          <button
            onClick={() => setIsRequirementModalOpen(true)}
            className="min-h-[42px] px-3.5 py-2 rounded-xl bg-pink-brand hover:bg-[#C4177A] text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md active:scale-98 transition shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Fabric Requirements</span>
          </button>
        )}
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-4 gap-2">
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-center">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Total POs</span>
          <span className="text-lg font-black text-navy-900">{totalCount}</span>
        </div>
        <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-2xl text-center">
          <span className="text-[10px] font-bold uppercase text-amber-700 block">In-Progress</span>
          <span className="text-lg font-black text-amber-800">{activeCount}</span>
        </div>
        <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl text-center">
          <span className="text-[10px] font-bold uppercase text-emerald-700 block">Completed</span>
          <span className="text-lg font-black text-emerald-800">{completedCount}</span>
        </div>
        <div className="p-3 bg-rose-50/60 border border-rose-200/80 rounded-2xl text-center">
          <span className="text-[10px] font-bold uppercase text-rose-700 block">Rejected</span>
          <span className="text-lg font-black text-rose-800">{rejectedCount}</span>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search by PO # (e.g. PO-1001), Fabric, Agent..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-navy-900 focus:bg-white focus:border-pink-brand outline-none transition"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1 rounded-full font-bold transition shrink-0 ${
              statusFilter === 'ALL'
                ? 'bg-navy-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({totalCount})
          </button>
          <button
            onClick={() => setStatusFilter('ACTIVE')}
            className={`px-3 py-1 rounded-full font-bold transition shrink-0 ${
              statusFilter === 'ACTIVE'
                ? 'bg-amber-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            In-Progress ({activeCount})
          </button>
          <button
            onClick={() => setStatusFilter('COMPLETED')}
            className={`px-3 py-1 rounded-full font-bold transition shrink-0 ${
              statusFilter === 'COMPLETED'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Completed ({completedCount})
          </button>
          {rejectedCount > 0 && (
            <button
              onClick={() => setStatusFilter('REJECTED')}
              className={`px-3 py-1 rounded-full font-bold transition shrink-0 ${
                statusFilter === 'REJECTED'
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Rejected ({rejectedCount})
            </button>
          )}
        </div>
      </div>

      {/* PO List / Cards */}
      <div className="space-y-3">
        {loading ? (
          <div className="space-y-2.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredFlows.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center space-y-2">
            <ShoppingCart className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-500">No Purchase Orders found.</p>
            {canCreateRequirement && (
              <button
                onClick={() => setIsRequirementModalOpen(true)}
                className="text-xs font-extrabold text-pink-brand hover:underline"
              >
                + Create the first Fabric Requirement
              </button>
            )}
          </div>
        ) : (
          filteredFlows.map((flow) => {
            const data = flow.all_form_data || {};
            const badge = getStepLabel(flow);
            const startedDate = new Date(flow.started_at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={flow.id}
                onClick={() => handleInspectFlow(flow.id)}
                className="p-4 bg-white border border-slate-200 hover:border-slate-300 rounded-2xl shadow-xs transition cursor-pointer space-y-3 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-navy-900 text-white text-xs font-black tracking-wide">
                      {flow.display_number}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${badge.color}`}
                    >
                      {badge.text}
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-400 font-medium">{startedDate}</span>
                </div>

                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-extrabold text-sm text-navy-900 group-hover:text-pink-brand transition">
                      {data.fabric_name || 'Fabric Requisition'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                      Qty: <strong>{data.fabric_quantity || data.order_quantity || '-'} {data.unit || 'Meter'}</strong>
                      {data.color_or_print && ` • ${data.color_or_print}`}
                      {data.agent_name && ` • Agent: ${data.agent_name}`}
                    </p>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-pink-brand group-hover:translate-x-0.5 transition" />
                </div>

                {data.purpose && (
                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
                    <span className="line-clamp-1">Purpose: {data.purpose}</span>
                    <span className="shrink-0 text-pink-brand font-bold">View Timeline →</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Fabric Requirement Modal */}
      <FabricRequirementModal
        isOpen={isRequirementModalOpen}
        onClose={() => setIsRequirementModalOpen(false)}
        onSuccess={() => {
          fetchFlows();
        }}
      />

      {/* Flow Details & Timeline Modal */}
      {selectedFlowDetail && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-navy-900 to-navy-800 text-white">
              <div>
                <span className="text-[10px] uppercase font-black tracking-wider text-pink-brand">
                  Purchase Order Detail
                </span>
                <h3 className="text-base font-extrabold text-white">
                  {selectedFlowDetail.display_number} • {selectedFlowDetail.all_form_data?.fabric_name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedFlowDetail(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {/* Overview Card */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Fabric</span>
                    <span className="font-extrabold text-navy-900 text-sm">
                      {selectedFlowDetail.all_form_data?.fabric_name}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Required Qty</span>
                    <span className="font-bold text-navy-900">
                      {selectedFlowDetail.all_form_data?.fabric_quantity} {selectedFlowDetail.all_form_data?.unit}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Type</span>
                    <span className="font-bold text-navy-900">
                      {selectedFlowDetail.all_form_data?.color_or_print || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Agent</span>
                    <span className="font-bold text-navy-900">
                      {selectedFlowDetail.all_form_data?.agent_name || 'Pending Step 2'}
                    </span>
                  </div>
                </div>

                {selectedFlowDetail.all_form_data?.image_url && (
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Attached Image</span>
                    <img
                      src={selectedFlowDetail.all_form_data.image_url}
                      alt="Fabric sample"
                      className="w-full max-h-48 object-cover rounded-xl border border-slate-200"
                    />
                  </div>
                )}
              </div>

              {/* Step By Step Timeline */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-400">
                  Step-by-Step Execution Trail
                </h4>

                <div className="space-y-3 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {/* Step 1 */}
                  <div className="relative pl-8">
                    <div className="absolute left-2 top-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-xs" />
                    <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1 text-xs">
                      <div className="flex justify-between items-center font-extrabold text-navy-900">
                        <span>1. Fabric Requirements</span>
                        <span className="text-[10px] text-emerald-600 font-bold">✓ Submitted</span>
                      </div>
                      <p className="text-slate-500">
                        Purpose: {selectedFlowDetail.all_form_data?.purpose}
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="relative pl-8">
                    <div
                      className={`absolute left-2 top-0.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-xs ${
                        selectedFlowDetail.current_step > 2 || selectedFlowDetail.status === 'COMPLETED'
                          ? 'bg-emerald-500'
                          : selectedFlowDetail.current_step === 2
                          ? 'bg-amber-500 animate-pulse'
                          : 'bg-slate-300'
                      }`}
                    />
                    <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1 text-xs">
                      <div className="flex justify-between items-center font-extrabold text-navy-900">
                        <span>2. Order Done (KR)</span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {selectedFlowDetail.current_step > 2 || selectedFlowDetail.status === 'COMPLETED'
                            ? '✓ Done'
                            : selectedFlowDetail.current_step === 2
                            ? '⚡ Pending'
                            : 'Upcoming'}
                        </span>
                      </div>
                      {selectedFlowDetail.all_form_data?.agent_name && (
                        <div className="text-slate-600 grid grid-cols-2 gap-1 pt-1">
                          <span>Agent: <strong>{selectedFlowDetail.all_form_data.agent_name}</strong></span>
                          <span>Lead: <strong>{selectedFlowDetail.all_form_data.lead_time_days} days</strong></span>
                          <span>Rate: <strong>₹{selectedFlowDetail.all_form_data.rate}</strong></span>
                          <span>Discount: <strong>{selectedFlowDetail.all_form_data.discount_percent}%</strong></span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="relative pl-8">
                    <div
                      className={`absolute left-2 top-0.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-xs ${
                        selectedFlowDetail.current_step > 3 || selectedFlowDetail.status === 'COMPLETED'
                          ? 'bg-emerald-500'
                          : selectedFlowDetail.current_step === 3
                          ? 'bg-purple-500 animate-pulse'
                          : 'bg-slate-300'
                      }`}
                    />
                    <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1 text-xs">
                      <div className="flex justify-between items-center font-extrabold text-navy-900">
                        <span>3. Send PO To Supplier (Sapna)</span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {selectedFlowDetail.current_step > 3 || selectedFlowDetail.status === 'COMPLETED'
                            ? '✓ Dispatched'
                            : selectedFlowDetail.current_step === 3
                            ? '⚡ Pending'
                            : 'Upcoming'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="relative pl-8">
                    <div
                      className={`absolute left-2 top-0.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-xs ${
                        selectedFlowDetail.all_form_data?.quality_status?.includes('Rejected')
                          ? 'bg-rose-500'
                          : selectedFlowDetail.current_step > 4 || selectedFlowDetail.status === 'COMPLETED'
                          ? 'bg-emerald-500'
                          : selectedFlowDetail.current_step === 4
                          ? 'bg-indigo-500 animate-pulse'
                          : 'bg-slate-300'
                      }`}
                    />
                    <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1 text-xs">
                      <div className="flex justify-between items-center font-extrabold text-navy-900">
                        <span>4. Inwards &amp; Quality Check (Santosh)</span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {selectedFlowDetail.all_form_data?.quality_status || (selectedFlowDetail.current_step === 4 ? '⚡ Pending' : 'Upcoming')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Step 5 */}
                  <div className="relative pl-8">
                    <div
                      className={`absolute left-2 top-0.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-xs ${
                        selectedFlowDetail.current_step > 5 || selectedFlowDetail.status === 'COMPLETED'
                          ? 'bg-emerald-500'
                          : selectedFlowDetail.current_step === 5
                          ? 'bg-teal-500 animate-pulse'
                          : 'bg-slate-300'
                      }`}
                    />
                    <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1 text-xs">
                      <div className="flex justify-between items-center font-extrabold text-navy-900">
                        <span>5. Rate, Discount &amp; Tally (Sanjay)</span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {selectedFlowDetail.current_step > 5 || selectedFlowDetail.status === 'COMPLETED'
                            ? '✓ Verified'
                            : selectedFlowDetail.current_step === 5
                            ? '⚡ Pending'
                            : 'Upcoming'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Step 6 */}
                  <div className="relative pl-8">
                    <div
                      className={`absolute left-2 top-0.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-xs ${
                        selectedFlowDetail.status === 'COMPLETED'
                          ? 'bg-emerald-500'
                          : selectedFlowDetail.current_step === 6
                          ? 'bg-orange-500 animate-pulse'
                          : 'bg-slate-300'
                      }`}
                    />
                    <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1 text-xs">
                      <div className="flex justify-between items-center font-extrabold text-navy-900">
                        <span>6. Payment Initiate (Sanjay)</span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {selectedFlowDetail.status === 'COMPLETED'
                            ? '✓ Completed'
                            : selectedFlowDetail.current_step === 6
                            ? '⚡ Pending'
                            : 'Upcoming'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedFlowDetail(null)}
                className="px-5 py-2.5 rounded-xl bg-navy-900 text-white font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
