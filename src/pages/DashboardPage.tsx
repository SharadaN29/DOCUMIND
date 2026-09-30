import React, { useState } from 'react';
import {
  FileText,
  MessageSquare,
  Sparkles,
  ArrowRight,
  Database,
  Cpu,
  Layers,
  BookOpen,
  CheckCircle2,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { DocumentMetadata } from '../types/index.js';
import { UploadZone } from '../components/UploadZone.js';
import { formatBytes, formatDate } from '../utils/formatters.js';
import { loadSampleDocument } from '../services/api.js';

interface DashboardPageProps {
  documents: DocumentMetadata[];
  onUploadSuccess: (doc: DocumentMetadata) => void;
  onNavigateToChat: (docId?: string) => void;
  onInspectDocument: (doc: DocumentMetadata) => void;
  userId: string;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  documents,
  onUploadSuccess,
  onNavigateToChat,
  onInspectDocument,
  userId,
}) => {
  const [loadingSample, setLoadingSample] = useState(false);

  const handleLoadSample = async (type: 'dbms' | 'ml' | 'os') => {
    setLoadingSample(true);
    try {
      const doc = await loadSampleDocument(type, userId);
      onUploadSuccess(doc);
    } catch (err) {
      console.error('Failed to load sample doc:', err);
    } finally {
      setLoadingSample(false);
    }
  };

  const totalChunks = documents.reduce((sum, d) => sum + (d.chunkCount || 0), 0);
  const totalPages = documents.reduce((sum, d) => sum + (d.totalPages || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 bg-slate-100/80 px-3 py-1 rounded-md mb-1">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>Retrieval-Augmented Generation (RAG) Architecture</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
          AI PDF Assistant
        </h1>
        <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
          Upload your documents and ask questions using natural language. Answers are strictly grounded in document context with accurate page citations.
        </p>
      </div>

      {/* Main Upload Area */}
      <div className="max-w-3xl mx-auto">
        <UploadZone
          onUploadSuccess={onUploadSuccess}
          onStartChatWithDoc={(doc) => onNavigateToChat(doc.id)}
          userId={userId}
        />
      </div>

      {/* Quick Test / Academic Sample Documents Banner */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-semibold text-slate-900">
                Pre-Loaded Academic Test Documents
              </h3>
            </div>
            <p className="text-xs text-slate-600 mt-1 max-w-xl">
              Don't have a PDF ready? Instant test the question-answering workflow with realistic engineering lecture notes:
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                const dbms = documents.find((d) => d.filename.includes('DBMS'));
                if (dbms) onNavigateToChat(dbms.id);
                else handleLoadSample('dbms');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 transition-colors shadow-2xs"
            >
              <Database className="w-3.5 h-3.5 text-slate-600" />
              <span>DBMS Notes</span>
            </button>

            <button
              onClick={() => {
                const ml = documents.find((d) => d.filename.includes('Machine_Learning'));
                if (ml) onNavigateToChat(ml.id);
                else handleLoadSample('ml');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 transition-colors shadow-2xs"
            >
              <Cpu className="w-3.5 h-3.5 text-slate-600" />
              <span>Machine Learning</span>
            </button>

            <button
              onClick={() => handleLoadSample('os')}
              disabled={loadingSample}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 transition-colors shadow-2xs disabled:opacity-50"
            >
              <Layers className="w-3.5 h-3.5 text-slate-600" />
              <span>+ Load OS Notes</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row (Quiet, factual metrics per anti-slop rules) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="border border-slate-200 rounded-xl p-4 bg-white">
          <p className="text-xs text-slate-500 font-medium">Uploaded Documents</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{documents.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Active knowledge base</p>
        </div>

        <div className="border border-slate-200 rounded-xl p-4 bg-white">
          <p className="text-xs text-slate-500 font-medium">Indexed Chunks</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalChunks}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Semantic vector blocks</p>
        </div>

        <div className="border border-slate-200 rounded-xl p-4 bg-white">
          <p className="text-xs text-slate-500 font-medium">Total Pages</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalPages}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Parsed academic pages</p>
        </div>

        <div className="border border-slate-200 rounded-xl p-4 bg-white">
          <p className="text-xs text-slate-500 font-medium">Embedding Engine</p>
          <p className="text-sm font-semibold text-slate-900 mt-2 truncate">Gemini Embedding 2</p>
          <p className="text-[11px] text-slate-400 mt-0.5">3072-dim vectors</p>
        </div>
      </div>

      {/* Recent Documents Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Your Documents</h2>
            <p className="text-xs text-slate-500">Select any document to ask targeted questions or view extracted knowledge chunks.</p>
          </div>

          <button
            onClick={() => onNavigateToChat('all')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors shadow-2xs"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Search All Documents</span>
          </button>
        </div>

        {documents.length === 0 ? (
          <div className="border border-dashed border-slate-300 rounded-xl p-12 text-center text-slate-500 text-sm">
            No documents uploaded yet. Drag and drop your PDF above to get started.
          </div>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                  <tr>
                    <th className="py-3 px-4">Document</th>
                    <th className="py-3 px-4 hidden sm:table-cell">Size</th>
                    <th className="py-3 px-4 hidden md:table-cell">Pages</th>
                    <th className="py-3 px-4 hidden md:table-cell">Chunks</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 truncate max-w-xs">{doc.filename}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">{formatDate(doc.uploadedAt)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 hidden sm:table-cell text-slate-600">
                        {formatBytes(doc.fileSizeBytes)}
                      </td>
                      <td className="py-3.5 px-4 hidden md:table-cell text-slate-600">
                        {doc.totalPages}
                      </td>
                      <td className="py-3.5 px-4 hidden md:table-cell text-slate-600">
                        {doc.chunkCount}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Ready</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onInspectDocument(doc)}
                            className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                            title="Inspect Chunks"
                          >
                            Inspect
                          </button>
                          <button
                            onClick={() => onNavigateToChat(doc.id)}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-medium transition-colors shadow-2xs"
                          >
                            <span>Ask</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* RAG Workflow diagram / explanation card */}
      <div className="border border-slate-200 rounded-xl p-6 bg-white space-y-4">
        <h3 className="text-sm font-semibold text-slate-900">
          How the Retrieval-Augmented Generation (RAG) System Works
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70 space-y-1">
            <span className="font-semibold text-slate-900">1. Ingestion</span>
            <p className="text-slate-600">Validates PDF and extracts raw text page-by-page.</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70 space-y-1">
            <span className="font-semibold text-slate-900">2. Chunking</span>
            <p className="text-slate-600">Splits into paragraph-aware chunks with overlap.</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70 space-y-1">
            <span className="font-semibold text-slate-900">3. Embedding</span>
            <p className="text-slate-600">Generates 3072-dim embeddings via Gemini.</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70 space-y-1">
            <span className="font-semibold text-slate-900">4. Hybrid Search</span>
            <p className="text-slate-600">Combines vector cosine similarity with BM25.</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70 space-y-1">
            <span className="font-semibold text-slate-900">5. Grounded Answer</span>
            <p className="text-slate-600">Gemini 3.8 Flash synthesizes verified citations.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
