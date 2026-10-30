import React, { useState } from 'react';
import { Document, SearchResultItem } from '../types';
import { api } from '../services/api';
import { Search, FileText, Table as TableIcon, Trash2, ExternalLink, MessageSquare, Loader2, ArrowRight } from 'lucide-react';

interface DocumentsPageProps {
  documents: Document[];
  onSelectDocument: (doc: Document) => void;
  onDeleteDocument: (docId: string) => void;
  onOpenViewer: (doc: Document, page?: number, evidence?: string) => void;
  setActiveTab: (tab: string) => void;
}

export const DocumentsPage: React.FC<DocumentsPageProps> = ({
  documents,
  onSelectDocument,
  onDeleteDocument,
  onOpenViewer,
  setActiveTab,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [searchMode, setSearchMode] = useState<'hybrid' | 'semantic' | 'keyword'>('hybrid');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [selectedDocFilter, setSelectedDocFilter] = useState<string>('');

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const res = await api.search({
        query: searchQuery,
        document_id: selectedDocFilter || undefined,
        mode: searchMode,
        limit: 12,
      });
      setSearchResults(res.results);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const filteredDocs = documents.filter((d) =>
    d.original_filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-fadeIn">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Government Document Management</h2>
          <p className="text-xs text-slate-400">Search indexed statistics, view page counts, inspect tables, or launch Q&A.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-3 py-1.5 rounded-xl bg-navy-900 border border-navy-700 text-slate-300">
            {documents.length} Total Reports
          </span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-4 rounded-2xl bg-navy-900 border border-navy-700/80 shadow-card-dark space-y-3">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reports by keyword, table title, population, literacy, state..."
              className="w-full bg-navy-950 border border-navy-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-violet transition-all"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Document Filter */}
            <select
              value={selectedDocFilter}
              onChange={(e) => setSelectedDocFilter(e.target.value)}
              className="bg-navy-950 border border-navy-700 text-slate-200 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-brand-violet"
            >
              <option value="">All Documents</option>
              {documents.map((d) => (
                <option key={d.id} value={d.id}>{d.original_filename}</option>
              ))}
            </select>

            {/* Mode */}
            <select
              value={searchMode}
              onChange={(e) => setSearchMode(e.target.value as any)}
              className="bg-navy-950 border border-navy-700 text-slate-200 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-brand-violet font-mono"
            >
              <option value="hybrid">Hybrid</option>
              <option value="semantic">Semantic</option>
              <option value="keyword">Keyword</option>
            </select>

            <button
              type="submit"
              disabled={isSearching}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-violet to-brand-violet-dark text-white text-xs font-semibold shadow-glow-violet hover:opacity-95 transition-all shrink-0 flex items-center gap-1.5"
            >
              {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              <span>Search</span>
            </button>
          </div>
        </form>
      </div>

      {/* If Search Results are present */}
      {searchResults.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <span>Search Results ({searchResults.length})</span>
            </h3>
            <button
              onClick={() => setSearchResults([])}
              className="text-xs text-slate-400 hover:text-white"
            >
              Clear Search Results
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {searchResults.map((r, idx) => {
              const matchedDoc = documents.find((d) => d.id === r.document_id);
              return (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-navy-900 border border-navy-700/80 hover:border-brand-violet/50 transition-all space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white truncate max-w-[200px]" title={r.document_name}>
                      {r.document_name}
                    </span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20">
                      Page {r.page_number}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 font-mono line-clamp-3 bg-navy-950/60 p-2.5 rounded-lg border border-navy-800">
                    "{r.content}"
                  </p>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400 font-mono">
                      Score: {Math.round(r.score * 100)}% • Type: {r.content_type}
                    </span>
                    {matchedDoc && (
                      <button
                        onClick={() => onOpenViewer(matchedDoc, r.page_number, r.content)}
                        className="flex items-center gap-1 text-xs text-brand-violet-light hover:text-white transition-colors"
                      >
                        <span>Open on Page {r.page_number}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Documents Grid / Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredDocs.map((doc) => (
          <div
            key={doc.id}
            className="p-5 rounded-2xl bg-navy-900 border border-navy-700/80 hover:border-brand-violet/40 shadow-card-dark transition-all flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="p-2.5 rounded-xl bg-brand-violet/10 text-brand-violet-light border border-brand-violet/20">
                  <FileText className="w-6 h-6" />
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium font-mono ${
                  doc.processing_status === 'completed'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}>
                  {doc.processing_status.toUpperCase()}
                </span>
              </div>

              <div>
                <h3 className="font-semibold text-white text-base truncate" title={doc.original_filename}>
                  {doc.original_filename}
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 text-xs font-mono text-slate-300">
                <div className="p-2 rounded-lg bg-navy-800/80 border border-navy-700/60">
                  <span className="text-[10px] text-slate-400 block uppercase">Pages</span>
                  <span className="text-sm font-bold text-white">{doc.total_pages}</span>
                </div>
                <div className="p-2 rounded-lg bg-navy-800/80 border border-navy-700/60">
                  <span className="text-[10px] text-slate-400 block uppercase">Tables</span>
                  <span className="text-sm font-bold text-brand-cyan-light">{doc.total_tables}</span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-3 border-t border-navy-800">
              <button
                onClick={() => {
                  onSelectDocument(doc);
                  setActiveTab('chat');
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-brand-violet/20 hover:bg-brand-violet text-brand-violet-light hover:text-white border border-brand-violet/30 text-xs font-medium transition-all"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Ask AI</span>
              </button>

              <button
                onClick={() => onOpenViewer(doc, 1)}
                className="p-2 rounded-xl bg-navy-800 hover:bg-navy-700 text-slate-300 hover:text-white border border-navy-700 text-xs transition-colors"
                title="Inspect Page Viewer"
              >
                <ExternalLink className="w-4 h-4" />
              </button>

              <button
                onClick={() => onDeleteDocument(doc.id)}
                className="p-2 rounded-xl hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
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
