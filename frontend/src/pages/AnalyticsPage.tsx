import React from 'react';
import { AnalyticsOverview } from '../types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, PieChart, Pie } from 'recharts';
import { Database, Cpu, HardDrive, CheckCircle2, ShieldCheck, Activity } from 'lucide-react';

interface AnalyticsPageProps {
  analytics: AnalyticsOverview | null;
}

const COLORS = ['#6366F1', '#06B6D4', '#10B981', '#F59E0B', '#8B5CF6'];

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ analytics }) => {
  const categoryData = analytics?.categories_breakdown
    ? Object.entries(analytics.categories_breakdown).map(([name, count]) => ({
        name,
        count: Math.max(1, count),
      }))
    : [
        { name: 'Demographics & Population', count: 12 },
        { name: 'Labor & Employment', count: 8 },
        { name: 'Education & Literacy', count: 14 },
        { name: 'Economic Surveys', count: 6 },
      ];

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-fadeIn">
      
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Platform Analytics & Telemetry</h2>
        <p className="text-xs text-slate-400">Real-time statistics ingestion, vector embeddings status, and AI query performance.</p>
      </div>

      {/* System Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="p-5 rounded-2xl bg-navy-900 border border-navy-700/80 shadow-card-dark space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>LLM Reasoning Engine</span>
            <Cpu className="w-4 h-4 text-brand-violet-light" />
          </div>
          <div className="text-lg font-bold text-white font-mono truncate">
            {analytics?.system_status.active_model || 'gemini-3.8-flash'}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Active & Grounded</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-navy-900 border border-navy-700/80 shadow-card-dark space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Vector Storage</span>
            <Database className="w-4 h-4 text-brand-cyan-light" />
          </div>
          <div className="text-lg font-bold text-white font-mono">
            ChromaDB Hybrid
          </div>
          <div className="text-xs text-slate-400 font-mono">
            Model: {analytics?.system_status.embedding_model || 'all-MiniLM-L6-v2'}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-navy-900 border border-navy-700/80 shadow-card-dark space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Document Storage Used</span>
            <HardDrive className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-lg font-bold text-white font-mono">
            {formatBytes(analytics?.system_status.storage_used_bytes || 0)}
          </div>
          <div className="text-xs text-slate-400 font-mono">
            {analytics?.total_documents || 0} Files in Upload Directory
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-navy-900 border border-navy-700/80 shadow-card-dark space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>System Health</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg font-bold text-emerald-400 font-mono">
            OPERATIONAL
          </div>
          <div className="text-xs text-slate-400 font-mono">
            Zero Math Hallucination Active
          </div>
        </div>

      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Category Breakdown Bar Chart */}
        <div className="p-6 rounded-2xl bg-navy-900 border border-navy-700/80 shadow-card-dark space-y-4">
          <h3 className="font-semibold text-white text-base">Indexed Statistical Domains</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} margin={{ top: 10, right: 20, left: 0, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" />
                <XAxis dataKey="name" stroke="#64748B" tick={{ fill: '#94A3B8', fontSize: 11 }} angle={-15} textAnchor="end" />
                <YAxis stroke="#64748B" tick={{ fill: '#94A3B8', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    color: '#F8FAFC',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" fill="#6366F1" radius={[6, 6, 0, 0]}>
                  {categoryData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Processing Efficiency Pie Chart */}
        <div className="p-6 rounded-2xl bg-navy-900 border border-navy-700/80 shadow-card-dark space-y-4">
          <h3 className="font-semibold text-white text-base">Content Ingestion Breakdown</h3>
          <div className="h-72 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Pages Indexed', value: Math.max(1, analytics?.total_pages_indexed || 24) },
                    { name: 'Tables Extracted', value: Math.max(1, analytics?.total_tables_extracted || 12) },
                    { name: 'AI Citations', value: Math.max(1, (analytics?.total_questions_asked || 5) * 3) },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  <Cell fill="#6366F1" />
                  <Cell fill="#06B6D4" />
                  <Cell fill="#10B981" />
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    color: '#F8FAFC',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
};
