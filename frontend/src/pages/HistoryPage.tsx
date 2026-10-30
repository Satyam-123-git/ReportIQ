import React, { useState, useEffect } from 'react';
import { Conversation, Message } from '../types';
import { api } from '../services/api';
import { MessageSquare, Trash2, ArrowRight, Calendar, Calculator, CheckCircle2, FileText } from 'lucide-react';

interface HistoryPageProps {
  setActiveTab: (tab: string) => void;
  onOpenViewer: (docId: string, docName: string, page: number) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ setActiveTab, onOpenViewer }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await api.getChatHistory();
      setConversations(data);
      if (data.length > 0) {
        setSelectedConversation(data[0]);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteConversation(id);
      const updated = conversations.filter((c) => c.id !== id);
      setConversations(updated);
      if (selectedConversation?.id === id) {
        setSelectedConversation(updated.length > 0 ? updated[0] : null);
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-fadeIn">
      
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Research Session History</h2>
          <p className="text-xs text-slate-400">Review past analytical Q&A queries, verified page references, and mathematical traces.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[72vh]">
        
        {/* Left List of Conversations */}
        <div className="p-4 rounded-2xl bg-navy-900 border border-navy-700/80 shadow-card-dark overflow-y-auto space-y-2">
          {conversations.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No historical research sessions found.
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                className={`p-3.5 rounded-xl cursor-pointer text-xs transition-all space-y-1.5 border ${
                  selectedConversation?.id === conv.id
                    ? 'bg-navy-800 border-brand-violet/50 shadow-glow-violet text-white'
                    : 'bg-navy-850/60 border-navy-700/60 hover:border-navy-600 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold truncate max-w-[190px]">{conv.title}</span>
                  <button
                    onClick={(e) => handleDelete(conv.id, e)}
                    className="p-1 hover:text-rose-400 text-slate-500 transition-colors"
                    title="Delete session"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>{new Date(conv.created_at).toLocaleDateString()}</span>
                  <span>{conv.message_count || (conv.messages ? conv.messages.length : 0)} messages</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right Details of Selected Conversation */}
        <div className="md:col-span-2 p-6 rounded-2xl bg-navy-900 border border-navy-700/80 shadow-card-dark overflow-y-auto flex flex-col justify-between">
          {selectedConversation ? (
            <div className="space-y-6">
              <div className="border-b border-navy-800 pb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">{selectedConversation.title}</h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Session created on {new Date(selectedConversation.created_at).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('chat')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-violet hover:bg-brand-violet-dark text-white text-xs font-medium transition-all shadow-glow-violet"
                >
                  <span>Continue in AI Assistant</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Messages list */}
              <div className="space-y-4">
                {selectedConversation.messages && selectedConversation.messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl text-xs space-y-2.5 ${
                      m.role === 'assistant'
                        ? 'bg-navy-800/80 border border-navy-700/80 text-slate-200'
                        : 'bg-navy-950/80 border border-navy-800 text-slate-100 font-medium'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span className="font-semibold text-brand-violet-light uppercase tracking-wider">
                        {m.role === 'assistant' ? 'ReportIQ Response' : 'User Query'}
                      </span>
                      <span>{new Date(m.created_at).toLocaleTimeString()}</span>
                    </div>

                    <p className="whitespace-pre-wrap leading-relaxed font-sans">
                      {m.role === 'assistant' ? m.answer : m.question}
                    </p>

                    {/* Citations preview */}
                    {m.citations && m.citations.length > 0 && (
                      <div className="pt-2 border-t border-navy-700/50 flex flex-wrap gap-1.5">
                        {m.citations.map((c, cIdx) => (
                          <span
                            key={cIdx}
                            className="px-2 py-0.5 rounded bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20 text-[11px] font-mono"
                          >
                            {c.document_name} (p. {c.page_number})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs">
              Select a research session on the left to inspect conversation history.
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
