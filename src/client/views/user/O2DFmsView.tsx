import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  ArrowLeft,
  Plus,
  Search,
  PackageCheck,
  Truck,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  ChevronRight,
  Filter,
  FileText,
  User,
  ShoppingBag,
} from 'lucide-react';
import { O2DOrderModal } from '../../components/fms/O2DOrderModal';

interface O2DFmsViewProps {
  onBack: () => void;
}

export const O2DFmsView: React.FC<O2DFmsViewProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [flows, setFlows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL');
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedFlowTimeline, setSelectedFlowTimeline] = useState<any | null>(null);

  const isCrmOrAdmin =
    user?.role === 'OWNER' ||
    user?.role === 'MANDATE_HOLDER' ||
    user?.mobile === '9009200757' || // Lalita Yadav (CRM)
    user?.designations?.some((d: any) => d.name === 'CRM');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/fms/instances?code=O2D', {
        headers: { Authorization: `Bearer ${localStorage.getItem('katl_token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFlows(data.instances || []);
      }
    } catch (err) {
      console.error('Error fetching O2D orders', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOrderCreated = (displayNum: string) => {
    fetchOrders();
  };

  const parseFormData = (data: any) => {
    if (!data) return {};
    if (typeof data === 'object') return data;
    try {
      return JSON.parse(data);
    } catch (e) {
      return {};
    }
  };

  // Filter orders
  const filteredFlows = flows.filter((f) => {
    const data = parseFormData(f.all_form_data);
    const matchesSearch =
      f.display_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (data.customer_name && data.customer_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (data.transport && data.transport.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (data.agent_name && data.agent_name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (filterTab === 'ACTIVE') return f.status === 'ACTIVE';
    if (filterTab === 'COMPLETED') return f.status === 'COMPLETED';
    return true;
  });

  const totalOrders = flows.length;
  const activeOrders = flows.filter((f) => f.status === 'ACTIVE').length;
  const completedOrders = flows.filter((f) => f.status === 'COMPLETED').length;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Top Bar Header */}
      <div className="bg-navy-900 text-white px-4 py-3.5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center transition-all text-white shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-black tracking-wide text-white leading-tight">
              Order-to-Delivery (O2D)
            </h1>
            <p className="text-[10px] text-pink-brand font-bold truncate">
              Sales Booking &amp; Staggered Dispatch
            </p>
          </div>
          {isCrmOrAdmin && (
            <button
              onClick={() => setIsOrderModalOpen(true)}
              className="py-2 px-3 rounded-xl bg-pink-brand hover:bg-[#C4177A] text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Create Order</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Counters Grid */}
      <div className="p-4 grid grid-cols-3 gap-2.5">
        <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-2xs text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Orders</p>
          <p className="text-lg font-black text-navy-900 mt-0.5">{totalOrders}</p>
        </div>
        <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-2xs text-center">
          <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">In Dispatch</p>
          <p className="text-lg font-black text-amber-600 mt-0.5">{activeOrders}</p>
        </div>
        <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-2xs text-center">
          <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Completed</p>
          <p className="text-lg font-black text-emerald-600 mt-0.5">{completedOrders}</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="p-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by O2D No, Customer, Transport, Agent..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-navy-900 placeholder:text-slate-400 outline-none focus:border-pink-brand shadow-2xs"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2">
          {(['ALL', 'ACTIVE', 'COMPLETED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                filterTab === tab
                  ? 'bg-navy-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab === 'ALL' ? 'All Orders' : tab === 'ACTIVE' ? 'In-Progress' : 'Completed'}
            </button>
          ))}
        </div>
      </div>

      {/* Order Cards List */}
      <div className="px-4 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-white animate-pulse border border-slate-200" />
            ))}
          </div>
        ) : filteredFlows.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 space-y-2">
            <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-navy-900">No Orders Found</p>
            <p className="text-xs text-slate-400">
              {searchQuery ? 'Try matching another search term' : 'Click "+ Create New Order" to book your first order.'}
            </p>
          </div>
        ) : (
          filteredFlows.map((f) => {
            const data = parseFormData(f.all_form_data);
            const totalOrdered = Number(data.quantity) || 0;
            const totalDispatched = Number(data.total_dispatched) || 0;
            const percent = totalOrdered > 0 ? Math.min(100, Math.round((totalDispatched / totalOrdered) * 100)) : 0;
            const isCompleted = f.status === 'COMPLETED';
            const dispatches = Array.isArray(data.dispatches) ? data.dispatches : [];

            return (
              <div
                key={f.id}
                onClick={() => setSelectedFlowTimeline(f)}
                className="bg-white rounded-2xl p-4 border border-slate-200 hover:border-pink-brand/50 transition-all cursor-pointer shadow-xs space-y-3"
              >
                {/* Top Row: O2D Number & Status Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-navy-900 text-white font-black text-xs">
                      {f.display_number}
                    </span>
                    {isCompleted ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                        Completed
                      </span>
                    ) : f.current_step === 2 ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold flex items-center gap-1">
                        <Truck className="w-3 h-3" />
                        Step 2: Dispatch Entry
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold">
                        Step 3: Settlement
                      </span>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>

                {/* Customer & Product Details */}
                <div>
                  <h3 className="text-sm font-extrabold text-navy-900">{data.customer_name || 'Customer'}</h3>
                  <div className="flex items-center gap-1.5 flex-wrap mt-1">
                    {Array.isArray(data.products_ordered) ? (
                      data.products_ordered.map((p: string) => (
                        <span
                          key={p}
                          className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-600"
                        >
                          {p}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500">{data.products_ordered}</span>
                    )}
                  </div>
                </div>

                {/* Dispatch Progress Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-slate-500">
                      Dispatched: <strong className="text-navy-900">{totalDispatched}</strong> / {totalOrdered} Pcs
                    </span>
                    <span className={percent >= 80 ? 'text-emerald-600' : 'text-amber-600'}>
                      {percent}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        percent >= 100
                          ? 'bg-emerald-500'
                          : percent >= 80
                          ? 'bg-emerald-400'
                          : 'bg-pink-brand'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                {/* Bottom Meta row */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <Truck className="w-3 h-3 text-slate-400" />
                    {data.transport || 'Transport N/A'}
                  </span>
                  <span>{dispatches.length} Dispatch Batch{dispatches.length !== 1 ? 'es' : ''}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Flow History & Timeline Modal */}
      {selectedFlowTimeline && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div>
                <span className="px-2.5 py-1 rounded-lg bg-navy-900 text-white font-black text-xs">
                  {selectedFlowTimeline.display_number}
                </span>
                <h3 className="text-sm font-extrabold text-navy-900 mt-1">
                  {parseFormData(selectedFlowTimeline.all_form_data).customer_name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedFlowTimeline(null)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
              >
                ✕
              </button>
            </div>

            {/* Order Specs */}
            {(() => {
              const data = parseFormData(selectedFlowTimeline.all_form_data);
              const dispatches = Array.isArray(data.dispatches) ? data.dispatches : [];
              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Total Ordered</span>
                      <strong className="text-navy-900">{data.quantity} Pcs</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Lead Time</span>
                      <strong className="text-navy-900">{data.lead_time_days} Days</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Transport</span>
                      <strong className="text-navy-900">{data.transport}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Rate Type</span>
                      <strong className="text-navy-900">{data.order_rate}</strong>
                    </div>
                  </div>

                  {/* Dispatches List */}
                  <div>
                    <h4 className="text-xs font-black text-navy-900 uppercase tracking-wider mb-2">
                      Dispatch Batches ({dispatches.length})
                    </h4>
                    {dispatches.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No dispatches logged yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {dispatches.map((d: any, idx: number) => (
                          <div
                            key={d.id || idx}
                            className="p-3 bg-white border border-slate-200 rounded-xl text-xs flex items-center justify-between"
                          >
                            <div>
                              <p className="font-bold text-navy-900">
                                Bill No: <span className="text-pink-brand">{d.bill_no}</span>
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {new Date(d.created_at).toLocaleDateString()} at{' '}
                                {new Date(d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="font-black text-navy-900 text-sm">{d.qty_dispatched} Pcs</span>
                              <span className="block text-[9px] font-bold text-emerald-600">Verified</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Create Order Modal */}
      <O2DOrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        onOrderCreated={handleOrderCreated}
      />
    </div>
  );
};
