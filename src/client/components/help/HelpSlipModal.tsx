import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { X, HelpCircle, Send, CheckCircle2, MessageSquare, Check } from 'lucide-react';
import { AudioRecorder } from './AudioRecorder';

interface HelpSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpSlipModal: React.FC<HelpSlipModalProps> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [textQuery, setTextQuery] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [mySlips, setMySlips] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchSlips = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/help-slips', {
        headers: { Authorization: `Bearer ${localStorage.getItem('katl_token')}` },
      });
      const data = await res.json();
      setMySlips(data.help_slips || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSlips();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textQuery.trim() && !audioUrl) {
      alert('Please enter a question or record a voice note.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/help-slips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('katl_token')}`,
        },
        body: JSON.stringify({
          text_content: textQuery,
          audio_url: audioUrl,
        }),
      });

      if (res.ok) {
        setTextQuery('');
        setAudioUrl('');
        fetchSlips();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnderstood = async (slipId: string) => {
    try {
      await fetch(`/api/help-slips/${slipId}/understand`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('katl_token')}` },
      });
      // Slip automatically disappears
      setMySlips((prev) => prev.filter((s) => s.id !== slipId));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="p-4 bg-navy-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-hotpink" />
            <h2 className="text-base font-extrabold">{t.helpSlipTitle}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-navy-800 text-slate-300 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {/* Form to raise Help Slip */}
          <form onSubmit={handleSubmit} className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-navy-900">
              {t.askForHelp}
            </h3>

            <AudioRecorder onAudioRecorded={setAudioUrl} />

            <div>
              <textarea
                value={textQuery}
                onChange={(e) => setTextQuery(e.target.value)}
                placeholder={t.typeYourQuery}
                rows={3}
                className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:border-hotpink focus:ring-1 focus:ring-hotpink outline-none resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[48px] rounded-xl bg-hotpink hover:bg-hotpink-hover text-white font-extrabold text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? 'Sending...' : t.submitHelpSlip}</span>
            </button>
          </form>

          {/* Active Help Slips List */}
          <div className="space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">
              Active Help Slips
            </h3>

            {mySlips.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No active help slips.</p>
            ) : (
              mySlips.map((slip) => (
                <div key={slip.id} className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full ${
                        slip.status === 'ANSWERED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {slip.status === 'ANSWERED' ? t.answered : t.waitingAnswer}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(slip.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  {slip.text_content && (
                    <p className="text-sm font-medium text-navy-900">{slip.text_content}</p>
                  )}

                  {slip.audio_url && (
                    <audio controls src={slip.audio_url} className="h-8 w-full" />
                  )}

                  {/* Manager Reply Block */}
                  {slip.status === 'ANSWERED' && (
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2">
                      <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Manager Response:</span>
                      </div>
                      <p className="text-sm font-semibold text-emerald-950">{slip.answer_text}</p>
                      
                      <button
                        onClick={() => handleUnderstood(slip.id)}
                        className="w-full min-h-[44px] mt-2 rounded-xl bg-navy-900 hover:bg-navy-800 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm transition"
                      >
                        <Check className="w-4 h-4 text-hotpink" />
                        <span>{t.understood}</span>
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
