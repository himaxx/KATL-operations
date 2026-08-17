import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { CheckCircle, Clock } from 'lucide-react';

interface ScoreGaugeProps {
  workDone: string; // "-0%" or "-20%"
  workOnTime: string; // "-0%" or "-50%"
  numericDone?: number;
  numericOnTime?: number;
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({ workDone, workOnTime }) => {
  const { t } = useLanguage();

  const isDonePerfect = workDone === '0%' || workDone === '-0%';
  const isOnTimePerfect = workOnTime === '0%' || workOnTime === '-0%';

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* 1. Work Done Gauge */}
      <div
        className={`rounded-2xl p-4 border transition-all ${
          isDonePerfect
            ? 'bg-gradient-to-br from-navy-900 to-navy-800 text-white border-navy-700 shadow-md'
            : 'bg-lightpink-50 border-lightpink-300 text-navy-900'
        }`}
      >
        <div className="flex items-center gap-2 mb-2">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              isDonePerfect ? 'bg-hotpink text-white' : 'bg-lightpink-200 text-lightpink-800'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
          </div>
          <span className={`text-xs font-extrabold uppercase tracking-wider ${isDonePerfect ? 'text-slate-200' : 'text-slate-600'}`}>
            {t.workDone}
          </span>
        </div>

        <div className="flex items-baseline gap-1 mt-1">
          <span className={`text-3xl font-black tracking-tight ${isDonePerfect ? 'text-white' : 'text-lightpink-900'}`}>
            {workDone}
          </span>
        </div>

        <p className={`text-[11px] mt-1.5 leading-snug ${isDonePerfect ? 'text-slate-300' : 'text-lightpink-700'}`}>
          {isDonePerfect ? '100% of all assigned work finished' : 'Unfinished work penalty'}
        </p>
      </div>

      {/* 2. Work On Time Gauge */}
      <div
        className={`rounded-2xl p-4 border transition-all ${
          isOnTimePerfect
            ? 'bg-gradient-to-br from-navy-900 to-navy-800 text-white border-navy-700 shadow-md'
            : 'bg-lightpink-50 border-lightpink-300 text-navy-900'
        }`}
      >
        <div className="flex items-center gap-2 mb-2">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              isOnTimePerfect ? 'bg-hotpink text-white' : 'bg-lightpink-200 text-lightpink-800'
            }`}
          >
            <Clock className="w-4 h-4" />
          </div>
          <span className={`text-xs font-extrabold uppercase tracking-wider ${isOnTimePerfect ? 'text-slate-200' : 'text-slate-600'}`}>
            {t.workOnTime}
          </span>
        </div>

        <div className="flex items-baseline gap-1 mt-1">
          <span className={`text-3xl font-black tracking-tight ${isOnTimePerfect ? 'text-white' : 'text-lightpink-900'}`}>
            {workOnTime}
          </span>
        </div>

        <p className={`text-[11px] mt-1.5 leading-snug ${isOnTimePerfect ? 'text-slate-300' : 'text-lightpink-700'}`}>
          {isOnTimePerfect ? 'All work delivered by planned time' : 'Late completion penalty'}
        </p>
      </div>
    </div>
  );
};
