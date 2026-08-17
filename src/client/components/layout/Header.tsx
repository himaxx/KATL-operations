import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { LogOut } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { language, setLanguage } = useLanguage();

  if (!user) return null;

  const initials = user.name
    ? user.name
        .split(' ')
        .slice(0, 2)
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
    : 'KA';

  const roleLabel =
    user.role === 'OWNER'
      ? 'Owner'
      : user.role === 'MANDATE_HOLDER'
      ? 'Mandate Holder'
      : user.designations?.[0] || 'Staff';

  return (
    <header className="bg-white border-b border-[#E8ECF0] sticky top-0 z-30">
      <div className="max-w-md mx-auto px-5 py-3.5 flex items-center justify-between">
        {/* Left: Avatar + Name + Role */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-navy-900 flex items-center justify-center text-white font-black text-sm shrink-0">
            {initials}
          </div>
          <div>
            <p className="font-bold text-sm text-navy-900 leading-tight">{user.name}</p>
            <p className="text-[11px] text-pink-brand font-semibold leading-tight">{roleLabel}</p>
          </div>
        </div>

        {/* Right: Language + Log out */}
        <div className="flex items-center gap-3">
          {/* Language selector — minimal */}
          <div className="flex items-center gap-1 bg-[#F4F6F9] rounded-lg px-1.5 py-1">
            {(['en', 'hi', 'hi_ro'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${
                  language === lang
                    ? 'bg-white text-navy-900 shadow-sm'
                    : 'text-[#9CA3AF]'
                }`}
              >
                {lang === 'en' ? 'EN' : lang === 'hi' ? 'हिं' : 'Hin'}
              </button>
            ))}
          </div>

          <button
            onClick={logout}
            className="text-[#9CA3AF] hover:text-navy-900 text-xs font-semibold transition-colors min-h-[36px] px-2"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
};
