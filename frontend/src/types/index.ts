export interface Document {
  id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  total_pages: number;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  status_message?: string;
  total_tables: number;
  uploaded_at: string;
  processed_at?: string;
}

export interface ExtractedTable {
  id: string;
  document_id: string;
  page_number: number;
  table_index: number;
  table_title: string;
  headers: string[];
  rows: any[][];
  raw_text: string;
  row_count: number;
  col_count: number;
}

export interface DocumentPage {
  id: string;
  document_id: string;
  page_number: number;
  extracted_text: string;
  word_count: number;
  has_tables: boolean;
  tables?: ExtractedTable[];
}

export interface Citation {
  document_id: string;
  document_name: string;
  page_number: number;
  evidence: string;
  source_type: 'Text' | 'Table';
  table_title?: string;
  relevance_score: number;
  bounding_box?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  };
}

export interface ChartData {
  chart_type: 'bar' | 'line' | 'pie' | 'comparison' | 'ranking';
  title: string;
  description?: string;
  x_key: string;
  y_keys: string[];
  data: Record<string, any>[];
  source_page?: number;
  source_document?: string;
}

export interface CalculationDetail {
  method: string;
  formula?: string;
  inputs?: Record<string, any>;
  result?: any;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  question?: string;
  answer: string;
  citations: Citation[];
  chart_data?: ChartData;
  calculation_details?: CalculationDetail;
  confidence_score?: number;
  is_calculated?: boolean;
  calculation_method?: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  title: string;
  document_id?: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
  messages?: Message[];
}

export interface AnalyticsOverview {
  total_documents: number;
  total_pages_indexed: number;
  total_tables_extracted: number;
  total_questions_asked: number;
  total_conversations: number;
  system_status: {
    status: string;
    gemini_api_configured: boolean;
    chromadb_status: string;
    active_model: string;
    embedding_model: string;
    storage_used_bytes: number;
  };
  categories_breakdown?: Record<string, number>;
}

export interface SearchResultItem {
  document_id: string;
  document_name: string;
  page_number: number;
  content: string;
  content_type: 'text' | 'table';
  score: number;
  table_title?: string;
}
