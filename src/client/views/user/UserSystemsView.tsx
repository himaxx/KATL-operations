import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Shield, Clock, ArrowRight, Video, Send, AlertCircle } from 'lucide-react';
import { DelayDashboardView } from '../capabilities/DelayDashboardView';
import { AuditSamplerView } from '../capabilities/AuditSamplerView';
import { DelegationView } from '../capabilities/DelegationView';
import { VideoBacklogView } from '../capabilities/VideoBacklogView';
import { PurchaseFmsView } from './PurchaseFmsView';
import { O2CFmsView } from './O2CFmsView';

// Maps system_code (from user_systems table) → FMS definition codes shown to user
const SYSTEM_TO_FMS_CODES: Record<string, string[]> = {
  O2C: ['O2C'],
  O2D: ['O2C'], // legacy mapping
  Purchase: ['PUR'],
  // CL (Checklist) is managed under the Tasks/Home tab, not the FMS Flowchart section
};

export const UserSystemsView: React.FC = () => {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const [flows, setFlows] = useState<any[]>([]);
  const [definitions, setDefinitions] = useState<any[]>([]);
  const [activeCapability, setActiveCapability] = useState<string | null>(null);
  const [activeFmsCode, setActiveFmsCode] = useState<string | null>(null);
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

  if (activeFmsCode === 'PUR') {
    return <PurchaseFmsView onBack={() => setActiveFmsCode(null)} />;
  }

  if (activeFmsCode === 'O2C' || activeFmsCode === 'O2D') {
    return <O2CFmsView onBack={() => setActiveFmsCode(null)} />;
  }

  const userCapabilities = user.capabilities || [];
  const userSystems = user.systems || [];

  // Compute allowed FMS codes based on assigned systems
  const allowedFmsCodes = new Set<string>();

  // Owners & Mandate holders get all systems
  if (user.role === 'OWNER' || user.role === 'MANDATE_HOLDER') {
    allowedFmsCodes.add('O2C');
    allowedFmsCodes.add('PUR');
  }

  // Core O2C team members (Lalita, Harsh, Akash, Sanjay, Manoj, KR, Himanshu)
  const o2cMobiles = ['9009200757', '9165072008', '7771002882', '7879883549', '7024628005', '7771000411', '9685002014', '8109014198', '9827055000', '6267888249'];
  if ((user.mobile && o2cMobiles.includes(user.mobile)) || user.designations?.some((d: any) => typeof d === 'string' ? d === 'CRM' : d.name === 'CRM')) {
    allowedFmsCodes.add('O2C');
  }

  for (const sysCode of userSystems) {
    const fmsCodes = SYSTEM_TO_FMS_CODES[sysCode] || [];
    fmsCodes.forEach((c) => allowedFmsCodes.add(c));
    if (sysCode.toUpperCase().includes('O2C') || sysCode.toUpperCase().includes('O2D')) {
      allowedFmsCodes.add('O2C');
    }
  }

  // Filter FMS definitions to only what the user has access to
  const filteredDefinitions = definitions.filter((def) => allowedFmsCodes.has(def.code));
  const hasNoFmsAccess = filteredDefinitions.length === 0;

  return (
    <div className="space-y-5 pb-20 max-w-md mx-auto px-4 pt-4">
      <div>
        <h2 className="text-xl font-extrabold text-navy-900">{t.navSystems}</h2>
        <p className="text-xs font-medium text-slate-500">Flowchart modules &amp; role capability dashboards</p>
      </div>

      {/* Role Capabilities — driven by designation, unchanged */}
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
                    <p className="text-[11px] text-slate-300">Daily 10-sample verification &amp; false flag reversal</p>
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

      {/* FMS Modules — filtered by user's assigned systems */}
      <div className="space-y-3">
        <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-400">
          Flowchart Modules
        </h3>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 rounded-full border-2 border-hotpink border-t-transparent animate-spin" />
          </div>
        ) : hasNoFmsAccess ? (
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-slate-400" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-navy-900">Not part of any system</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-[200px]">
                Contact your manager to get access to a flowchart system.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredDefinitions.map((def) => {
              const flowName = (language === 'hi' || language === 'hi_ro') && def.name.hi ? def.name.hi : def.name.en;
              const flowDesc = (language === 'hi' || language === 'hi_ro') && def.description.hi ? def.description.hi : def.description.en;
              const activeCount = flows.filter((f) => f.fms_code === def.code && f.status === 'ACTIVE').length;

              return (
                <div
                  key={def.code}
                  onClick={() => setActiveFmsCode(def.code)}
                  className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2 hover:border-slate-300 transition cursor-pointer active:scale-[0.99] group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase px-2.5 py-0.5 rounded-md bg-navy-900 text-white">
                      {def.code}
                    </span>
                    <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-slate-100 text-navy-900 border border-slate-200">
                      {activeCount} Active {activeCount === 1 ? 'Flow' : 'Flows'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-base text-navy-900 leading-tight group-hover:text-pink-brand transition">{flowName}</h4>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-pink-brand group-hover:translate-x-0.5 transition shrink-0" />
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2">{flowDesc}</p>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                    <span>{def.steps.length} Steps in sequence</span>
                    <span className="text-pink-brand font-bold">Open Flowchart →</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
