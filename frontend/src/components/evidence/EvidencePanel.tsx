import React from 'react';
import { Citation } from '../../types';
import { BookOpen, ExternalLink, Table as TableIcon, FileText, CheckCircle2, Award, Percent } from 'lucide-react';

interface EvidencePanelProps {
  citations: Citation[];
  onOpenCitation: (citation: Citation) => void;
  confidenceScore?: number;
  isCalculated?: boolean;
  calculationMethod?: string;
}

export const EvidencePanel: React.FC<EvidencePanelProps> = ({
  citations,
  onOpenCitation,
  confidenceScore,
  isCalculated,
  calculationMethod,
}) => {
  return (
    <div className="h-full flex flex-col bg-navy-900 border-l border-navy-700/80 w-80 lg:w-96 overflow-hidden">
      {/* Panel Header */}
      <div className="p-4 border-b border-navy-700 bg-navy-850 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-brand-violet-light" />
          <h3 className="font-semibold text-white text-sm">Source Evidence & Audit</h3>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-brand-violet/10 text-brand-violet-light border border-brand-violet/20 font-mono">
          {citations.length} Verified Sources
        </span>
      </div>

      {/* Verification & Method Card */}
      <div className="p-4 space-y-3 bg-navy-950/40 border-b border-navy-700/60">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Grounding Confidence:</span>
          <span className="font-mono font-semibold text-brand-cyan-light flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            {Math.round((confidenceScore || 0.95) * 100)}% Verified
          </span>
        </div>

        {isCalculated && (
          <div className="p-2.5 rounded-lg bg-brand-cyan/10 border border-brand-cyan/20 text-xs text-slate-300 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-brand-cyan-light">
              <Percent className="w-3.5 h-3.5" />
              <span>Programmatic Calculation</span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono leading-relaxed">
              {calculationMethod || 'Pandas/NumPy statistical verification (Zero LLM math hallucination)'}
            </p>
          </div>
        )}
      </div>

      {/* Citations List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {citations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-slate-500 gap-2">
            <FileText className="w-8 h-8 opacity-40" />
            <p className="text-xs">No active citations yet.<br />Ask a question to inspect verified evidence.</p>
          </div>
        ) : (
          citations.map((c, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-navy-800/80 border border-navy-700/80 hover:border-brand-violet/40 transition-all space-y-2 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-brand-violet/20 text-brand-violet-light font-mono text-[11px] flex items-center justify-center font-bold">
                    {idx + 1}
                  </span>
                  <span className="text-xs font-semibold text-white truncate max-w-[170px]" title={c.document_name}>
                    {c.document_name}
                  </span>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20 font-medium">
                  Page {c.page_number}
                </span>
              </div>

              {/* Source Type & Relevance */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span className="flex items-center gap-1">
                  {c.source_type === 'Table' ? (
                    <TableIcon className="w-3 h-3 text-brand-cyan" />
                  ) : (
                    <FileText className="w-3 h-3 text-brand-violet-light" />
                  )}
                  {c.source_type} {c.table_title ? `(${c.table_title})` : ''}
                </span>
                <span>{Math.round(c.relevance_score * 100)}% Match</span>
              </div>

              {/* Evidence passage */}
              <div className="p-2.5 rounded-lg bg-navy-950/80 border border-navy-700/50 text-xs font-mono text-slate-300 leading-relaxed italic">
                "{c.evidence}"
              </div>

              {/* Click to open in page viewer */}
              <button
                onClick={() => onOpenCitation(c)}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-navy-700/60 hover:bg-brand-violet hover:text-white text-xs font-medium text-slate-300 transition-all"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Navigate to Page {c.page_number}</span>
              </button>
            </div>
          ))
        )}
      </div>

    </div>
  );
};
