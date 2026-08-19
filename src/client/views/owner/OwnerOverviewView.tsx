import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Layers, Clock, AlertTriangle, HelpCircle, ArrowRight, RefreshCw } from 'lucide-react';

interface OwnerOverviewProps {
  onNavigateTab: (tab: string) => void;
}

export const OwnerOverviewView: React.FC<OwnerOverviewProps> = ({ onNavigateTab }) => {
  const { t } = useLanguage();
  const [flows, setFlows] = useState<any[]>([]);
  const [lateItems, setLateItems] = useState<any[]>([]);
  const [helpSlips, setHelpSlips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchOverview = (showLoader = false) => {
    if (showLoader) setLoading(true);
    else setIsRefreshing(true);
    Promise.all([
      fetch('/api/fms/flows', { headers: { Authorization: `Bearer ${localStorage.getItem('katl_token')}` } }).then((r) => r.json()),
      fetch('/api/audit/delay-dashboard', { headers: { Authorization: `Bearer ${localStorage.getItem('katl_token')}` } }).then((r) => r.json()),
      fetch('/api/help-slips', { headers: { Authorization: `Bearer ${localStorage.getItem('katl_token')}` } }).then((r) => r.json()),
    ])
      .then(([flowData, lateData, hsData]) => {
        setFlows(flowData.flows || []);
        setLateItems(lateData.late_items || []);
        setHelpSlips(hsData.help_slips || []);
      })
      .finally(() => { setLoading(false); setIsRefreshing(false); });
  };

  useEffect(() => {
    fetchOverview(true);
    const interval = setInterval(() => fetchOverview(false), 6000);
    return () => clearInterval(interval);
  }, []);

  const activeFlowsCount = flows.filter((f) => f.status === 'ACTIVE').length;
  const o2cFlowsCount = flows.filter((f) => (f.fms_code === 'O2C' || f.fms_code === 'O2D') && f.status === 'ACTIVE').length;
  const purFlowsCount = flows.filter((f) => f.fms_code === 'PUR' && f.status === 'ACTIVE').length;
  const jsFlowsCount = flows.filter((f) => f.fms_code === 'JS' && f.status === 'ACTIVE').length;
  const openHelpSlips = helpSlips.filter((s) => s.status === 'ASKED').length;

  return (
    <div className="min-h-full bg-white pb-24">
      {/* Hero */}
      <div className="mx-4 mt-4 rounded-2xl hero-gradient relative p-5 min-h-[100px] flex items-center">
        <div className="relative z-10">
          <p className="text-pink-brand font-extrabold text-sm mb-0.5">Operations Overview.</p>
          <p className="text-white text-xs font-medium opacity-80">Live command center — real-time data</p>
        </div>
        {isRefreshing && (
          <div className="absolute top-3 right-3">
            <RefreshCw className="w-3.5 h-3.5 text-pink-brand animate-spin" />
          </div>
        )}
      </div>

      {/* Section header */}
      <div className="mx-4 mt-5 mb-2">
        <p className="text-[11px] font-black tracking-widest uppercase text-[#9CA3AF]">Live Metrics</p>
      </div>

      {/* Metric cards */}
      <div className="mx-4 grid grid-cols-2 gap-3">
        <div
          onClick={() => onNavigateTab('systems')}
          className="p-4 rounded-2xl bg-navy-900 text-white cursor-pointer active:scale-[0.98] transition-all"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">Live Flows</span>
            <Layers className="w-4 h-4 text-pink-brand" />
          </div>
          <div className="text-3xl font-black text-white">{activeFlowsCount}</div>
          <p className="text-[11px] text-[#9CA3AF] mt-0.5">In production &amp; delivery</p>
        </div>

        <div
          onClick={() => onNavigateTab('systems')}
          className={`p-4 rounded-2xl border cursor-pointer active:scale-[0.98] transition-all ${
            lateItems.length > 0
              ? 'bg-[#FFF5F8] border-[#F9BFDF]'
              : 'bg-white border-[#E8ECF0]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">Overdue</span>
            <Clock className={`w-4 h-4 ${lateItems.length > 0 ? 'text-pink-brand' : 'text-[#9CA3AF]'}`} />
          </div>
          <div className={`text-3xl font-black ${lateItems.length > 0 ? 'text-[#7A0B45]' : 'text-navy-900'}`}>
            {lateItems.length}
          </div>
          <p className="text-[11px] text-[#6B7280] mt-0.5">Company-wide late tasks</p>
        </div>
      </div>

      {/* Pipeline summary */}
      <div className="mx-4 mt-4">
        <p className="text-[11px] font-black tracking-widest uppercase text-[#9CA3AF] mb-2">Flowchart Pipeline</p>
        <div className="rounded-2xl border border-[#E8ECF0] bg-white divide-y divide-[#E8ECF0] overflow-hidden">
          {[
            { label: 'Order-to-Collection (O2C)', count: o2cFlowsCount },
            { label: 'Purchase Procurement (PUR)', count: purFlowsCount },
            { label: 'Job Slip Production (JS)', count: jsFlowsCount },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm font-semibold text-navy-900">{item.label}</span>
              <span className={`text-sm font-extrabold ${item.count > 0 ? 'text-pink-brand' : 'text-[#9CA3AF]'}`}>
                {item.count} Active
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Open Help Slips */}
      <div className="mx-4 mt-4">
        <button
          onClick={() => onNavigateTab('manage')}
          className="w-full rounded-2xl border border-[#E8ECF0] bg-white p-4 flex items-center justify-between hover:bg-[#F9FAFB] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFF0FA] flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-pink-brand" />
            </div>
            <div className="text-left">
              <h4 className="font-extrabold text-sm text-navy-900">{openHelpSlips} Open Help Slips</h4>
              <p className="text-xs text-[#6B7280]">Staff questions awaiting reply</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-[#9CA3AF]" />
        </button>
      </div>
    </div>
  );
};
