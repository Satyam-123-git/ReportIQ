import React, { useState, useEffect } from 'react';
import { Header } from './components/layout/Header';
import { DashboardPage } from './pages/DashboardPage';
import { ChatPage } from './pages/ChatPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { PdfViewerModal } from './components/pdf/PdfViewerModal';
import { Document, AnalyticsOverview } from './types';
import { api } from './services/api';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  // Global PDF Viewer Modal state
  const [pdfModalOpen, setPdfModalOpen] = useState<boolean>(false);
  const [modalTargetDoc, setModalTargetDoc] = useState<{ id: string; name: string }>({ id: '', name: '' });
  const [modalTargetPage, setModalTargetPage] = useState<number>(1);
  const [modalEvidence, setModalEvidence] = useState<string>('');

  const refreshData = async () => {
    try {
      const docs = await api.getDocuments();
      setDocuments(docs);
      const stats = await api.getAnalyticsOverview();
      setAnalytics(stats);
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  useEffect(() => {
    refreshData();
    // Poll documents status every 5 seconds if any doc is processing
    const interval = setInterval(() => {
      const hasProcessing = documents.some((d) => d.processing_status === 'processing' || d.processing_status === 'pending');
      if (hasProcessing) {
        refreshData();
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [documents]);

  const handleDeleteDocument = async (docId: string) => {
    if (!window.confirm('Are you sure you want to delete this document and its indexed vector embeddings?')) return;
    try {
      await api.deleteDocument(docId);
      if (selectedDoc?.id === docId) setSelectedDoc(null);
      refreshData();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleOpenViewer = (doc: Document, page: number = 1, evidence: string = '') => {
    setModalTargetDoc({ id: doc.id, name: doc.original_filename });
    setModalTargetPage(page);
    setModalEvidence(evidence);
    setPdfModalOpen(true);
  };

  const handleOpenViewerById = (docId: string, docName: string, page: number) => {
    setModalTargetDoc({ id: docId, name: docName });
    setModalTargetPage(page);
    setModalEvidence('');
    setPdfModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 flex flex-col font-sans selection:bg-brand-violet selection:text-white">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        systemStatus={analytics?.system_status}
      />

      {/* Main View Area */}
      <main className="flex-1">
        {activeTab === 'dashboard' && (
          <DashboardPage
            documents={documents}
            analytics={analytics}
            onRefresh={refreshData}
            onSelectDocument={(doc) => {
              setSelectedDoc(doc);
              setActiveTab('chat');
            }}
            onDeleteDocument={handleDeleteDocument}
            setActiveTab={setActiveTab}
            onOpenViewer={(doc) => handleOpenViewer(doc, 1)}
          />
        )}

        {activeTab === 'chat' && (
          <ChatPage
            documents={documents}
            selectedDoc={selectedDoc}
            setSelectedDoc={setSelectedDoc}
          />
        )}

        {activeTab === 'documents' && (
          <DocumentsPage
            documents={documents}
            onSelectDocument={(doc) => setSelectedDoc(doc)}
            onDeleteDocument={handleDeleteDocument}
            onOpenViewer={handleOpenViewer}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsPage analytics={analytics} />
        )}

        {activeTab === 'history' && (
          <HistoryPage
            setActiveTab={setActiveTab}
            onOpenViewer={handleOpenViewerById}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsPage onSettingsUpdated={refreshData} />
        )}
      </main>

      {/* Global PDF Viewer Modal */}
      <PdfViewerModal
        isOpen={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        documentId={modalTargetDoc.id}
        documentName={modalTargetDoc.name}
        targetPageNumber={modalTargetPage}
        highlightEvidence={modalEvidence}
      />
    </div>
  );
};
