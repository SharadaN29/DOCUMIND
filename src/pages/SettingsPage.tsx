import React from 'react';
import {
  Sliders,
  ShieldCheck,
  Cpu,
  Database,
  Trash2,
  RefreshCw,
  User,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { RAGSettings, UserProfile } from '../types/index.js';
import { clearChatHistory } from '../services/api.js';

interface SettingsPageProps {
  ragSettings: RAGSettings;
  onUpdateSettings: (settings: RAGSettings) => void;
  currentUser: UserProfile;
  availableUsers: UserProfile[];
  onUserChange: (user: UserProfile) => void;
  onResetDocuments: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  ragSettings,
  onUpdateSettings,
  currentUser,
  availableUsers,
  onUserChange,
  onResetDocuments,
}) => {
  const handleClearAllChats = async () => {
    if (window.confirm('Clear all conversation histories for the current workspace?')) {
      try {
        await clearChatHistory('all', currentUser.id);
        alert('Chat histories cleared successfully.');
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Application Settings</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Configure RAG retrieval parameters, vector search sensitivity, and system architecture preferences.
        </p>
      </div>

      {/* RAG Retrieval Parameters */}
      <div className="border border-slate-200 rounded-xl p-6 bg-white shadow-2xs space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Sliders className="w-4 h-4 text-indigo-600" />
          <h2 className="text-sm font-semibold text-slate-900">Retrieval &amp; Search Hyperparameters</h2>
        </div>

        {/* Top-K Chunks */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-800">
            Top-K Retrieved Chunks per Query
          </label>
          <p className="text-xs text-slate-500 leading-relaxed">
            The number of most relevant semantic chunks retrieved from vector storage and passed to Gemini as grounding context.
          </p>
          <div className="flex items-center gap-2 pt-1">
            {[3, 4, 5, 8].map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => onUpdateSettings({ ...ragSettings, topK: k })}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  ragSettings.topK === k
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Top {k} Chunks
              </button>
            ))}
          </div>
        </div>

        {/* Strict Grounding Toggle */}
        <div className="pt-4 border-t border-slate-100 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <label htmlFor="strict-grounding" className="text-xs font-semibold text-slate-900 cursor-pointer">
                Strict Document Grounding
              </label>
            </div>
            <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
              When enabled, instructs Gemini to answer exclusively from the document text and explicitly declare if information is absent, preventing general knowledge hallucination.
            </p>
          </div>

          <input
            id="strict-grounding"
            type="checkbox"
            checked={ragSettings.strictGrounding}
            onChange={(e) => onUpdateSettings({ ...ragSettings, strictGrounding: e.target.checked })}
            className="w-4 h-4 mt-1 rounded text-slate-900 focus:ring-slate-900 border-slate-300"
          />
        </div>
      </div>

      {/* Model & Architecture Specifications */}
      <div className="border border-slate-200 rounded-xl p-6 bg-white shadow-2xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Cpu className="w-4 h-4 text-indigo-600" />
          <h2 className="text-sm font-semibold text-slate-900">AI Models &amp; Infrastructure</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/70 space-y-1.5">
            <span className="font-semibold text-slate-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              LLM Generation Engine
            </span>
            <p className="font-mono text-slate-700">gemini-3.8-flash</p>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              High-throughput multimodal language model for factual reasoning and context synthesis.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/70 space-y-1.5">
            <span className="font-semibold text-slate-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Dense Vector Embeddings
            </span>
            <p className="font-mono text-slate-700">gemini-embedding-2-preview</p>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              3,072-dimensional vector space with cosine similarity and BM25 hybrid ranking.
            </p>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-indigo-50/50 border border-indigo-100 text-xs text-indigo-950 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            API keys are managed securely on the server-side via environment configuration (<code className="font-mono bg-white px-1 py-0.5 rounded border border-indigo-200/60">process.env.GEMINI_API_KEY</code>) with no client-side exposure.
          </p>
        </div>
      </div>

      {/* User Profiles */}
      <div className="border border-slate-200 rounded-xl p-6 bg-white shadow-2xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <User className="w-4 h-4 text-indigo-600" />
          <h2 className="text-sm font-semibold text-slate-900">Workspace User Profiles</h2>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Switch between profiles to demonstrate user isolation and individual conversation sessions:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {availableUsers.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => onUserChange(user)}
              className={`p-3 text-left rounded-lg border transition-all ${
                user.id === currentUser.id
                  ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <p className="font-semibold text-xs text-slate-900">{user.name}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{user.role}</p>
              <p className="text-[10px] text-slate-400 mt-1">{user.email}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Maintenance & Data Management */}
      <div className="border border-slate-200 rounded-xl p-6 bg-white shadow-2xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Database className="w-4 h-4 text-indigo-600" />
          <h2 className="text-sm font-semibold text-slate-900">Database &amp; Storage Maintenance</h2>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div>
            <p className="font-semibold text-slate-800">Clear Workspace Chat History</p>
            <p className="text-slate-500 text-[11px]">Resets all conversation messages for {currentUser.name}.</p>
          </div>
          <button
            onClick={handleClearAllChats}
            className="px-3 py-1.5 bg-white hover:bg-red-50 text-red-600 border border-slate-200 hover:border-red-200 rounded-lg font-medium transition-colors self-start sm:self-auto"
          >
            Clear All Chats
          </button>
        </div>

        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div>
            <p className="font-semibold text-slate-800">Reset Sample Academic Notes</p>
            <p className="text-slate-500 text-[11px]">Re-seeds standard DBMS and Machine Learning notes if deleted.</p>
          </div>
          <button
            onClick={onResetDocuments}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg font-medium transition-colors self-start sm:self-auto"
          >
            Reset Sample Documents
          </button>
        </div>
      </div>
    </div>
  );
};
