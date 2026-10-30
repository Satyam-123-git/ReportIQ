import React from 'react';
import { FileText, Layers, Table as TableIcon, MessageSquare, Cpu, CheckCircle2 } from 'lucide-react';
import { AnalyticsOverview } from '../../types';

interface OverviewCardsProps {
  stats: AnalyticsOverview | null;
}

export const OverviewCards: React.FC<OverviewCardsProps> = ({ stats }) => {
  const cards = [
    {
      title: 'Total Documents Processed',
      value: stats?.total_documents ?? 0,
      subtext: 'Official statistical reports',
      icon: FileText,
      color: 'from-brand-violet to-indigo-600',
      textColor: 'text-brand-violet-light',
    },
    {
      title: 'Total Pages Indexed',
      value: stats?.total_pages_indexed ?? 0,
      subtext: 'Preserved 1:1 citations',
      icon: Layers,
      color: 'from-brand-cyan to-teal-600',
      textColor: 'text-brand-cyan-light',
    },
    {
      title: 'Tables & Datasets Extracted',
      value: stats?.total_tables_extracted ?? 0,
      subtext: 'Structured tabular data',
      icon: TableIcon,
      color: 'from-emerald-500 to-green-600',
      textColor: 'text-emerald-400',
    },
    {
      title: 'AI Queries & Verifications',
      value: stats?.total_questions_asked ?? 0,
      subtext: 'Zero-hallucination Q&A',
      icon: MessageSquare,
      color: 'from-amber-500 to-orange-600',
      textColor: 'text-amber-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="p-5 rounded-2xl bg-navy-900/90 border border-navy-700/80 shadow-card-dark relative overflow-hidden group hover:border-brand-violet/40 transition-all duration-200"
          >
            {/* Ambient Background Gradient Accent */}
            <div className={`absolute -right-6 -bottom-6 w-24 h-24 bg-gradient-to-tr ${card.color} opacity-10 rounded-full blur-xl group-hover:opacity-20 transition-opacity`} />

            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                {card.title}
              </span>
              <div className={`p-2 rounded-xl bg-navy-800 border border-navy-700/60 ${card.textColor}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-3xl font-extrabold text-white font-mono tracking-tight">
                {card.value.toLocaleString()}
              </div>
              <p className="text-xs text-slate-400 font-medium">{card.subtext}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
