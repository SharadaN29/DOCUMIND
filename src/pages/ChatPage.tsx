import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  MessageSquare,
  FileText,
  Copy,
  Check,
  RotateCcw,
  Trash2,
  Download,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import { DocumentMetadata, ChatMessage, RetrievedSource, RAGSettings } from '../types/index.js';
import { MarkdownRenderer } from '../components/MarkdownRenderer.js';
import { fetchChatSession, sendChatMessage, clearChatHistory } from '../services/api.js';
import { formatTime } from '../utils/formatters.js';

interface ChatPageProps {
  documents: DocumentMetadata[];
  selectedDocId: string;
  onSelectDocId: (id: string) => void;
  userId: string;
  ragSettings: RAGSettings;
}

export const ChatPage: React.FC<ChatPageProps> = ({
  documents,
  selectedDocId,
  onSelectDocId,
  userId,
  ragSettings,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentDoc = selectedDocId === 'all' ? null : documents.find((d) => d.id === selectedDocId);

  // Load chat session on document or user switch
  useEffect(() => {
    let isMounted = true;
    fetchChatSession(selectedDocId, userId)
      .then((session) => {
        if (isMounted) {
          setMessages(session.messages || []);
        }
      })
      .catch((err) => console.error('Failed to load chat history:', err));

    return () => {
      isMounted = false;
    };
  }, [selectedDocId, userId]);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSendMessage = async (customPrompt?: string) => {
    const questionText = customPrompt || inputQuestion.trim();
    if (!questionText || loading) return;

    setInputQuestion('');
    setLoading(true);
    setLoadingStatus('Retrieving relevant chunks...');

    // Optimistically add user message
    const tempUserMsg: ChatMessage = {
      id: `temp_u_${Date.now()}`,
      userId,
      documentId: selectedDocId,
      role: 'user',
      content: questionText,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    setTimeout(() => {
      setLoadingStatus('Synthesizing grounded answer with Gemini...');
    }, 800);

    try {
      const res = await sendChatMessage(questionText, selectedDocId, userId, {
        topK: ragSettings.topK,
        strictGrounding: ragSettings.strictGrounding,
      });

      setMessages((prev) => {
        // Replace temp or append
        const filtered = prev.filter((m) => m.id !== tempUserMsg.id);
        return [...filtered, res.userMessage, res.assistantMessage];
      });
    } catch (err: any) {
      console.error(err);
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        userId,
        documentId: selectedDocId,
        role: 'assistant',
        content: err.message || 'Unable to generate a response right now. Please try again.',
        timestamp: new Date().toISOString(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      setLoadingStatus(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopyAnswer = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRegenerate = async (lastUserMessageIndex: number) => {
    if (lastUserMessageIndex < 0 || loading) return;
    const userMsg = messages[lastUserMessageIndex];
    if (userMsg && userMsg.role === 'user') {
      // Remove subsequent messages and re-send
      setMessages((prev) => prev.slice(0, lastUserMessageIndex));
      handleSendMessage(userMsg.content);
    }
  };

  const handleClearChat = async () => {
    if (window.confirm('Clear the conversation history for this document?')) {
      try {
        await clearChatHistory(selectedDocId, userId);
        setMessages([]);
      } catch (err) {
        console.error('Clear chat error:', err);
      }
    }
  };

  const handleExportChat = () => {
    if (messages.length === 0) return;
    const docTitle = currentDoc ? currentDoc.filename : 'All Documents';
    let markdown = `# DocuMind Chat Export: ${docTitle}\n`;
    markdown += `Date: ${new Date().toLocaleString()}\n\n---\n\n`;

    messages.forEach((m) => {
      const speaker = m.role === 'user' ? 'User' : 'DocuMind Assistant';
      markdown += `### ${speaker} (${formatTime(m.timestamp)})\n\n${m.content}\n\n`;
      if (m.sources && m.sources.length > 0) {
        markdown += `**Retrieved Sources:**\n`;
        m.sources.forEach((s) => {
          markdown += `- **${s.documentName}** (Page ${s.pageNumber}) [Score: ${s.score}]\n  > ${s.snippet.replace(/\n/g, ' ')}\n`;
        });
        markdown += '\n';
      }
    });

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DocuMind_Chat_${docTitle.replace(/[^a-zA-Z0-9]/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSources = (id: string) => {
    setExpandedSources((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Curated suggested questions based on selected document
  const suggestedQuestions = currentDoc?.sampleQuestions || [
    'What are the core concepts covered in this document?',
    'Summarize the key principles and formulas.',
    'Explain the advantages and real-world applications.',
    'What are the differences between the main approaches discussed?',
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-[calc(100vh-4.5rem)] flex flex-col">
      {/* Top Document Context Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Context Source:</span>
              <select
                value={selectedDocId}
                onChange={(e) => onSelectDocId(e.target.value)}
                className="text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-md py-1 px-2.5 focus:outline-none focus:ring-1 focus:ring-slate-400"
              >
                <option value="all">All Documents (Cross-Document Search)</option>
                {documents.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.filename} ({doc.totalPages} pages)
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {currentDoc
                ? `Scoped to ${currentDoc.filename} · ${currentDoc.chunkCount} indexed vector chunks`
                : `Searching across all ${documents.length} uploaded documents`}
            </p>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 self-end sm:self-auto">
          {messages.length > 0 && (
            <>
              <button
                onClick={handleExportChat}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                title="Export conversation as Markdown"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export</span>
              </button>
              <button
                onClick={handleClearChat}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                title="Clear conversation"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear Chat</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto py-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 max-w-xl mx-auto">
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-slate-700" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Ask a question about {currentDoc ? currentDoc.filename : 'your documents'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md">
                DocuMind will retrieve relevant chunks from the PDF, cite the exact page numbers, and synthesize a grounded natural language response.
              </p>
            </div>

            {/* Clickable prompt suggestions */}
            <div className="w-full pt-2">
              <p className="text-xs font-medium text-slate-400 mb-2">Suggested questions to get started:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                {suggestedQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(q)}
                    className="p-3 text-xs text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors shadow-2xs leading-relaxed"
                  >
                    &ldquo;{q}&rdquo;
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((message, index) => {
            const isUser = message.role === 'user';
            const isError = message.isError;
            const hasSources = message.sources && message.sources.length > 0;
            const isExpanded = !!expandedSources[message.id];

            return (
              <div
                key={message.id || index}
                className={`flex gap-3 sm:gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5 shadow-xs">
                    <Sparkles className="w-4 h-4 text-indigo-300" />
                  </div>
                )}

                <div
                  className={`max-w-[88%] sm:max-w-[78%] rounded-xl p-4 sm:p-5 text-sm ${
                    isUser
                      ? 'bg-slate-900 text-white shadow-xs'
                      : isError
                      ? 'bg-red-50 border border-red-200 text-red-800'
                      : 'bg-white border border-slate-200 shadow-2xs text-slate-800'
                  }`}
                >
                  {/* Speaker and Timestamp Header */}
                  <div className="flex items-center justify-between gap-4 mb-2 pb-1.5 border-b border-slate-100/20 text-xs">
                    <span className={`font-semibold ${isUser ? 'text-slate-200' : 'text-slate-900'}`}>
                      {isUser ? 'You' : 'DocuMind Assistant'}
                    </span>
                    <span className={`text-[11px] ${isUser ? 'text-slate-400' : 'text-slate-400'}`}>
                      {formatTime(message.timestamp)}
                    </span>
                  </div>

                  {/* Body Content */}
                  {isUser ? (
                    <p className="whitespace-pre-wrap leading-relaxed text-sm">{message.content}</p>
                  ) : isError ? (
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <p className="text-xs leading-relaxed">{message.content}</p>
                    </div>
                  ) : (
                    <MarkdownRenderer content={message.content} />
                  )}

                  {/* Grounded Sources Accordion (Anti-slop clean citations) */}
                  {!isUser && hasSources && (
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => toggleSources(message.id)}
                        className="flex items-center justify-between w-full text-xs font-medium text-slate-700 hover:text-slate-900 transition-colors"
                      >
                        <span className="flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Sources Grounding ({message.sources!.length} citations)</span>
                        </span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                      </button>

                      {isExpanded && (
                        <div className="mt-2.5 space-y-2">
                          {message.sources!.map((source, sIdx) => (
                            <div
                              key={sIdx}
                              className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs space-y-1"
                            >
                              <div className="flex items-center justify-between text-slate-600 font-medium">
                                <span className="flex items-center gap-1 text-slate-800 font-semibold truncate max-w-xs">
                                  <FileText className="w-3 h-3 text-slate-500" />
                                  {source.documentName}
                                </span>
                                <span className="text-[11px] text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded font-mono">
                                  Page {source.pageNumber}
                                </span>
                              </div>
                              <p className="text-slate-700 font-sans leading-relaxed line-clamp-3 italic">
                                &ldquo;{source.snippet}&rdquo;
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions for Assistant message (Copy & Regenerate) */}
                  {!isUser && !isError && (
                    <div className="mt-3 pt-2 flex items-center justify-end gap-2 text-xs text-slate-400">
                      <button
                        onClick={() => handleCopyAnswer(message.content, message.id)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded hover:bg-slate-100 hover:text-slate-700 transition-colors"
                        title="Copy answer"
                      >
                        {copiedId === message.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-700">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>

                      {index === messages.length - 1 && (
                        <button
                          onClick={() => handleRegenerate(index - 1)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded hover:bg-slate-100 hover:text-slate-700 transition-colors"
                          title="Regenerate answer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Regenerate</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5">
                    {userId.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Live Loading Stepper Indicator */}
        {loading && (
          <div className="flex gap-3 sm:gap-4 items-start">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-semibold shrink-0 animate-pulse">
              <Sparkles className="w-4 h-4 text-indigo-300" />
            </div>
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2 max-w-sm">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
                <span>{loadingStatus || 'Processing RAG pipeline...'}</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-indigo-600 h-full w-2/3 animate-pulse" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form & Quick Follow-ups */}
      <div className="pt-3 border-t border-slate-200 space-y-2">
        {/* Quick follow-up chips when conversation is active */}
        {messages.length > 0 && !loading && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs text-slate-600">
            <span className="text-[11px] text-slate-400 shrink-0">Follow-up:</span>
            <button
              onClick={() => handleSendMessage('What are its main advantages?')}
              className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors shrink-0"
            >
              What are its advantages?
            </button>
            <button
              onClick={() => handleSendMessage('Give a concrete example from the document.')}
              className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors shrink-0"
            >
              Give a concrete example
            </button>
            <button
              onClick={() => handleSendMessage('Summarize this in 3 concise bullet points.')}
              className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors shrink-0"
            >
              Summarize in 3 bullet points
            </button>
          </div>
        )}

        <div className="relative flex items-center bg-white border border-slate-300 rounded-xl shadow-xs focus-within:ring-2 focus-within:ring-slate-900 focus-within:border-transparent transition-all">
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputQuestion}
            onChange={(e) => setInputQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask a question about ${currentDoc ? currentDoc.filename : 'your documents'}...`}
            className="w-full py-3.5 pl-4 pr-12 text-xs sm:text-sm bg-transparent resize-none focus:outline-none max-h-32 text-slate-900 placeholder:text-slate-400"
          />

          <button
            type="button"
            onClick={() => handleSendMessage()}
            disabled={!inputQuestion.trim() || loading}
            className="absolute right-2 p-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xs"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
          <span>Press <kbd className="px-1 py-0.5 rounded bg-slate-100 font-mono text-[10px] text-slate-600">Enter</kbd> to send, <kbd className="px-1 py-0.5 rounded bg-slate-100 font-mono text-[10px] text-slate-600">Shift+Enter</kbd> for newline</span>
          <span>Grounded with Gemini 3.8 Flash</span>
        </div>
      </div>
    </div>
  );
};
