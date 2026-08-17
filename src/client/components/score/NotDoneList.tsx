import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { AlertOctagon, AlertTriangle, ShieldAlert } from 'lucide-react';
import { NotDoneItem } from '../../../core/scoring/engine';

interface NotDoneListProps {
  items: NotDoneItem[];
}

export const NotDoneList: React.FC<NotDoneListProps> = ({ items }) => {
  const { language, t } = useLanguage();

  if (!items || items.length === 0) return null;

  return (
    <div className="space-y-3 mt-6">
      <div className="flex items-center justify-between">
        <h3 className="font-extrabold text-sm text-navy-900 flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 text-lightpink-700" />
          {t.notDoneList}
        </h3>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-lightpink-100 text-lightpink-800 border border-lightpink-300">
          {items.length} items
        </span>
      </div>

      <div className="space-y-2.5">
        {items.map((item) => {
          const title = (language === 'hi' || language === 'hi_ro') && item.titleHi ? item.titleHi : item.titleEn;
          const plannedDate = new Date(item.plannedAt).toLocaleDateString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <div
              key={item.id}
              className={`p-3.5 rounded-2xl border transition-all ${
                item.isFlaggedFalse
                  ? 'bg-lightpink-100/90 border-lightpink-300 shadow-sm'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  {item.isImportant && (
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase font-black px-2 py-0.5 rounded bg-lightpink-200 text-lightpink-900">
                      <AlertTriangle className="w-3 h-3 text-lightpink-700" />
                      {t.important}
                    </span>
                  )}
                  <h4 className="font-bold text-sm text-navy-900 leading-snug">
                    {title}
                  </h4>
                </div>

                <span className="text-[11px] font-semibold text-slate-400 whitespace-nowrap">
                  {plannedDate}
                </span>
              </div>

              {/* Special Pink Attribution for Process Coordinator False Flag */}
              {item.isFlaggedFalse && (
                <div className="mt-2 pt-2 border-t border-lightpink-200 flex items-center gap-1.5 text-xs font-bold text-lightpink-900">
                  <ShieldAlert className="w-4 h-4 text-lightpink-700 shrink-0" />
                  <span>
                    {t.flaggedFalseNotice} {item.checkedByName || 'Process Coordinator'}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
