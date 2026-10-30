import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { ChartData } from '../../types';
import { BarChart3, FileText } from 'lucide-react';

interface ChartRendererProps {
  chartData: ChartData;
  onPageClick?: (page: number) => void;
}

const BAR_COLORS = ['#6366F1', '#06B6D4', '#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6'];

export const ChartRenderer: React.FC<ChartRendererProps> = ({ chartData, onPageClick }) => {
  if (!chartData || !chartData.data || chartData.data.length === 0) {
    return null;
  }

  const { title, description, x_key, y_keys, data, source_page, source_document } = chartData;

  return (
    <div className="mt-4 p-5 rounded-xl bg-navy-900 border border-navy-700/80 shadow-card-dark space-y-4">
      {/* Title & Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-brand-violet/10 text-brand-violet-light border border-brand-violet/20">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">{title}</h4>
            {description && <p className="text-xs text-slate-400">{description}</p>}
          </div>
        </div>

        {source_page && (
          <button
            onClick={() => onPageClick && onPageClick(source_page)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-brand-cyan/10 hover:bg-brand-cyan/20 border border-brand-cyan/30 text-xs font-mono text-brand-cyan transition-colors"
          >
            <FileText className="w-3 h-3" />
            <span>Page {source_page}</span>
          </button>
        )}
      </div>

      {/* Chart Canvas */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {chartData.chart_type === 'line' ? (
            <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" />
              <XAxis
                dataKey={x_key}
                stroke="#64748B"
                tick={{ fill: '#94A3B8', fontSize: 11 }}
                angle={-20}
                textAnchor="end"
              />
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
              <Line
                type="monotone"
                dataKey={y_keys[0] || 'value'}
                stroke="#6366F1"
                strokeWidth={3}
                dot={{ fill: '#06B6D4', r: 4 }}
              />
            </LineChart>
          ) : (
            <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" />
              <XAxis
                dataKey={x_key}
                stroke="#64748B"
                tick={{ fill: '#94A3B8', fontSize: 11 }}
                angle={-20}
                textAnchor="end"
              />
              <YAxis stroke="#64748B" tick={{ fill: '#94A3B8', fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0F172A',
                  borderColor: '#334155',
                  borderRadius: '8px',
                  color: '#F8FAFC',
                  fontSize: '12px',
                }}
                formatter={(val: any) => [Number(val).toLocaleString(), y_keys[0] || 'Value']}
              />
              <Bar dataKey={y_keys[0] || 'value'} radius={[4, 4, 0, 0]}>
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Footer attribution */}
      <div className="pt-2 border-t border-navy-800 flex justify-between items-center text-[11px] text-slate-500 font-mono">
        <span>Verified from {source_document || 'official report'}</span>
        <span>Recharts Visualizer</span>
      </div>
    </div>
  );
};
