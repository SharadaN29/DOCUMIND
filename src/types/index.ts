export interface DocumentChunk {
  id: string;
  documentId: string;
  documentName: string;
  pageNumber: number;
  chunkIndex: number;
  text: string;
  tokenEstimate: number;
  embedding?: number[];
}

export interface DocumentMetadata {
  id: string;
  userId: string;
  filename: string;
  originalName: string;
  fileSizeBytes: number;
  totalPages: number;
  chunkCount: number;
  uploadedAt: string;
  status: 'processing' | 'ready' | 'error';
  errorMessage?: string;
  summary?: string;
  sampleQuestions?: string[];
}

export interface RetrievedSource {
  documentId: string;
  documentName: string;
  pageNumber: number;
  chunkIndex: number;
  snippet: string;
  score: number; // 0 to 1
}

export interface ChatMessage {
  id: string;
  userId: string;
  documentId: string; // specific doc ID or 'all'
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  sources?: RetrievedSource[];
  isError?: boolean;
}

export interface ChatSession {
  id: string;
  userId: string;
  documentId: string;
  documentName: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export interface UserProfile {
  id: string;
  name: string;
  role: string;
  email: string;
}

export interface RAGSettings {
  topK: number;
  strictGrounding: boolean;
  model: string;
  embeddingModel: string;
}
