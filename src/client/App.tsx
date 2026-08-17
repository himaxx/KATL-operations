import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { useLanguage } from './context/LanguageContext';
import { Header } from './components/layout/Header';
import { BottomNav } from './components/layout/BottomNav';
import { LoginView } from './views/auth/LoginView';
import { UserHomeView } from './views/user/UserHomeView';
import { UserScoreView } from './views/user/UserScoreView';
import { UserSystemsView } from './views/user/UserSystemsView';
import { MandateManageView } from './views/mandate/MandateManageView';
import { MandateHomeView } from './views/mandate/MandateHomeView';
import { OwnerOverviewView } from './views/owner/OwnerOverviewView';
import { OwnerScoreView } from './views/owner/OwnerScoreView';
import { OwnerSystemsView } from './views/owner/OwnerSystemsView';
import { Lock, ShieldAlert, Key } from 'lucide-react';

export const App: React.FC = () => {
  const { user, loading, refreshProfile } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<string>('home');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSaving, setPinSaving] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-navy-900 flex items-center justify-center font-black text-white text-lg">
          KA
        </div>
        <div className="w-6 h-6 rounded-full border-2 border-pink-brand border-t-transparent animate-spin" />
        <p className="text-xs font-semibold text-[#9CA3AF]">Loading operations...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  // 1. Force Temporary PIN Reset if logged in with temporary PIN (Section 4.3)
  if (user.requiresNewPin) {
    const handleSaveNewPin = async (e: React.FormEvent) => {
      e.preventDefault();
      setPinError(null);
      if (newPin.length < 4 || newPin.length > 6) {
        setPinError('PIN must be 4 to 6 digits');
        return;
      }
      if (newPin !== confirmPin) {
        setPinError('PINs do not match');
        return;
      }

      setPinSaving(true);
      try {
        const res = await fetch('/api/auth/set-pin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('katl_token')}`,
          },
          body: JSON.stringify({ new_pin: newPin }),
        });
        if (res.ok) {
          await refreshProfile();
        }
      } catch (err: any) {
        setPinError(err.message);
      } finally {
        setPinSaving(false);
      }
    };

    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-5">
        <div className="bg-white border border-[#E8ECF0] rounded-3xl p-6 max-w-sm w-full shadow-sm space-y-5">
          <div className="text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#FFF0FA] flex items-center justify-center mx-auto mb-3">
              <Key className="w-6 h-6 text-pink-brand" />
            </div>
            <h2 className="text-lg font-extrabold text-navy-900">{t.setNewPin}</h2>
            <p className="text-xs text-[#9CA3AF] mt-1">{t.tempPinNotice}</p>
          </div>

          {pinError && (
            <div className="p-3 rounded-xl bg-[#FFF5F8] border border-[#F9BFDF] text-xs font-semibold text-[#9F0E5A] text-center">
              {pinError}
            </div>
          )}

          <form onSubmit={handleSaveNewPin} className="space-y-3">
            <div>
              <label className="text-xs font-bold text-[#374151] block mb-1.5">New 4-Digit PIN</label>
              <input
                type="password"
                maxLength={6}
                required
                placeholder="••••"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                className="w-full min-h-[48px] px-4 bg-[#F9FAFB] border border-[#E8ECF0] rounded-xl text-navy-900 text-xl text-center font-black tracking-[0.4em] focus:border-pink-brand outline-none placeholder:tracking-normal transition-colors"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#374151] block mb-1.5">Confirm New PIN</label>
              <input
                type="password"
                maxLength={6}
                required
                placeholder="••••"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                className="w-full min-h-[48px] px-4 bg-[#F9FAFB] border border-[#E8ECF0] rounded-xl text-navy-900 text-xl text-center font-black tracking-[0.4em] focus:border-pink-brand outline-none placeholder:tracking-normal transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={pinSaving}
              className="w-full min-h-[48px] rounded-xl bg-pink-brand hover:bg-[#C4177A] text-white font-extrabold text-sm transition-all active:scale-[0.98]"
            >
              {pinSaving ? 'Saving...' : 'Activate Account'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. Safe Guard for Users with No Designation (Section 4.1: "A user with no designation can read nothing.")
  if (user.role === 'USER' && (!user.designations || user.designations.length === 0)) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#FFF0FA] flex items-center justify-center">
            <ShieldAlert className="w-7 h-7 text-pink-brand" />
          </div>
          <div className="text-center">
            <h2 className="text-base font-extrabold text-navy-900">Account Ready</h2>
            <p className="text-sm text-[#6B7280] mt-1 max-w-[220px] leading-relaxed">
              Your account is set up. Ask your manager to assign your designation and tasks.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 3. Render Main Role-Based Interface
  const renderTabContent = () => {
    if (user.role === 'OWNER') {
      switch (activeTab) {
        case 'overview':
          return <OwnerOverviewView onNavigateTab={setActiveTab} />;
        case 'scores':
          return <OwnerScoreView />;
        case 'systems':
          return <OwnerSystemsView />;
        case 'manage':
          return <MandateManageView />;
        default:
          return <OwnerOverviewView onNavigateTab={setActiveTab} />;
      }
    }

    if (user.role === 'MANDATE_HOLDER') {
      switch (activeTab) {
        case 'home':
          return <MandateHomeView />;
        case 'scores':
          return <OwnerScoreView />;
        case 'systems':
          return <OwnerSystemsView />;
        case 'manage':
          return <MandateManageView />;
        default:
          return <UserHomeView />;
      }
    }

    // Regular User
    switch (activeTab) {
      case 'home':
        return <UserHomeView />;
      case 'score':
        return <UserScoreView />;
      case 'systems':
        return <UserSystemsView />;
      default:
        return <UserHomeView />;
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <main className="flex-1 overflow-x-hidden">
        {renderTabContent()}
      </main>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};
