import React from 'react';
import { BarChart3, ShieldCheck, Sparkles, Database, FileText, Cpu } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  systemStatus?: {
    status: string;
    gemini_api_configured: boolean;
  };
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, systemStatus }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'chat', label: 'AI Assistant', icon: Sparkles },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'analytics', label: 'Analytics', icon: Database },
    { id: 'history', label: 'History', icon: Cpu },
    { id: 'settings', label: 'Settings', icon: ShieldCheck },
  ];

  return (
    <header className="border-b border-navy-700 bg-navy-900/90 backdrop-blur-md sticky top-0 z-40 px-6 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo and Brand */}
        <div 
          className="flex items-center gap-3 cursor-pointer select-none group"
          onClick={() => setActiveTab('dashboard')}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-violet to-brand-cyan p-0.5 shadow-glow-violet transition-transform group-hover:scale-105">
            <div className="w-full h-full bg-navy-900 rounded-[10px] flex items-center justify-center">
              <span className="font-bold text-transparent bg-clip-text bg-gradient-to-tr from-brand-violet-light to-brand-cyan-light text-lg">
                RQ
              </span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold tracking-tight text-white group-hover:text-brand-cyan-light transition-colors">
                Report<span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-violet-light to-brand-cyan">IQ</span>
              </span>
              <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-brand-violet/20 text-brand-violet-light border border-brand-violet/30">
                GovStats AI
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">Grounded Statistics & Citation Navigator</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-navy-800/80 p-1.5 rounded-xl border border-navy-700/60 shadow-inner">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-brand-violet to-brand-violet-dark text-white shadow-glow-violet'
                    : 'text-slate-300 hover:text-white hover:bg-navy-700/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* System Status Pill */}
        <div className="flex items-center gap-3">
          <div 
            onClick={() => setActiveTab('settings')}
            className="cursor-pointer flex items-center gap-2 px-3 py-1.5 rounded-lg bg-navy-800 border border-navy-700 hover:border-brand-violet/50 transition-all text-xs"
          >
            <div className={`w-2 h-2 rounded-full animate-pulse ${systemStatus?.gemini_api_configured ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <span className="text-slate-300 font-mono">
              {systemStatus?.gemini_api_configured ? 'Gemini 3.8 Flash' : 'Deterministic Mode'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
