import React, { useState } from 'react';
import { BookOpen, Files, MessageSquare, Settings, User, ChevronDown, Menu, X, Sparkles } from 'lucide-react';
import { UserProfile } from '../types/index.js';

interface HeaderProps {
  activeTab: 'dashboard' | 'documents' | 'chat' | 'settings';
  setActiveTab: (tab: 'dashboard' | 'documents' | 'chat' | 'settings') => void;
  currentUser: UserProfile;
  onUserChange: (user: UserProfile) => void;
  availableUsers: UserProfile[];
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onUserChange,
  availableUsers,
}) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center gap-8">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 rounded-md"
            >
              <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-xs">
                <BookOpen className="w-5 h-5 text-indigo-300" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-900 text-lg tracking-tight">DocuMind</span>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">RAG</span>
                </div>
                <p className="text-[11px] text-slate-500 hidden sm:block">AI PDF Question Answering</p>
              </div>
            </button>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'dashboard'
                    ? 'text-slate-900 bg-slate-100'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('documents')}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'documents'
                    ? 'text-slate-900 bg-slate-100'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Files className="w-4 h-4 text-slate-500" />
                Documents
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'chat'
                    ? 'text-slate-900 bg-slate-100'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <MessageSquare className="w-4 h-4 text-slate-500" />
                PDF Chat
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'settings'
                    ? 'text-slate-900 bg-slate-100'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Settings className="w-4 h-4 text-slate-500" />
                Settings
              </button>
            </nav>
          </div>

          {/* Right Header items */}
          <div className="flex items-center gap-3">
            {/* Subtle Gemini indicator without candy pills */}
            <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500 border border-slate-200 rounded-md px-2.5 py-1 bg-slate-50/50">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Gemini 3.8 Flash</span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span>Vector RAG</span>
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors"
                aria-label="User profile options"
              >
                <div className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-[11px] font-semibold">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-medium text-slate-900 leading-tight">{currentUser.name}</p>
                  <p className="text-[10px] text-slate-500 leading-tight">{currentUser.role}</p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                  <div className="absolute right-0 mt-1.5 w-56 rounded-lg bg-white border border-slate-200 shadow-lg py-1.5 z-20 text-xs">
                    <div className="px-3 py-2 border-b border-slate-100">
                      <p className="font-medium text-slate-900">{currentUser.name}</p>
                      <p className="text-slate-500 text-[11px]">{currentUser.email}</p>
                    </div>
                    <div className="py-1">
                      <p className="px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-slate-400">Switch Workspace Profile</p>
                      {availableUsers.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => {
                            onUserChange(u);
                            setProfileOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 transition-colors ${
                            u.id === currentUser.id ? 'font-semibold text-slate-900 bg-slate-50' : 'text-slate-600'
                          }`}
                        >
                          <div>
                            <p className="text-xs">{u.name}</p>
                            <p className="text-[10px] text-slate-400">{u.role}</p>
                          </div>
                          {u.id === currentUser.id && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-slate-100 space-y-1">
            <button
              onClick={() => {
                setActiveTab('dashboard');
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
                activeTab === 'dashboard' ? 'bg-slate-100 text-slate-900' : 'text-slate-600'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => {
                setActiveTab('documents');
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
                activeTab === 'documents' ? 'bg-slate-100 text-slate-900' : 'text-slate-600'
              }`}
            >
              Documents
            </button>
            <button
              onClick={() => {
                setActiveTab('chat');
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
                activeTab === 'chat' ? 'bg-slate-100 text-slate-900' : 'text-slate-600'
              }`}
            >
              PDF Chat
            </button>
            <button
              onClick={() => {
                setActiveTab('settings');
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
                activeTab === 'settings' ? 'bg-slate-100 text-slate-900' : 'text-slate-600'
              }`}
            >
              Settings
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
