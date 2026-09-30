import React, { useState, useEffect } from 'react';
import { X, Search, FileText, Layers, Hash } from 'lucide-react';
import { DocumentMetadata, DocumentChunk } from '../types/index.js';
import { fetchDocumentDetails } from '../services/api.js';

interface ChunkInspectorModalProps {
  document: DocumentMetadata | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ChunkInspectorModal: React.FC<ChunkInspectorModalProps> = ({
  document,
  isOpen,
  onClose,
}) => {
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPage, setSelectedPage] = useState<number | 'all'>('all');

  useEffect(() => {
    if (isOpen && document) {
      setLoading(true);
      fetchDocumentDetails(document.id)
        .then((res) => {
          setChunks(res.chunks || []);
        })
        .catch((err) => {
          console.error(err);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, document]);

  if (!isOpen || !document) return null;

  const filteredChunks = chunks.filter((c) => {
    const matchesSearch = c.text.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPage = selectedPage === 'all' || c.pageNumber === selectedPage;
    return matchesSearch && matchesPage;
  });

  const uniquePages = Array.from(new Set(chunks.map((c) => c.pageNumber))).sort((a, b) => a - b);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">{document.filename}</h3>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                <span>RAG Knowledge Base Inspector</span>
                <span aria-hidden="true">·</span>
                <span>{chunks.length} Extracted Chunks</span>
                <span aria-hidden="true">·</span>
                <span>{document.totalPages} Pages</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter bar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search in chunks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            <span className="text-xs text-slate-500 mr-1 shrink-0">Page:</span>
            <button
              onClick={() => setSelectedPage('all')}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                selectedPage === 'all'
                  ? 'bg-slate-900 text-white font-medium'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              All
            </button>
            {uniquePages.map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => setSelectedPage(pageNum)}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                  selectedPage === pageNum
                    ? 'bg-slate-900 text-white font-medium'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                P. {pageNum}
              </button>
            ))}
          </div>
        </div>

        {/* Chunk list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              Loading knowledge chunks...
            </div>
          ) : filteredChunks.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              No chunks match the current filters.
            </div>
          ) : (
            filteredChunks.map((chunk) => (
              <div
                key={chunk.id}
                className="border border-slate-200 rounded-lg p-4 bg-white hover:border-slate-300 transition-colors shadow-2xs"
              >
                <div className="flex items-center justify-between text-xs text-slate-500 pb-2 mb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">Chunk #{chunk.chunkIndex + 1}</span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1">
                      <FileText className="w-3 h-3 text-slate-400" />
                      Page {chunk.pageNumber}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                    <Hash className="w-3 h-3" />
                    <span>~{chunk.tokenEstimate} tokens</span>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-sans whitespace-pre-wrap">
                  {chunk.text}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {filteredChunks.length} of {chunks.length} chunks</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
