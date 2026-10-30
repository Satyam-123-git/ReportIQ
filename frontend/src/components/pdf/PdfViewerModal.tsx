import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, FileText, Table as TableIcon, ZoomIn, ZoomOut, ExternalLink, Download } from 'lucide-react';
import { api } from '../../services/api';
import { DocumentPage } from '../../types';

interface PdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  documentName: string;
  targetPageNumber: number;
  highlightEvidence?: string;
  sourceType?: 'Text' | 'Table';
  tableTitle?: string;
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  isOpen,
  onClose,
  documentId,
  documentName,
  targetPageNumber,
  highlightEvidence,
  sourceType = 'Text',
  tableTitle,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(targetPageNumber);
  const [pageData, setPageData] = useState<DocumentPage | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(100);

  useEffect(() => {
    if (isOpen) {
      setCurrentPage(targetPageNumber);
    }
  }, [isOpen, targetPageNumber]);

  useEffect(() => {
    if (!isOpen || !documentId) return;

    let isMounted = true;
    setLoading(true);

    api.getDocumentPage(documentId, currentPage)
      .then((data) => {
        if (isMounted) {
          setPageData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error fetching page:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, documentId, currentPage]);

  if (!isOpen) return null;

  const pdfDownloadUrl = api.getPdfUrl(documentId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-5xl h-[88vh] bg-navy-900 border border-navy-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-700/80 bg-navy-850">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-brand-violet/10 text-brand-violet-light border border-brand-violet/20">
              {sourceType === 'Table' ? <TableIcon className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white text-base truncate max-w-md">{documentName}</h3>
                <span className="text-xs px-2 py-0.5 rounded bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20">
                  Page {currentPage} Citation
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Verified Government Document Record • {sourceType} Verification
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            {/* Page navigation */}
            <div className="flex items-center bg-navy-800 rounded-lg border border-navy-700 px-1 py-0.5">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded hover:bg-navy-700 text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 text-xs font-mono font-medium text-slate-200">
                Page {currentPage}
              </span>
              <button
                onClick={() => setCurrentPage((p) => p + 1)}
                className="p-1.5 rounded hover:bg-navy-700 text-slate-300"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Zoom controls */}
            <div className="hidden sm:flex items-center bg-navy-800 rounded-lg border border-navy-700 px-1 py-0.5 text-xs text-slate-300">
              <button 
                onClick={() => setZoom((z) => Math.max(75, z - 15))}
                className="p-1.5 hover:bg-navy-700 rounded"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 font-mono">{zoom}%</span>
              <button 
                onClick={() => setZoom((z) => Math.min(150, z + 15))}
                className="p-1.5 hover:bg-navy-700 rounded"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Download Original PDF */}
            <a
              href={pdfDownloadUrl}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-lg bg-navy-800 border border-navy-700 text-slate-300 hover:text-white hover:bg-navy-700 transition-colors"
              title="Open / Download Raw PDF"
            >
              <Download className="w-4 h-4" />
            </a>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-navy-800 border border-navy-700 text-slate-300 hover:text-rose-400 hover:bg-navy-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Highlight Banner if citing this page */}
        {highlightEvidence && currentPage === targetPageNumber && (
          <div className="bg-brand-violet/15 border-b border-brand-violet/30 px-6 py-2.5 flex items-start gap-3 text-xs">
            <span className="font-semibold text-brand-violet-light uppercase tracking-wider shrink-0 mt-0.5">
              Cited Evidence:
            </span>
            <p className="text-slate-200 italic font-mono bg-navy-950/60 px-3 py-1 rounded border border-brand-violet/20 w-full">
              "{highlightEvidence}"
            </p>
          </div>
        )}

        {/* Page Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-navy-950 flex flex-col items-center">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
              <div className="w-8 h-8 border-2 border-brand-violet border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium">Rendering verified document page {currentPage}...</p>
            </div>
          ) : (
            <div 
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
              className="w-full max-w-3xl transition-transform duration-150"
            >
              {/* Rendered Document Sheet */}
              <div className="bg-navy-900 border border-navy-700 rounded-xl p-8 shadow-card-dark text-slate-200 font-sans space-y-6">
                
                {/* Header line on page */}
                <div className="border-b border-navy-700 pb-3 flex justify-between items-center text-xs text-slate-400 font-mono">
                  <span>OFFICIAL GOVERNMENT STATISTICAL REPORT</span>
                  <span>PAGE {currentPage}</span>
                </div>

                {/* Tables on this page */}
                {pageData?.tables && pageData.tables.length > 0 && (
                  <div className="space-y-4 my-4">
                    {pageData.tables.map((tbl, idx) => (
                      <div key={idx} className="rounded-xl border border-brand-cyan/30 overflow-hidden bg-navy-950/70">
                        <div className="px-4 py-2 bg-brand-cyan/10 border-b border-brand-cyan/20 flex items-center justify-between">
                          <span className="text-xs font-semibold text-brand-cyan-light flex items-center gap-1.5">
                            <TableIcon className="w-3.5 h-3.5" />
                            {tbl.table_title}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {tbl.row_count} rows × {tbl.col_count} columns
                          </span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-navy-800/80 text-slate-300 font-medium">
                              <tr>
                                {tbl.headers.map((h, hIdx) => (
                                  <th key={hIdx} className="px-3 py-2 border-b border-navy-700">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-navy-800 text-slate-300 font-mono">
                              {tbl.rows.map((row, rIdx) => (
                                <tr key={rIdx} className="hover:bg-navy-800/40">
                                  {row.map((cell, cIdx) => (
                                    <td key={cIdx} className="px-3 py-2 whitespace-nowrap">{String(cell)}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Page text content */}
                <div className="prose prose-invert max-w-none text-sm text-slate-300 leading-relaxed font-mono whitespace-pre-wrap bg-navy-950/50 p-4 rounded-lg border border-navy-800">
                  {pageData?.extracted_text || 'No text extracted on this page.'}
                </div>

                {/* Document footer */}
                <div className="border-t border-navy-800 pt-3 flex justify-between items-center text-[11px] text-slate-500">
                  <span>Document ID: {documentId}</span>
                  <span>Word Count: {pageData?.word_count || 0}</span>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
