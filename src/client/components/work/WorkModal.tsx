import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { X, Play, CheckCircle2, AlertCircle } from 'lucide-react';
import { WorkItem } from './UniversalWorkCard';

interface WorkModalProps {
  item: WorkItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const WorkModal: React.FC<WorkModalProps> = ({ item, isOpen, onClose, onSuccess }) => {
  const { language, t } = useLanguage();
  const [fmsFlow, setFmsFlow] = useState<any>(null);
  const [fmsDef, setFmsDef] = useState<any>(null);
  const [masterLists, setMasterLists] = useState<Record<string, string[]>>({});
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!item || !isOpen) return;
    setError(null);
    setFormData({});
    setNotes('');

    // Mark first opened in backend for bottleneck analysis
    fetch(`/api/work-items/${item.id}/open`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('katl_token')}` },
    });

    if (item.source_module === 'fms' && item.source_ref_id) {
      setLoading(true);
      Promise.all([
        fetch(`/api/fms/flows/${item.source_ref_id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('katl_token')}` },
        }).then((r) => r.json()),
        fetch('/api/fms/definitions', {
          headers: { Authorization: `Bearer ${localStorage.getItem('katl_token')}` },
        }).then((r) => r.json()),
        fetch('/api/admin/master-lists', {
          headers: { Authorization: `Bearer ${localStorage.getItem('katl_token')}` },
        }).then((r) => r.json()),
      ])
        .then(([flowData, defsData, masterData]) => {
          setFmsFlow(flowData.flow);
          const def = defsData.definitions?.find((d: any) => d.code === item.fms_code);
          setFmsDef(def);
          setMasterLists(masterData.master_lists || {});
        })
        .finally(() => setLoading(false));
    }
  }, [item, isOpen]);

  if (!isOpen || !item) return null;

  const title = (language === 'hi' || language === 'hi_ro') && item.title_hi ? item.title_hi : item.title_en;
  const currentStepDef = fmsDef?.steps?.find((s: any) => s.step_no === item.step_no);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (item.source_module === 'fms') {
        const res = await fetch('/api/fms/submit-step', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('katl_token')}`,
          },
          body: JSON.stringify({
            flow_id: item.source_ref_id,
            step_no: item.step_no,
            form_data: formData,
            work_item_id: item.id,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to submit step');
      } else {
        // Checklist or Delegation
        const res = await fetch(`/api/work-items/${item.id}/complete`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('katl_token')}`,
          },
          body: JSON.stringify({ notes }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to complete task');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Submission error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#1A1F36]/60 backdrop-blur-sm animate-slide-up p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#E8ECF0] flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-pink-brand">
              {item.source_module.toUpperCase()}
            </span>
            <h2 className="text-base font-bold text-navy-900 line-clamp-1 mt-0.5">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F4F6F9] hover:bg-[#EBEDF2] flex items-center justify-center transition"
          >
            <X className="w-4 h-4 text-[#6B7280]" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-[#FFF5F8] border border-[#F9BFDF] text-[#9F0E5A] text-sm font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-pink-brand" />
              {error}
            </div>
          )}

          {/* If FMS, show prior visible data (Step-1 / Previous steps summary) */}
          {item.source_module === 'fms' && fmsFlow && (
            <div className="p-3.5 rounded-2xl bg-[#F8F9FB] border border-[#E8ECF0] text-xs space-y-1.5">
              <div className="font-extrabold text-navy-900 text-xs border-b border-[#E8ECF0] pb-1 flex justify-between">
                <span>Flow: {fmsFlow.display_number}</span>
                <span className="text-[#6B7280]">Step {item.step_no} of {fmsDef?.steps?.length || 3}</span>
              </div>
              {fmsFlow.all_form_data && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {Object.entries(fmsFlow.all_form_data).map(([k, v]: any) => (
                    <div key={k}>
                      <span className="text-[10px] uppercase font-bold text-[#9CA3AF] block">{k.replace(/_/g, ' ')}</span>
                      <span className="font-semibold text-navy-900">{String(v)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Form fields */}
          <form id="work-form" onSubmit={handleSubmit} className="space-y-4">
            {item.source_module === 'fms' && currentStepDef ? (
              currentStepDef.questions.map((q: any) => {
                const label = (language === 'hi' || language === 'hi_ro') && q.label.hi ? q.label.hi : q.label.en;
                return (
                  <div key={q.key} className="space-y-1.5">
                    <label className="block text-xs font-bold text-[#374151]">
                      {label} {q.required && <span className="text-pink-brand">*</span>}
                    </label>

                    {q.type === 'select' ? (
                      <select
                        required={q.required}
                        value={formData[q.key] || ''}
                        onChange={(e) => setFormData({ ...formData, [q.key]: e.target.value })}
                        className="w-full min-h-[48px] px-3 py-2 bg-[#F9FAFB] border border-[#E8ECF0] rounded-xl text-sm font-medium text-navy-900 focus:bg-white focus:border-pink-brand outline-none"
                      >
                        <option value="">Select an option...</option>
                        {q.options?.map((opt: string) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : q.type === 'master_list' ? (
                      <select
                        required={q.required}
                        value={formData[q.key] || ''}
                        onChange={(e) => setFormData({ ...formData, [q.key]: e.target.value })}
                        className="w-full min-h-[48px] px-3 py-2 bg-[#F9FAFB] border border-[#E8ECF0] rounded-xl text-sm font-medium text-navy-900 focus:bg-white focus:border-pink-brand outline-none"
                      >
                        <option value="">Select from list...</option>
                        {masterLists[q.master_list_key || '']?.map((item: string) => (
                          <option key={item} value={item}>{item}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={q.type === 'number' ? 'number' : q.type === 'date' ? 'date' : 'text'}
                        required={q.required}
                        value={formData[q.key] || ''}
                        onChange={(e) => setFormData({ ...formData, [q.key]: e.target.value })}
                        placeholder={label}
                        className="w-full min-h-[48px] px-4 bg-[#F9FAFB] border border-[#E8ECF0] rounded-xl text-sm font-medium text-navy-900 focus:bg-white focus:border-pink-brand outline-none transition-colors"
                      />
                    )}
                  </div>
                );
              })
            ) : (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#374151]">
                  Notes / Remarks (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any specific update..."
                  rows={3}
                  className="w-full p-4 bg-[#F9FAFB] border border-[#E8ECF0] rounded-xl text-sm font-medium text-navy-900 focus:bg-white focus:border-pink-brand outline-none resize-none transition-colors"
                />
              </div>
            )}
          </form>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#E8ECF0] flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[48px] rounded-xl bg-[#F4F6F9] text-sm font-bold text-[#6B7280] hover:bg-[#EBEDF2] transition-colors"
          >
            {t.cancel}
          </button>
          <button
            type="submit"
            form="work-form"
            disabled={loading}
            className="flex-1 min-h-[48px] rounded-xl bg-pink-brand hover:bg-[#C4177A] text-white font-extrabold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {loading ? 'Submitting...' : t.submit}
          </button>
        </div>
      </div>
    </div>
  );
};
