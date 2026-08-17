import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { ShieldCheck, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

export const AuditSamplerView: React.FC = () => {
  const { language, t } = useLanguage();
  const [sample, setSample] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditedIds, setAuditedIds] = useState<Record<string, 'VERIFIED' | 'FALSE'>>({});

  const fetchSample = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/audit/daily-sample', {
        headers: { Authorization: `Bearer ${localStorage.getItem('katl_token')}` },
      });
      const data = await res.json();
      setSample(data.sample || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSample();
  }, []);

  const handleAudit = async (workItemId: string, result: 'VERIFIED' | 'FALSE') => {
    try {
      await fetch('/api/audit/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('katl_token')}`,
        },
        body: JSON.stringify({
          work_item_id: workItemId,
          result,
          notes: result === 'FALSE' ? 'Checked by Process Coordinator — task marked done but incomplete' : 'Verified OK',
        }),
      });

      setAuditedIds((prev) => ({ ...prev, [workItemId]: result }));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-navy-900">{t.randomAudit}</h2>
          <p className="text-xs text-slate-500">Cryptographically drawn daily sample (10 tasks)</p>
        </div>
        <span className="text-xs font-black px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
          {sample.length} Samples
        </span>
      </div>

      <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 leading-snug">
        <strong>Audit Rule:</strong> If you mark an item <strong>False</strong>, its completion credit will be immediately reversed, and it will appear highlighted in light pink on the staff's score sheet.
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-200/70 animate-pulse" />
          ))}
        </div>
      ) : sample.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-sm space-y-2">
          <ShieldCheck className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="font-extrabold text-base text-navy-900">No completed items to sample</h3>
          <p className="text-xs text-slate-500">As work is completed throughout the day, audit items appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sample.map((item) => {
            const title = (language === 'hi' || language === 'hi_ro') && item.title_hi ? item.title_hi : item.title_en;
            const status = auditedIds[item.id];

            return (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {item.source_module.toUpperCase()}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      Done by {item.assignee_name}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-navy-900 leading-snug">{title}</h4>
                </div>

                {status ? (
                  <div
                    className={`p-2.5 rounded-xl font-extrabold text-xs text-center ${
                      status === 'VERIFIED'
                        ? 'bg-emerald-100 text-emerald-900'
                        : 'bg-lightpink-100 text-lightpink-900'
                    }`}
                  >
                    {status === 'VERIFIED' ? '✅ Verified OK' : '❌ Flagged FALSE (Penalty Applied)'}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => handleAudit(item.id, 'VERIFIED')}
                      className="min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{t.verified}</span>
                    </button>
                    <button
                      onClick={() => handleAudit(item.id, 'FALSE')}
                      className="min-h-[44px] rounded-xl bg-lightpink-500 hover:bg-lightpink-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>{t.markFalse}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
