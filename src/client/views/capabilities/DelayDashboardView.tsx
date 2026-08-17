import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Clock, Phone, MessageSquare, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const DelayDashboardView: React.FC = () => {
  const { language, t } = useLanguage();
  const [lateItems, setLateItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLateItems = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/audit/delay-dashboard', {
        headers: { Authorization: `Bearer ${localStorage.getItem('katl_token')}` },
      });
      const data = await res.json();
      setLateItems(data.late_items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLateItems();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-navy-900">{t.delayDashboard}</h2>
          <p className="text-xs text-slate-500">Live tracker for all overdue work company-wide</p>
        </div>
        <span className="text-xs font-black px-2.5 py-1 rounded-full bg-lightpink-100 text-lightpink-900 border border-lightpink-300">
          {lateItems.length} Overdue
        </span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-200/70 animate-pulse" />
          ))}
        </div>
      ) : lateItems.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-sm space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
          <h3 className="font-extrabold text-base text-navy-900">Zero Delays!</h3>
          <p className="text-xs text-slate-500">Every single task across all systems is currently on track.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lateItems.map((item) => {
            const title = (language === 'hi' || language === 'hi_ro') && item.title_hi ? item.title_hi : item.title_en;
            return (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-lightpink-50 border border-lightpink-300 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-lightpink-200 text-lightpink-900">
                      {item.delay_hours} hrs late
                    </span>
                    <h4 className="font-extrabold text-sm text-navy-900 leading-snug">{title}</h4>
                    <p className="text-xs font-semibold text-slate-600">Assignee: {item.assignee_name}</p>
                  </div>
                </div>

                {/* 1-Tap Action Triggers */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-lightpink-200">
                  <a
                    href={item.whatsapp_url}
                    target="_blank"
                    rel="noreferrer"
                    className="min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>WhatsApp</span>
                  </a>

                  <a
                    href={item.call_url}
                    className="min-h-[44px] rounded-xl bg-navy-900 hover:bg-navy-800 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition"
                  >
                    <Phone className="w-4 h-4" />
                    <span>{t.callNow}</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
