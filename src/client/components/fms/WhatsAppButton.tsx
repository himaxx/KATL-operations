import React, { useState } from 'react';
import { Send, Check, AlertTriangle, ExternalLink } from 'lucide-react';
import { generateWhatsAppUrl } from '../../../fms';

interface WhatsAppButtonProps {
  phone: string;
  message: string;
  label?: string;
  checkOptOut?: boolean;
  isOptedOut?: boolean;
  customerId?: string;
  className?: string;
  onSent?: () => void;
}

export const WhatsAppButton: React.FC<WhatsAppButtonProps> = ({
  phone,
  message,
  label = 'Send via WhatsApp',
  checkOptOut = true,
  isOptedOut = false,
  customerId,
  className = '',
  onSent,
}) => {
  const [optedOut, setOptedOut] = useState(isOptedOut);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (checkOptOut && optedOut) {
      setToastMessage('⚠️ Customer has opted out of WhatsApp messages.');
      setTimeout(() => setToastMessage(null), 3500);
      return;
    }

    if (!phone) {
      setToastMessage('⚠️ Phone number not found.');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    const url = generateWhatsAppUrl(phone, message);
    window.open(url, '_blank');
    if (onSent) onSent();
  };

  return (
    <div className="relative inline-block w-full">
      <button
        type="button"
        onClick={handleClick}
        className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-98 shadow-sm ${
          checkOptOut && optedOut
            ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
        } ${className}`}
      >
        <Send className="w-3.5 h-3.5" />
        <span>{label}</span>
        <ExternalLink className="w-3 h-3 opacity-60 ml-0.5" />
      </button>

      {toastMessage && (
        <div className="absolute left-1/2 -translate-x-1/2 -top-10 z-50 bg-navy-900 text-white text-[11px] font-bold py-1 px-3 rounded-lg shadow-lg whitespace-nowrap animate-in fade-in zoom-in-95">
          {toastMessage}
        </div>
      )}
    </div>
  );
};
