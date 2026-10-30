import React, { useState } from 'react';
import { Message, Citation } from '../../types';
import { ChartRenderer } from './ChartRenderer';
import { Copy, Check, FileText, Table as TableIcon, Bot, User, Calculator, ArrowRight } from 'lucide-react';

interface MessageItemProps {
  message: Message;
  onOpenCitation: (citation: Citation) => void;
  documentName?: string;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message, onOpenCitation, documentName }) => {
  const [copied, setCopied] = useState<boolean>(false);
  const isAssistant = message.role === 'assistant';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex gap-4 p-5 rounded-2xl transition-all ${
      isAssistant 
        ? 'bg-navy-900/90 border border-navy-700/80 shadow-card-dark' 
        : 'bg-navy-800/60 border border-navy-700/40 ml-8'
    }`}>
      {/* Role Avatar */}
      <div className="shrink-0">
        {isAssistant ? (
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-violet to-brand-cyan p-0.5 shadow-glow-violet">
            <div className="w-full h-full bg-navy-900 rounded-[10px] flex items-center justify-center text-brand-violet-light">
              <Bot className="w-5 h-5" />
            </div>
          </div>
        ) : (
          <div className="w-9 h-9 rounded-xl bg-navy-700 border border-navy-600 flex items-center justify-center text-slate-300">
            <User className="w-5 h-5" />
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 space-y-3 overflow-hidden">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-white">
              {isAssistant ? 'ReportIQ Engine' : 'Researcher'}
            </span>
            {isAssistant && message.is_calculated && (
              <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/30 font-mono">
                <Calculator className="w-3 h-3" />
                Verified Calculation
              </span>
            )}
          </div>

          {/* Copy Button */}
          {isAssistant && (
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-md hover:bg-navy-800 text-slate-400 hover:text-white transition-colors"
              title="Copy answer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* Question text (if stored on message) */}
        {!isAssistant && message.question && (
          <p className="text-sm font-medium text-slate-100">{message.question}</p>
        )}

        {/* Answer text */}
        {isAssistant && (
          <div className="prose prose-invert max-w-none text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
            {message.answer}
          </div>
        )}

        {/* Visual Chart if available */}
        {isAssistant && message.chart_data && (
          <ChartRenderer
            chartData={message.chart_data}
            onPageClick={(page) => {
              if (message.citations.length > 0) {
                const target = message.citations.find((c) => c.page_number === page) || message.citations[0];
                onOpenCitation(target);
              }
            }}
          />
        )}

        {/* Citations Row */}
        {isAssistant && message.citations && message.citations.length > 0 && (
          <div className="pt-3 border-t border-navy-800 space-y-2">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 flex items-center gap-1.5">
              <span>Supporting Citations ({message.citations.length})</span>
            </span>
            <div className="flex flex-wrap gap-2">
              {message.citations.map((c, idx) => (
                <button
                  key={idx}
                  onClick={() => onOpenCitation(c)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-800 hover:bg-navy-700/80 border border-navy-700 hover:border-brand-violet/50 text-xs text-slate-300 hover:text-white transition-all group shadow-sm"
                >
                  {c.source_type === 'Table' ? (
                    <TableIcon className="w-3.5 h-3.5 text-brand-cyan" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-brand-violet-light" />
                  )}
                  <span className="font-medium text-white">{c.document_name}</span>
                  <span className="font-mono text-brand-cyan-light bg-navy-950 px-1.5 py-0.5 rounded border border-navy-700/50">
                    p. {c.page_number}
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-brand-violet-light transition-transform group-hover:translate-x-0.5" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
