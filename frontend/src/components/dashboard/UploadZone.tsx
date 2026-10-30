import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../../services/api';

interface UploadZoneProps {
  onUploadSuccess: () => void;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onUploadSuccess }) => {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setErrorMessage(null);

    // Validation
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Invalid file type. Only government statistical PDF reports (.pdf) are accepted.');
      return;
    }

    if (file.size > 60 * 1024 * 1024) {
      setErrorMessage('File exceeds 60MB size limit.');
      return;
    }

    try {
      setIsUploading(true);
      setUploadStatus(`Uploading ${file.name}...`);

      const res = await api.uploadDocument(file);
      setUploadStatus('Document uploaded. Extracting pages, tables, and generating embeddings in background...');

      // Notify parent to refresh list
      setTimeout(() => {
        setIsUploading(false);
        setUploadStatus(null);
        onUploadSuccess();
      }, 1500);

    } catch (err: any) {
      setIsUploading(false);
      setUploadStatus(null);
      setErrorMessage(err.message || 'Upload failed. Please try again.');
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-3 text-center ${
          isDragging
            ? 'border-brand-violet bg-brand-violet/10 shadow-glow-violet'
            : 'border-navy-700 bg-navy-900/60 hover:bg-navy-850 hover:border-brand-violet/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFile(e.target.files[0]);
            }
          }}
        />

        <div className="w-14 h-14 rounded-2xl bg-brand-violet/10 border border-brand-violet/30 flex items-center justify-center text-brand-violet-light group-hover:scale-105 transition-transform shadow-inner">
          {isUploading ? (
            <Loader2 className="w-7 h-7 animate-spin text-brand-cyan" />
          ) : (
            <UploadCloud className="w-7 h-7" />
          )}
        </div>

        <div className="space-y-1">
          <h4 className="text-base font-semibold text-white">
            {isUploading ? 'Ingesting Statistical Report...' : 'Upload Government Statistical PDF'}
          </h4>
          <p className="text-xs text-slate-400 max-w-sm">
            Drag & drop Census, Economic Surveys, Labor or Demographic PDFs up to 60MB.
          </p>
        </div>

        {uploadStatus && (
          <div className="flex items-center gap-2 text-xs text-brand-cyan-light font-mono bg-navy-950 px-3 py-1.5 rounded-lg border border-navy-700">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>{uploadStatus}</span>
          </div>
        )}

        <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono pt-1">
          <span>✓ PyMuPDF & pdfplumber extraction</span>
          <span>•</span>
          <span>✓ ChromaDB Vector Index</span>
          <span>•</span>
          <span>✓ 1:1 Page Citations</span>
        </div>
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
