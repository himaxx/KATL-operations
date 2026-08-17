import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Video, Plus, ExternalLink, CheckCircle2 } from 'lucide-react';

export const VideoBacklogView: React.FC = () => {
  const { t } = useLanguage();
  const [missingVideos, setMissingVideos] = useState<any[]>([]);
  const [healthData, setHealthData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/video-backlog', {
        headers: { Authorization: `Bearer ${localStorage.getItem('katl_token')}` },
      }).then((r) => r.json()),
      fetch('/api/admin/health', {
        headers: { Authorization: `Bearer ${localStorage.getItem('katl_token')}` },
      }).then((r) => r.json()),
    ])
      .then(([videoData, hData]) => {
        setMissingVideos(videoData.missing_videos || []);
        setHealthData(hData);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-extrabold text-navy-900">{t.videoBacklog}</h2>
        <p className="text-xs text-slate-500">MIS Management: Upkeep and clear video backlog</p>
      </div>

      {/* System Health Block */}
      {healthData && (
        <div className="p-4 rounded-2xl bg-navy-900 text-white space-y-2 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">System Health</span>
            <span className="text-xs font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
              {healthData.status}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2 text-center">
            <div className="p-2 rounded-xl bg-navy-800">
              <span className="text-[10px] text-slate-400 uppercase block font-bold">Total Staff</span>
              <span className="text-base font-extrabold text-white">{healthData.stats.total_users}</span>
            </div>
            <div className="p-2 rounded-xl bg-navy-800">
              <span className="text-[10px] text-slate-400 uppercase block font-bold">Work Records</span>
              <span className="text-base font-extrabold text-hotpink">{healthData.stats.total_work_items}</span>
            </div>
            <div className="p-2 rounded-xl bg-navy-800">
              <span className="text-[10px] text-slate-400 uppercase block font-bold">Live Flows</span>
              <span className="text-base font-extrabold text-white">{healthData.stats.active_flows}</span>
            </div>
          </div>
        </div>
      )}

      {/* Missing Videos Checklist */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-400">
            Checklists Requiring Training Video ({missingVideos.length})
          </h3>
        </div>

        {loading ? (
          <div className="h-24 rounded-2xl bg-slate-200/70 animate-pulse" />
        ) : missingVideos.length === 0 ? (
          <div className="p-6 text-center bg-white rounded-2xl border border-slate-200 space-y-1">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <h4 className="font-extrabold text-sm text-navy-900">All Training Videos Complete!</h4>
            <p className="text-xs text-slate-500">Every single checklist has a video attached.</p>
          </div>
        ) : (
          missingVideos.map((item) => (
            <div key={item.id} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-lightpink-100 text-lightpink-900">
                  Missing Video
                </span>
                <span className="text-xs font-semibold text-slate-400">{item.frequency}</span>
              </div>
              <h4 className="font-bold text-sm text-navy-900">{item.title_en}</h4>
              <p className="text-xs text-slate-500 font-hindi">{item.title_hi}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
