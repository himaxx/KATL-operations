import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Home, Clock, BarChart2, Layers, Settings, Eye } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const { user } = useAuth();
  const { t } = useLanguage();

  if (!user) return null;

  const isOwner = user.role === 'OWNER';
  const isMandate = user.role === 'MANDATE_HOLDER';

  const navItems = isOwner
    ? [
        { id: 'overview', label: 'Overview', icon: Eye },
        { id: 'scores',   label: 'Performance', icon: BarChart2 },
        { id: 'systems',  label: 'Systems', icon: Layers },
        { id: 'manage',   label: 'Manage', icon: Settings },
      ]
    : isMandate
    ? [
        { id: 'home',    label: 'Home', icon: Home },
        { id: 'scores',  label: 'Performance', icon: BarChart2 },
        { id: 'systems', label: 'Systems', icon: Layers },
        { id: 'manage',  label: 'Manage', icon: Settings },
      ]
    : [
        { id: 'home',    label: 'Home', icon: Home },
        { id: 'score',   label: 'Score', icon: BarChart2 },
        { id: 'systems', label: 'Systems', icon: Layers },
      ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-[#E8ECF0]">
      <div className="max-w-md mx-auto flex items-stretch h-[62px]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className="flex-1 flex flex-col items-center justify-center gap-1 transition-all duration-150 active:scale-95 relative"
            >
              {/* Active pill background */}
              {isActive && (
                <span className="absolute inset-x-2 inset-y-1.5 rounded-2xl bg-pink-soft pointer-events-none" />
              )}
              <Icon
                className={`w-5 h-5 relative z-10 transition-colors ${
                  isActive ? 'text-pink-brand' : 'text-[#9CA3AF]'
                }`}
                strokeWidth={isActive ? 2.2 : 1.8}
              />
              <span
                className={`text-[11px] font-semibold relative z-10 transition-colors ${
                  isActive ? 'text-pink-brand' : 'text-[#9CA3AF]'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
