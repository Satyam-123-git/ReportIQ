import React, { useState, useEffect, useRef } from 'react';
import { Document, Message, Citation, Conversation } from '../types';
import { api } from '../services/api';
import { MessageItem } from '../components/chat/MessageItem';
import { EvidencePanel } from '../components/evidence/EvidencePanel';
import { PdfViewerModal } from '../components/pdf/PdfViewerModal';
import { 
  Send, 
  Sparkles, 
  FileText, 
  Layers, 
  Trash2, 
  Plus, 
  PanelRightClose, 
  PanelRightOpen, 
  Loader2,
  AlertCircle,
  HelpCircle
} from 'lucide-react';

interface ChatPageProps {
  documents: Document[];
  selectedDoc: Document | null;
  setSelectedDoc: (doc: Document | null) => void;
}

const EXAMPLE_QUESTIONS = [
  "Which state recorded the highest literacy rate?",
  "What was the total population recorded in the report?",
  "Which state has the lowest unemployment rate?",
  "What is the total number of registered workers?",
  "What was the percentage of rural population?",
  "Compare population growth between states.",
  "What was the percentage change between 2011 and 2021?"
];

export const ChatPage: React.FC<ChatPageProps> = ({ documents, selectedDoc, setSelectedDoc }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [inputQuery, setInputQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [showEvidencePanel, setShowEvidencePanel] = useState<boolean>(true);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [activeCitationsList, setActiveCitationsList] = useState<Citation[]>([]);
  const [pdfModalOpen, setPdfModalOpen] = useState<boolean>(false);
  const [modalTargetPage, setModalTargetPage] = useState<number>(1);
  const [modalTargetDoc, setModalTargetDoc] = useState<{ id: string; name: string }>({ id: '', name: '' });
  const [modalEvidence, setModalEvidence] = useState<string>('');
  const [modalSourceType, setModalSourceType] = useState<'Text' | 'Table'>('Text');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const history = await api.getChatHistory();
      setConversations(history);
      if (history.length > 0 && !activeConversationId) {
        selectConversation(history[0].id);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };

  const selectConversation = async (convId: string) => {
    try {
      setActiveConversationId(convId);
      const conv = await api.getConversation(convId);
      if (conv && conv.messages) {
        setMessages(conv.messages);
        // Set active evidence panel to the last assistant message's citations
        const lastAssistant = [...conv.messages].reverse().find((m) => m.role === 'assistant');
        if (lastAssistant && lastAssistant.citations) {
          setActiveCitationsList(lastAssistant.citations);
        }
      }
    } catch (err) {
      console.error('Failed to load conversation:', err);
    }
  };

  const startNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    setActiveCitationsList([]);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (queryText?: string) => {
    const q = (queryText || inputQuery).trim();
    if (!q || loading) return;

    setInputQuery('');
    setLoading(true);

    // Optimistically add user query to UI
    const tempUserMsg: Message = {
      id: `usr_${Date.now()}`,
      conversation_id: activeConversationId || 'temp',
      role: 'user',
      question: q,
      answer: '',
      citations: [],
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await api.askQuestion({
        question: q,
        document_id: selectedDoc?.id,
        conversation_id: activeConversationId || undefined,
      });

      const assistantMsg: Message = {
        id: res.message_id,
        conversation_id: res.conversation_id,
        role: 'assistant',
        question: q,
        answer: res.answer,
        citations: res.citations || [],
        chart_data: res.chart_data,
        calculation_details: res.calculation_details,
        confidence_score: res.confidence_score,
        is_calculated: res.is_calculated,
        calculation_method: res.calculation_method,
        created_at: res.created_at,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setActiveCitationsList(res.citations || []);
      setActiveConversationId(res.conversation_id);
      loadConversations();
    } catch (err: any) {
      console.error('Error asking question:', err);
      const errorMsg: Message = {
        id: `err_${Date.now()}`,
        conversation_id: activeConversationId || 'temp',
        role: 'assistant',
        question: q,
        answer: `**Processing Error:** ${err.message || 'Failed to retrieve grounded answer.'}`,
        citations: [],
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCitation = (c: Citation) => {
    setActiveCitation(c);
    setModalTargetPage(c.page_number);
    setModalTargetDoc({ id: c.document_id, name: c.document_name });
    setModalEvidence(c.evidence);
    setModalSourceType(c.source_type);
    setPdfModalOpen(true);
  };

  return (
    <div className="flex h-[calc(100vh-69px)] overflow-hidden bg-navy-950">
      
      {/* Left Sidebar: Document Scope & Chat History */}
      <div className="hidden md:flex flex-col w-72 bg-navy-900 border-r border-navy-700/80 p-4 space-y-4 shrink-0">
        
        {/* Document Selection Dropdown */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-brand-cyan" />
            <span>Target Document</span>
          </label>
          <select
            value={selectedDoc?.id || ''}
            onChange={(e) => {
              const val = e.target.value;
              const found = documents.find((d) => d.id === val) || null;
              setSelectedDoc(found);
            }}
            className="w-full bg-navy-800 border border-navy-700 text-slate-200 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-brand-violet font-medium transition-all"
          >
            <option value="">All Uploaded Reports (Multi-Doc)</option>
            {documents.map((d) => (
              <option key={d.id} value={d.id}>
                {d.original_filename} ({d.total_pages}p)
              </option>
            ))}
          </select>
        </div>

        {/* New Chat Button */}
        <button
          onClick={startNewChat}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-brand-violet to-brand-violet-dark text-white text-xs font-semibold shadow-glow-violet hover:opacity-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Research Session</span>
        </button>

        {/* Conversations History */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pt-2">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-2">
            Recent Sessions
          </span>
          {conversations.length === 0 ? (
            <p className="text-xs text-slate-500 px-2 pt-2">No prior conversations.</p>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => selectConversation(conv.id)}
                className={`p-2.5 rounded-xl cursor-pointer text-xs transition-all flex items-center justify-between group ${
                  activeConversationId === conv.id
                    ? 'bg-navy-800 text-white font-medium border border-navy-700'
                    : 'text-slate-400 hover:bg-navy-850 hover:text-slate-200'
                }`}
              >
                <span className="truncate max-w-[180px]">{conv.title}</span>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    await api.deleteConversation(conv.id);
                    if (activeConversationId === conv.id) startNewChat();
                    loadConversations();
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 transition-opacity"
                  title="Delete chat"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Grounding guarantee badge */}
        <div className="p-3 rounded-xl bg-navy-950/70 border border-navy-800 text-[11px] text-slate-400 space-y-1 font-mono">
          <div className="text-brand-cyan-light font-semibold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Strict Grounding Rule</span>
          </div>
          <p>ReportIQ answers exclusively from verified citations. Zero hallucinated statistics.</p>
        </div>
      </div>

      {/* Center Chat Interface */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-navy-950">
        
        {/* Chat Header Bar */}
        <div className="px-6 py-3.5 border-b border-navy-700/80 bg-navy-900/60 backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400">Context:</span>
            <span className="text-xs font-semibold text-white px-2.5 py-1 rounded-md bg-navy-800 border border-navy-700 font-mono">
              {selectedDoc ? selectedDoc.original_filename : 'All Indexed Documents'}
            </span>
          </div>

          {/* Toggle Evidence Panel */}
          <button
            onClick={() => setShowEvidencePanel(!showEvidencePanel)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-800 hover:bg-navy-700 text-xs font-medium text-slate-300 hover:text-white border border-navy-700 transition-all"
          >
            {showEvidencePanel ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Evidence Panel</span>
          </button>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto space-y-6">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-brand-violet to-brand-cyan p-0.5 shadow-glow-violet">
                <div className="w-full h-full bg-navy-900 rounded-[22px] flex items-center justify-center text-brand-cyan-light">
                  <Sparkles className="w-8 h-8" />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white tracking-tight">
                  AI Government Statistics Navigator
                </h3>
                <p className="text-sm text-slate-400">
                  Ask analytical questions about government reports, literacy rates, census demographics, labor figures, and tables. Every answer is grounded with clickable exact page citations.
                </p>
              </div>

              {/* Example Question Pills */}
              <div className="w-full space-y-2">
                <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 font-mono">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Click an example query to verify:</span>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {EXAMPLE_QUESTIONS.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(q)}
                      className="px-3.5 py-2 rounded-xl bg-navy-900 hover:bg-navy-850 border border-navy-700/80 hover:border-brand-violet/50 text-xs text-slate-300 hover:text-white transition-all text-left shadow-sm"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <MessageItem
                key={msg.id}
                message={msg}
                onOpenCitation={handleOpenCitation}
                documentName={selectedDoc?.original_filename}
              />
            ))
          )}

          {loading && (
            <div className="flex items-center gap-3 p-5 rounded-2xl bg-navy-900/60 border border-navy-700/50 text-slate-300 animate-pulse">
              <Loader2 className="w-5 h-5 animate-spin text-brand-cyan" />
              <div className="space-y-1">
                <p className="text-xs font-semibold text-white">ReportIQ Reasoning Engine Active</p>
                <p className="text-[11px] text-slate-400 font-mono">
                  Retrieving chunks • Verifying table numbers via Pandas • Synthesizing grounded response...
                </p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-navy-700/80 bg-navy-900/90 backdrop-blur-md">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-3 max-w-4xl mx-auto"
          >
            <div className="flex-1 relative">
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Ask about total population, state rankings, literacy rates, or percentage changes..."
                className="w-full bg-navy-950 border border-navy-700 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-violet focus:ring-1 focus:ring-brand-violet font-sans transition-all pr-12"
              />
            </div>
            <button
              type="submit"
              disabled={!inputQuery.trim() || loading}
              className="p-3 rounded-xl bg-gradient-to-r from-brand-violet to-brand-violet-dark text-white disabled:opacity-40 hover:opacity-95 shadow-glow-violet transition-all shrink-0"
              title="Send Query"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>

      {/* Right Sidebar: Source Evidence & Citation Audit Panel */}
      {showEvidencePanel && (
        <EvidencePanel
          citations={activeCitationsList}
          onOpenCitation={handleOpenCitation}
        />
      )}

      {/* Interactive PDF Page Viewer Modal */}
      <PdfViewerModal
        isOpen={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        documentId={modalTargetDoc.id}
        documentName={modalTargetDoc.name}
        targetPageNumber={modalTargetPage}
        highlightEvidence={modalEvidence}
        sourceType={modalSourceType}
      />

    </div>
  );
};
