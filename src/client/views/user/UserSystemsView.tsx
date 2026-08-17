import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Layers, Shield, Clock, PlusCircle, ArrowRight, Play, CheckCircle2, Video, Send } from 'lucide-react';
import { DelayDashboardView } from '../capabilities/DelayDashboardView';
import { AuditSamplerView } from '../capabilities/AuditSamplerView';
import { DelegationView } from '../capabilities/DelegationView';
import { VideoBacklogView } from '../capabilities/VideoBacklogView';

export const UserSystemsView: React.FC = () => {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const [flows, setFlows] = useState<any[]>([]);
  const [definitions, setDefinitions] = useState<any[]>([]);
  const [activeCapability, setActiveCapability] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/fms/flows', {
        headers: { Authorization: `Bearer ${localStorage.getItem('katl_token')}` },
      }).then((r) => r.json()),
      fetch('/api/fms/definitions', {
        headers: { Authorization: `Bearer ${localStorage.getItem('katl_token')}` },
      }).then((r) => r.json()),
    ])
      .then(([flowData, defsData]) => {
        setFlows(flowData.flows || []);
        setDefinitions(defsData.definitions || []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (!user) return null;

  // Render capability screen if selected
  if (activeCapability === 'DELAY_DASHBOARD') {
    return (
      <div className="max-w-md mx-auto px-4 pt-4 pb-20">
        <button onClick={() => setActiveCapability(null)} className="text-xs font-bold text-hotpink mb-3 flex items-center gap-1">
          ← Back to Systems
        </button>
        <DelayDashboardView />
      </div>
    );
  }

  if (activeCapability === 'AUDIT') {
    return (
      <div className="max-w-md mx-auto px-4 pt-4 pb-20">
        <button onClick={() => setActiveCapability(null)} className="text-xs font-bold text-hotpink mb-3 flex items-center gap-1">
          ← Back to Systems
        </button>
        <AuditSamplerView />
      </div>
    );
  }

  if (activeCapability === 'DELEGATION_SHEET') {
    return (
      <div className="max-w-md mx-auto px-4 pt-4 pb-20">
        <button onClick={() => setActiveCapability(null)} className="text-xs font-bold text-hotpink mb-3 flex items-center gap-1">
          ← Back to Systems
        </button>
        <DelegationView />
      </div>
    );
  }

  if (activeCapability === 'VIDEO_BACKLOG') {
    return (
      <div className="max-w-md mx-auto px-4 pt-4 pb-20">
        <button onClick={() => setActiveCapability(null)} className="text-xs font-bold text-hotpink mb-3 flex items-center gap-1">
          ← Back to Systems
        </button>
        <VideoBacklogView />
      </div>
    );
  }

  const userCapabilities = user.capabilities || [];

  return (
    <div className="space-y-5 pb-20 max-w-md mx-auto px-4 pt-4">
      <div>
        <h2 className="text-xl font-extrabold text-navy-900">{t.navSystems}</h2>
        <p className="text-xs font-medium text-slate-500">Flowchart modules & role capability dashboards</p>
      </div>

      {/* Role Capabilities (Section 3.3 & Section 12) */}
      {userCapabilities.length > 0 && (
        <div className="space-y-2.5">
          <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-400">
            Role Capabilities
          </h3>

          <div className="grid grid-cols-1 gap-2.5">
            {userCapabilities.includes('DELAY_DASHBOARD') && (
              <button
                onClick={() => setActiveCapability('DELAY_DASHBOARD')}
                className="w-full p-4 rounded-2xl bg-gradient-to-r from-navy-900 to-navy-800 text-white flex items-center justify-between shadow-md text-left active:scale-98 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-lightpink-500/20 text-lightpink-300 flex items-center justify-center font-bold">
                    <Clock className="w-5 h-5 text-lightpink-400" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm">{t.delayDashboard}</h4>
                    <p className="text-[11px] text-slate-300">All late tasks across company + 1-tap WhatsApp</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-hotpink" />
              </button>
            )}

            {userCapabilities.includes('AUDIT') && (
              <button
                onClick={() => setActiveCapability('AUDIT')}
                className="w-full p-4 rounded-2xl bg-gradient-to-r from-navy-900 to-navy-800 text-white flex items-center justify-between shadow-md text-left active:scale-98 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold">
                    <Shield className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm">{t.randomAudit}</h4>
                    <p className="text-[11px] text-slate-300">Daily 10-sample verification & false flag reversal</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-hotpink" />
              </button>
            )}

            {userCapabilities.includes('DELEGATION_SHEET') && (
              <button
                onClick={() => setActiveCapability('DELEGATION_SHEET')}
                className="w-full p-4 rounded-2xl bg-gradient-to-r from-navy-900 to-navy-800 text-white flex items-center justify-between shadow-md text-left active:scale-98 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold">
                    <Send className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm">{t.delegatedWork}</h4>
                    <p className="text-[11px] text-slate-300">Assign one-off tasks with WhatsApp link</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-hotpink" />
              </button>
            )}

            {userCapabilities.includes('VIDEO_BACKLOG') && (
              <button
                onClick={() => setActiveCapability('VIDEO_BACKLOG')}
                className="w-full p-4 rounded-2xl bg-gradient-to-r from-navy-900 to-navy-800 text-white flex items-center justify-between shadow-md text-left active:scale-98 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold">
                    <Video className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm">{t.videoBacklog}</h4>
                    <p className="text-[11px] text-slate-300">Track and upload missing training videos</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-hotpink" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* FMS Modules */}
      <div className="space-y-3">
        <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-400">
          Flowchart Modules
        </h3>

        <div className="space-y-2.5">
          {definitions.map((def) => {
            const flowName = (language === 'hi' || language === 'hi_ro') && def.name.hi ? def.name.hi : def.name.en;
            const flowDesc = (language === 'hi' || language === 'hi_ro') && def.description.hi ? def.description.hi : def.description.en;
            const activeCount = flows.filter((f) => f.fms_code === def.code && f.status === 'ACTIVE').length;

            return (
              <div
                key={def.code}
                className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2 hover:border-slate-300 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase px-2.5 py-0.5 rounded-md bg-navy-900 text-white">
                    {def.code}
                  </span>
                  <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-slate-100 text-navy-900 border border-slate-200">
                    {activeCount} Active {activeCount === 1 ? 'Flow' : 'Flows'}
                  </span>
                </div>

                <h4 className="font-bold text-base text-navy-900 leading-tight">{flowName}</h4>
                <p className="text-xs text-slate-500 line-clamp-2">{flowDesc}</p>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span>{def.steps.length} Steps in sequence</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
