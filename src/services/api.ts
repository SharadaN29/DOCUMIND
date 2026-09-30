import { DocumentMetadata, DocumentChunk, ChatSession, ChatMessage } from '../types/index.js';

export async function fetchDocuments(userId: string = 'default'): Promise<DocumentMetadata[]> {
  const res = await fetch(`/api/documents?userId=${encodeURIComponent(userId)}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch documents');
  }
  const data = await res.json();
  return data.documents || [];
}

export async function fetchDocumentDetails(id: string): Promise<{ document: DocumentMetadata; chunks: DocumentChunk[] }> {
  const res = await fetch(`/api/documents/${id}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch document details');
  }
  return res.json();
}

export async function deleteDocumentApi(id: string): Promise<void> {
  const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to delete document');
  }
}

export async function uploadPDF(
  file: File,
  userId: string = 'default',
  onUploadProgress?: (status: string) => void
): Promise<DocumentMetadata> {
  if (onUploadProgress) onUploadProgress('Uploading file to server...');

  const formData = new FormData();
  formData.append('file', file);
  formData.append('userId', userId);

  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to process PDF upload');
  }

  return data.document;
}

export async function loadSampleDocument(docType: string = 'os', userId: string = 'default'): Promise<DocumentMetadata> {
  const res = await fetch('/api/sample-doc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ docType, userId }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to load sample document');
  }
  return data.document;
}

export async function sendChatMessage(
  question: string,
  documentId: string,
  userId: string = 'default',
  options: { topK?: number; strictGrounding?: boolean } = {}
): Promise<{ answer: string; sources: any[]; userMessage: ChatMessage; assistantMessage: ChatMessage }> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, documentId, userId, options }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Unable to generate a response right now. Please try again.');
  }

  return data;
}

export async function fetchChatSession(documentId: string, userId: string = 'default'): Promise<ChatSession> {
  const res = await fetch(`/api/chats/${documentId}?userId=${encodeURIComponent(userId)}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to load chat history');
  }
  const data = await res.json();
  return data.session;
}

export async function clearChatHistory(documentId: string, userId: string = 'default'): Promise<void> {
  const res = await fetch(`/api/chats/${documentId}?userId=${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error('Failed to clear chat history');
  }
}

export async function fetchSystemStatus(): Promise<{
  status: string;
  model: string;
  embeddingModel: string;
  documentsCount: number;
  totalChunks: number;
}> {
  const res = await fetch('/api/status');
  if (!res.ok) throw new Error('Status check failed');
  return res.json();
}
