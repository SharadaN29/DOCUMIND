import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { DocumentsPage } from './pages/DocumentsPage.js';
import { ChatPage } from './pages/ChatPage.js';
import { SettingsPage } from './pages/SettingsPage.js';
import { ChunkInspectorModal } from './components/ChunkInspectorModal.js';
import { UploadZone } from './components/UploadZone.js';
import { DocumentMetadata, UserProfile, RAGSettings } from './types/index.js';
import { fetchDocuments, loadSampleDocument } from './services/api.js';
import { X } from 'lucide-react';

const AVAILABLE_USERS: UserProfile[] = [
  {
    id: 'user_student',
    name: 'Alex Rivera',
    role: 'Computer Science Student',
    email: 'alex.rivera@university.edu',
  },
  {
    id: 'user_researcher',
    name: 'Dr. Sarah Chen',
    role: 'AI Researcher',
    email: 's.chen@lab.org',
  },
  {
    id: 'user_guest',
    name: 'Guest Reviewer',
    role: 'Evaluator',
    email: 'guest@documind.internal',
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'documents' | 'chat' | 'settings'>('dashboard');
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>('all');
  const [inspectedDoc, setInspectedDoc] = useState<DocumentMetadata | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile>(AVAILABLE_USERS[0]);
  const [ragSettings, setRagSettings] = useState<RAGSettings>({
    topK: 4,
    strictGrounding: true,
    model: 'gemini-3.8-flash',
    embeddingModel: 'gemini-embedding-2-preview',
  });

  const loadDocs = async (userId: string) => {
    try {
      const docs = await fetchDocuments(userId);
      setDocuments(docs);
      if (docs.length > 0 && selectedDocId === 'all') {
        // keep 'all' or default
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  };

  useEffect(() => {
    loadDocs(currentUser.id);
  }, [currentUser]);

  const handleUploadSuccess = (doc: DocumentMetadata) => {
    setDocuments((prev) => {
      const exists = prev.some((d) => d.id === doc.id);
      if (exists) return prev.map((d) => (d.id === doc.id ? doc : d));
      return [doc, ...prev];
    });
    setUploadModalOpen(false);
  };

  const handleDeleteDocument = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    if (selectedDocId === id) {
      setSelectedDocId('all');
    }
  };

  const handleNavigateToChat = (docId?: string) => {
    if (docId) {
      setSelectedDocId(docId);
    }
    setActiveTab('chat');
  };

  const handleResetDocuments = async () => {
    try {
      await loadSampleDocument('dbms', currentUser.id);
      await loadSampleDocument('ml', currentUser.id);
      await loadDocs(currentUser.id);
      alert('Sample documents reset successfully.');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col text-slate-900 font-sans antialiased">
      {/* Top Application Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onUserChange={setCurrentUser}
        availableUsers={AVAILABLE_USERS}
      />

      {/* Main Content Router */}
      <main className="flex-1">
        {activeTab === 'dashboard' && (
          <DashboardPage
            documents={documents}
            onUploadSuccess={handleUploadSuccess}
            onNavigateToChat={handleNavigateToChat}
            onInspectDocument={(doc) => setInspectedDoc(doc)}
            userId={currentUser.id}
          />
        )}

        {activeTab === 'documents' && (
          <DocumentsPage
            documents={documents}
            onDeleteDocument={handleDeleteDocument}
            onNavigateToChat={handleNavigateToChat}
            onInspectDocument={(doc) => setInspectedDoc(doc)}
            onOpenUpload={() => setUploadModalOpen(true)}
          />
        )}

        {activeTab === 'chat' && (
          <ChatPage
            documents={documents}
            selectedDocId={selectedDocId}
            onSelectDocId={setSelectedDocId}
            userId={currentUser.id}
            ragSettings={ragSettings}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsPage
            ragSettings={ragSettings}
            onUpdateSettings={setRagSettings}
            currentUser={currentUser}
            availableUsers={AVAILABLE_USERS}
            onUserChange={setCurrentUser}
            onResetDocuments={handleResetDocuments}
          />
        )}
      </main>

      {/* Chunk Inspector Modal */}
      <ChunkInspectorModal
        document={inspectedDoc}
        isOpen={!!inspectedDoc}
        onClose={() => setInspectedDoc(null)}
      />

      {/* Standalone Upload Modal (accessible from Documents page) */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-xl p-6 relative">
            <button
              onClick={() => setUploadModalOpen(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-semibold text-slate-900 mb-4">Upload PDF Document</h3>
            <UploadZone
              onUploadSuccess={handleUploadSuccess}
              onStartChatWithDoc={(doc) => {
                setUploadModalOpen(false);
                handleNavigateToChat(doc.id);
              }}
              userId={currentUser.id}
            />
          </div>
        </div>
      )}
    </div>
  );
}
