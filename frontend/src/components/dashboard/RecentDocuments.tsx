import React from 'react';
import { Document } from '../../types';
import { FileText, Trash2, MessageSquare, ExternalLink, Loader2, CheckCircle2, AlertTriangle, Table as TableIcon } from 'lucide-react';

interface RecentDocumentsProps {
  documents: Document[];
  onSelectDocument: (doc: Document) => void;
  onDeleteDocument: (docId: string) => void;
  onOpenViewer?: (doc: Document) => void;
}

export const RecentDocuments: React.FC<RecentDocumentsProps> = ({
  documents,
  onSelectDocument,
  onDeleteDocument,
  onOpenViewer,
}) => {
  const getStatusBadge = (status: string, message?: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Indexed</span>
          </span>
        );
      case 'processing':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-brand-cyan/10 text-brand-cyan-light border border-brand-cyan/20 animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Indexing...</span>
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20" title={message}>
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Failed</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span>Pending</span>
          </span>
        );
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (documents.length === 0) {
    return (
      <div className="p-8 rounded-2xl bg-navy-900 border border-navy-700/80 text-center text-slate-400 space-y-2">
        <FileText className="w-10 h-10 mx-auto opacity-30 text-slate-500" />
        <p className="text-sm font-medium">No statistical reports uploaded yet.</p>
        <p className="text-xs text-slate-500">Upload a government statistical PDF report above to begin.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-navy-900 border border-navy-700/80 shadow-card-dark overflow-hidden">
      <div className="p-5 border-b border-navy-700/80 bg-navy-850 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-white text-base">Indexed Government Reports</h3>
          <p className="text-xs text-slate-400">Multi-page PDFs ready for grounded citation-based Q&A</p>
        </div>
        <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-navy-800 border border-navy-700 text-slate-300">
          {documents.length} Files
        </span>
      </div>

      <div className="divide-y divide-navy-800">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-navy-850/60 transition-colors"
          >
            {/* File info */}
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-brand-violet/10 text-brand-violet-light border border-brand-violet/20 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-white text-sm hover:text-brand-cyan-light cursor-pointer transition-colors" onClick={() => onSelectDocument(doc)}>
                    {doc.original_filename}
                  </h4>
                  {getStatusBadge(doc.processing_status, doc.status_message)}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono">
                  <span>{doc.total_pages} Pages</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <TableIcon className="w-3 h-3 text-brand-cyan" />
                    {doc.total_tables} Tables
                  </span>
                  <span>•</span>
                  <span>{formatFileSize(doc.file_size)}</span>
                  <span>•</span>
                  <span>{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 self-end sm:self-center">
              {/* Chat action */}
              <button
                onClick={() => onSelectDocument(doc)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-violet/20 hover:bg-brand-violet text-brand-violet-light hover:text-white border border-brand-violet/30 text-xs font-medium transition-all"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Chat</span>
              </button>

              {/* View page viewer */}
              {onOpenViewer && (
                <button
                  onClick={() => onOpenViewer(doc)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-800 hover:bg-navy-700 text-slate-300 hover:text-white border border-navy-700 text-xs font-medium transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Inspect</span>
                </button>
              )}

              {/* Delete action */}
              <button
                onClick={() => onDeleteDocument(doc.id)}
                className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                title="Delete document"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
