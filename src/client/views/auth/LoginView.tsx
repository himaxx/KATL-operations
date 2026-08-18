import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { ArrowRight, Phone, ShieldCheck, Sparkles } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { loginStaff, loginAdmin } = useAuth();
  const { language, setLanguage } = useLanguage();

  const [tab, setTab] = useState<'staff' | 'admin'>('staff');
  const [mobile, setMobile] = useState('');
  const [pin, setPin] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (tab === 'staff') {
        const res = await loginStaff(mobile, pin);
        if (!res.success) setError(res.error || 'Login failed. Check your mobile number and PIN.');
      } else {
        const res = await loginAdmin(username, password);
        if (!res.success) setError(res.error || 'Invalid credentials.');
      }
    } catch (err: any) {
      setError(err.message || 'Login error');
    } finally {
      setLoading(false);
    }
  };

  const quickFill = async (type: 'staff' | 'admin', v1: string, v2: string) => {
    setTab(type);
    setError(null);
    if (type === 'staff') {
      setMobile(v1);
      setPin(v2);
      setLoading(true);
      try {
        const res = await loginStaff(v1, v2);
        if (!res.success) setError(res.error || 'Login failed');
      } catch (err: any) {
        setError(err.message || 'Login error');
      } finally {
        setLoading(false);
      }
    } else {
      setUsername(v1);
      setPassword(v2);
      setLoading(true);
      try {
        const res = await loginAdmin(v1, v2);
        if (!res.success) setError(res.error || 'Login failed');
      } catch (err: any) {
        setError(err.message || 'Login error');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top header bar */}
      <div className="px-5 pt-10 pb-6 border-b border-[#E8ECF0] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-navy-900 flex items-center justify-center">
            <span className="text-white font-black text-sm">KA</span>
          </div>
          <div>
            <p className="font-extrabold text-sm text-navy-900">Ketan Aditya Textiles</p>
            <p className="text-[11px] text-[#9CA3AF]">Internal Operations</p>
          </div>
        </div>
        {/* Language picker */}
        <div className="flex items-center gap-1 bg-[#F4F6F9] rounded-lg p-1">
          {(['en', 'hi', 'hi_ro'] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                language === lang ? 'bg-white text-navy-900 shadow-sm' : 'text-[#9CA3AF]'
              }`}
            >
              {lang === 'en' ? 'EN' : lang === 'hi' ? 'हिं' : 'Hin'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-5 pt-8 pb-6 max-w-md mx-auto w-full">
        {/* Hero text */}
        <div className="mb-8">
          <h1 className="text-2xl font-black text-navy-900 leading-tight">
            Welcome back.
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Sign in to access your daily tasks and operations.
          </p>
        </div>

        {/* Tab toggle */}
        <div className="flex rounded-xl overflow-hidden border border-[#E8ECF0] mb-6">
          <button
            type="button"
            onClick={() => { setTab('staff'); setError(null); }}
            className={`flex-1 py-2.5 text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
              tab === 'staff'
                ? 'bg-navy-900 text-white'
                : 'bg-white text-[#6B7280] hover:bg-[#F9FAFB]'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Staff (Mobile + PIN)</span>
          </button>
          <button
            type="button"
            onClick={() => { setTab('admin'); setError(null); }}
            className={`flex-1 py-2.5 text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
              tab === 'admin'
                ? 'bg-navy-900 text-white'
                : 'bg-white text-[#6B7280] hover:bg-[#F9FAFB]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admin / Owner</span>
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-[#FFF5F8] border border-[#F9BFDF] text-xs font-semibold text-[#9F0E5A]">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === 'staff' ? (
            <>
              <div>
                <label className="block text-xs font-bold text-[#374151] mb-1.5">Mobile Number</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 7771002882"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full min-h-[48px] px-4 bg-[#F9FAFB] border border-[#E8ECF0] rounded-xl text-navy-900 text-base font-semibold focus:border-pink-brand focus:bg-white outline-none placeholder:text-[#D1D5DB] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#374151] mb-1.5">4-Digit PIN</label>
                <input
                  type="password"
                  maxLength={6}
                  required
                  placeholder="••••"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full min-h-[48px] px-4 bg-[#F9FAFB] border border-[#E8ECF0] rounded-xl text-navy-900 text-xl text-center font-black tracking-[0.4em] focus:border-pink-brand focus:bg-white outline-none placeholder:text-[#D1D5DB] placeholder:tracking-normal transition-colors"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-bold text-[#374151] mb-1.5">Username / Email</label>
                <input
                  type="text"
                  required
                  placeholder="hello@ketan or mis@ketan"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full min-h-[48px] px-4 bg-[#F9FAFB] border border-[#E8ECF0] rounded-xl text-navy-900 text-base font-semibold focus:border-pink-brand focus:bg-white outline-none placeholder:text-[#D1D5DB] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#374151] mb-1.5">Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full min-h-[48px] px-4 bg-[#F9FAFB] border border-[#E8ECF0] rounded-xl text-navy-900 text-base font-semibold focus:border-pink-brand focus:bg-white outline-none placeholder:text-[#D1D5DB] transition-colors"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[52px] rounded-2xl bg-pink-brand hover:bg-[#C4177A] active:scale-[0.98] text-white font-extrabold text-base flex items-center justify-center gap-2 transition-all mt-2 shadow-sm"
          >
            <span>{loading ? 'Signing in...' : 'Sign In'}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>

        {/* Quick Demo */}
        <div className="mt-8 pt-5 border-t border-[#E8ECF0]">
          <div className="flex items-center gap-1.5 text-[#9CA3AF] text-[11px] font-semibold uppercase tracking-widest mb-3">
            <Sparkles className="w-3 h-3 text-pink-brand" />
            Quick Demo Login
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: '👑 Owner', type: 'admin' as const, v1: 'hello@ketan', v2: 'Hello@Ketan' },
              { label: '⭐ MIS Admin', type: 'admin' as const, v1: 'mis@ketan', v2: 'MIS@Ketan' },
              { label: '📊 Akash (Acct)', type: 'staff' as const, v1: '7771002882', v2: '1234' },
              { label: '📦 Ankit (WH)', type: 'staff' as const, v1: '7869217249', v2: '1234' },
              { label: '⏱️ Kanchan (PC)', type: 'staff' as const, v1: '9876543210', v2: '1234' },
              { label: '📋 Sapna (EA)', type: 'staff' as const, v1: '8839364733', v2: '1234' },
            ].map((d) => (
              <button
                key={d.label}
                type="button"
                onClick={() => quickFill(d.type, d.v1, d.v2)}
                className="p-2.5 rounded-xl bg-[#F9FAFB] hover:bg-[#F0F2F5] border border-[#E8ECF0] text-left text-xs font-semibold text-navy-900 transition-colors"
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="text-center text-[11px] text-[#D1D5DB] pb-6 px-4">
        Ketan Aditya Textiles · Confidential Internal Operations
      </div>
    </div>
  );
};
