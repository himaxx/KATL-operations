import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

export interface DoneItem {
  id: string;
  titleEn: string;
  titleHi: string;
  plannedAt: string | Date;
  completedAt: string | Date;
  isOnTime: boolean;
  isImportant: boolean;
}

interface DoneListProps {
  items: DoneItem[];
}

export const DoneList: React.FC<DoneListProps> = ({ items }) => {
  const { language, t } = useLanguage();

  if (!items || items.length === 0) {
    return (
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center">
        <p className="text-xs text-slate-500 font-medium">No tasks completed yet in this period.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Completed Tasks ({items.length})</span>
        </h3>
        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-200">
          Recorded in MIS
        </span>
      </div>

      <div className="space-y-2">
        {items.map((item) => {
          const title = (language === 'hi' || language === 'hi_ro') && item.titleHi ? item.titleHi : item.titleEn;
          const completedDate = new Date(item.completedAt);
          const timeFormatted = completedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const dateFormatted = completedDate.toLocaleDateString([], { month: 'short', day: 'numeric' });

          return (
            <div
              key={item.id}
              className="p-3.5 rounded-2xl bg-white border border-emerald-200 shadow-xs flex items-center justify-between gap-3"
            >
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {item.isImportant && (
                    <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Important (3x)
                    </span>
                  )}
                  {item.isOnTime ? (
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                      On Time
                    </span>
                  ) : (
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                      Delayed Submission
                    </span>
                  )}
                </div>

                <p className="font-bold text-xs text-navy-900 truncate">
                  {title}
                </p>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[11px] font-extrabold text-emerald-700 block">
                  {timeFormatted}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  {dateFormatted}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
