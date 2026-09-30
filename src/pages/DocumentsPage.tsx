import React, { useState } from 'react';
import {
  FileText,
  Trash2,
  Layers,
  MessageSquare,
  Upload,
  Calendar,
  HardDrive,
  FileCheck,
  Search,
} from 'lucide-react';
import { DocumentMetadata } from '../types/index.js';
import { formatBytes, formatDate } from '../utils/formatters.js';
import { deleteDocumentApi } from '../services/api.js';

interface DocumentsPageProps {
  documents: DocumentMetadata[];
  onDeleteDocument: (id: string) => void;
  onNavigateToChat: (docId: string) => void;
  onInspectDocument: (doc: DocumentMetadata) => void;
  onOpenUpload: () => void;
}

export const DocumentsPage: React.FC<DocumentsPageProps> = ({
  documents,
  onDeleteDocument,
  onNavigateToChat,
  onInspectDocument,
  onOpenUpload,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredDocs = documents.filter((doc) =>
    doc.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id: string, filename: string) => {
    if (window.confirm(`Are you sure you want to delete "${filename}" and its vector index?`)) {
      setDeletingId(id);
      try {
        await deleteDocumentApi(id);
        onDeleteDocument(id);
      } catch (err) {
        console.error('Delete failed:', err);
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Document Management</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage your indexed knowledge base, inspect chunks, or launch Q&amp;A sessions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenUpload}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors shadow-2xs"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload New PDF</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center justify-between gap-4 p-3 bg-white border border-slate-200 rounded-xl">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search documents by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Total Documents: <span className="text-slate-800 font-semibold">{filteredDocs.length}</span>
        </div>
      </div>

      {/* Document Cards List */}
      {filteredDocs.length === 0 ? (
        <div className="border border-dashed border-slate-300 rounded-xl p-12 text-center bg-white space-y-3">
          <FileText className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-700">No documents found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchTerm
              ? `No document matches "${searchTerm}". Try a different keyword.`
              : 'Upload a PDF to start building your searchable document library.'}
          </p>
          <button
            onClick={onOpenUpload}
            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-medium transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload PDF</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="border border-slate-200 rounded-xl p-5 bg-white hover:border-slate-300 transition-colors shadow-2xs flex flex-col justify-between"
            >
              <div>
                {/* Header info */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 text-sm truncate max-w-xs sm:max-w-sm">
                        {doc.filename}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <span className="flex items-center gap-1">
                          <HardDrive className="w-3 h-3" />
                          {formatBytes(doc.fileSizeBytes)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{doc.totalPages} Pages</span>
                      </div>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-medium">
                    <FileCheck className="w-3 h-3 text-emerald-600" />
                    Ready
                  </span>
                </div>

                {/* Summary or Description */}
                {doc.summary && (
                  <p className="text-xs text-slate-600 mt-3 line-clamp-2 leading-relaxed">
                    {doc.summary}
                  </p>
                )}

                {/* Sample questions preview if available */}
                {doc.sampleQuestions && doc.sampleQuestions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-[11px] font-medium text-slate-500 mb-1.5">Sample questions:</p>
                    <div className="space-y-1">
                      {doc.sampleQuestions.slice(0, 2).map((q, idx) => (
                        <p key={idx} className="text-xs text-slate-700 italic truncate">
                          &ldquo;{q}&rdquo;
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer with Metadata & Actions */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 text-slate-400 text-[11px]">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(doc.uploadedAt)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onInspectDocument(doc)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors font-medium"
                    title="Inspect Chunks"
                  >
                    <Layers className="w-3.5 h-3.5 text-slate-500" />
                    <span>Chunks ({doc.chunkCount})</span>
                  </button>

                  <button
                    onClick={() => onNavigateToChat(doc.id)}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-md font-medium transition-colors shadow-2xs"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Ask Questions</span>
                  </button>

                  <button
                    onClick={() => handleDelete(doc.id, doc.filename)}
                    disabled={deletingId === doc.id}
                    className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="Delete document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
