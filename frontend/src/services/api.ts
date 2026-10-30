import { Document, DocumentPage, Message, Conversation, AnalyticsOverview, SearchResultItem } from '../types';

const API_BASE = '/api';

export const api = {
  // Health
  getHealth: async () => {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Health check failed');
    return res.json();
  },

  // Documents
  getDocuments: async (): Promise<Document[]> => {
    const res = await fetch(`${API_BASE}/documents`);
    if (!res.ok) throw new Error('Failed to fetch documents');
    return res.json();
  },

  getDocument: async (id: string): Promise<Document & { pages: DocumentPage[] }> => {
    const res = await fetch(`${API_BASE}/documents/${id}`);
    if (!res.ok) throw new Error('Failed to fetch document details');
    return res.json();
  },

  uploadDocument: async (file: File): Promise<{ document_id: string; message: string; filename: string }> => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  },

  deleteDocument: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await fetch(`${API_BASE}/documents/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete document');
    return res.json();
  },

  getDocumentPage: async (id: string, pageNumber: number): Promise<DocumentPage> => {
    const res = await fetch(`${API_BASE}/documents/${id}/pages/${pageNumber}`);
    if (!res.ok) throw new Error('Failed to fetch page');
    return res.json();
  },

  getPdfUrl: (documentId: string): string => {
    return `${API_BASE}/documents/${documentId}/pdf`;
  },

  // Chat
  askQuestion: async (params: {
    question: string;
    document_id?: string;
    conversation_id?: string;
  }): Promise<{
    conversation_id: string;
    message_id: string;
    question: string;
    answer: string;
    citations: any[];
    chart_data?: any;
    calculation_details?: any;
    confidence_score: number;
    is_calculated: boolean;
    calculation_method?: string;
    created_at: string;
  }> => {
    const res = await fetch(`${API_BASE}/chat/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to process question' }));
      throw new Error(err.detail || 'Failed to process question');
    }
    return res.json();
  },

  getChatHistory: async (): Promise<Conversation[]> => {
    const res = await fetch(`${API_BASE}/chat/history`);
    if (!res.ok) throw new Error('Failed to fetch chat history');
    return res.json();
  },

  getConversation: async (id: string): Promise<Conversation> => {
    const res = await fetch(`${API_BASE}/chat/history/${id}`);
    if (!res.ok) throw new Error('Failed to fetch conversation');
    return res.json();
  },

  deleteConversation: async (id: string): Promise<{ success: boolean }> => {
    const res = await fetch(`${API_BASE}/chat/history/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete conversation');
    return res.json();
  },

  // Search
  search: async (params: {
    query: string;
    document_id?: string;
    mode?: 'hybrid' | 'semantic' | 'keyword';
    limit?: number;
  }): Promise<{ query: string; total_results: number; results: SearchResultItem[] }> => {
    const res = await fetch(`${API_BASE}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error('Search failed');
    return res.json();
  },

  // Analytics
  getAnalyticsOverview: async (): Promise<AnalyticsOverview> => {
    const res = await fetch(`${API_BASE}/analytics/overview`);
    if (!res.ok) throw new Error('Failed to fetch analytics');
    return res.json();
  },

  // Settings / API Key Update
  updateSettings: async (settings: { gemini_api_key?: string }): Promise<{ success: boolean; message: string }> => {
    const res = await fetch(`${API_BASE}/settings/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error('Failed to update settings');
    return res.json();
  },
};
