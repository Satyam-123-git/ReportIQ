import React from 'react';
import { Document, AnalyticsOverview } from '../types';
import { OverviewCards } from '../components/dashboard/OverviewCards';
import { UploadZone } from '../components/dashboard/UploadZone';
import { RecentDocuments } from '../components/dashboard/RecentDocuments';
import { Sparkles, ArrowRight, ShieldCheck, Database, Zap } from 'lucide-react';

interface DashboardPageProps {
  documents: Document[];
  analytics: AnalyticsOverview | null;
  onRefresh: () => void;
  onSelectDocument: (doc: Document) => void;
  onDeleteDocument: (docId: string) => void;
  setActiveTab: (tab: string) => void;
  onOpenViewer?: (doc: Document) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  documents,
  analytics,
  onRefresh,
  onSelectDocument,
  onDeleteDocument,
  setActiveTab,
  onOpenViewer,
}) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-fadeIn">
      
      {/* Hero Welcome Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-navy-900 via-navy-850 to-navy-900 border border-navy-700/80 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-brand-violet/10 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-violet/15 border border-brand-violet/30 text-brand-violet-light text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Government Document Intelligence Platform</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            ReportIQ – AI Government Statistics Navigator
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Upload multi-page statistical PDF reports, query metrics in natural language, and verify answers with exact page citations and programmatic arithmetic.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => setActiveTab('chat')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-violet to-brand-violet-dark text-white text-xs font-semibold shadow-glow-violet hover:opacity-95 transition-all"
            >
              <span>Launch Research Assistant</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-navy-800 hover:bg-navy-750 text-slate-300 text-xs font-semibold border border-navy-700 transition-all"
            >
              <ShieldCheck className="w-4 h-4 text-brand-cyan" />
              <span>Configure AI & Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <OverviewCards stats={analytics} />

      {/* Grid: Upload & Key Capabilities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Upload Zone (2 cols) */}
        <div className="lg:col-span-2">
          <UploadZone onUploadSuccess={onRefresh} />
        </div>

        {/* Feature Highlights Card (1 col) */}
        <div className="p-6 rounded-2xl bg-navy-900 border border-navy-700/80 shadow-card-dark space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-semibold text-white text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-brand-cyan" />
              <span>Core Architecture</span>
            </h3>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 rounded-xl bg-navy-800/80 border border-navy-700/60 space-y-1">
                <span className="font-semibold text-brand-cyan-light">Exact Page Citations</span>
                <p className="text-slate-400">Never hallucinate facts. Every metric links directly to its original PDF page.</p>
              </div>

              <div className="p-3 rounded-xl bg-navy-800/80 border border-navy-700/60 space-y-1">
                <span className="font-semibold text-brand-violet-light">Table Intelligence (Pandas/NumPy)</span>
                <p className="text-slate-400">Executes rankings, totals, percentages, and growth rates mathematically.</p>
              </div>

              <div className="p-3 rounded-xl bg-navy-800/80 border border-navy-700/60 space-y-1">
                <span className="font-semibold text-emerald-400">Hybrid ChromaDB Retrieval</span>
                <p className="text-slate-400">Combines dense embeddings with exact keyword and header matching.</p>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-navy-800 text-[11px] text-slate-500 font-mono">
            ReportIQ Engine v1.0 • Ready for Review
          </div>
        </div>

      </div>

      {/* Recent Documents Section */}
      <RecentDocuments
        documents={documents}
        onSelectDocument={(doc) => {
          onSelectDocument(doc);
          setActiveTab('chat');
        }}
        onDeleteDocument={onDeleteDocument}
        onOpenViewer={onOpenViewer}
      />

    </div>
  );
};
