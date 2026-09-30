import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { DocumentMetadata } from '../types/index.js';
import { uploadPDF } from '../services/api.js';
import { formatBytes } from '../utils/formatters.js';

interface UploadZoneProps {
  onUploadSuccess: (doc: DocumentMetadata) => void;
  onStartChatWithDoc?: (doc: DocumentMetadata) => void;
  userId?: string;
}

type PipelineStep =
  | 'idle'
  | 'uploading'
  | 'extracting'
  | 'processing'
  | 'embedding'
  | 'ready'
  | 'error';

export const UploadZone: React.FC<UploadZoneProps> = ({
  onUploadSuccess,
  onStartChatWithDoc,
  userId = 'default',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [pipelineStep, setPipelineStep] = useState<PipelineStep>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number } | null>(null);
  const [lastUploadedDoc, setLastUploadedDoc] = useState<DocumentMetadata | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stepsList = [
    { key: 'uploading', label: 'Uploading PDF document...' },
    { key: 'extracting', label: 'Extracting text and pages...' },
    { key: 'processing', label: 'Cleaning text and creating chunks...' },
    { key: 'embedding', label: 'Creating searchable vector knowledge...' },
    { key: 'ready', label: 'Ready for questions ✓' },
  ];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = async (file: File) => {
    // 1. Client-side format validation
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setPipelineStep('error');
      setErrorMessage('Please upload a valid PDF file (.pdf format).');
      return;
    }

    // 2. Size validation (25MB max)
    if (file.size > 25 * 1024 * 1024) {
      setPipelineStep('error');
      setErrorMessage(`This file exceeds the 25 MB limit (${formatBytes(file.size)}). Please choose a smaller PDF.`);
      return;
    }

    setUploadedFile({ name: file.name, size: file.size });
    setErrorMessage(null);
    setPipelineStep('uploading');

    // Simulate animated step transitions for realistic student project feedback
    const stepTimer1 = setTimeout(() => setPipelineStep('extracting'), 500);
    const stepTimer2 = setTimeout(() => setPipelineStep('processing'), 1200);
    const stepTimer3 = setTimeout(() => setPipelineStep('embedding'), 1900);

    try {
      const doc = await uploadPDF(file, userId);
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);

      setPipelineStep('ready');
      setLastUploadedDoc(doc);
      onUploadSuccess(doc);
    } catch (err: any) {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      setPipelineStep('error');
      setErrorMessage(err.message || 'An error occurred while processing the document.');
    }
  };

  const resetUpload = () => {
    setPipelineStep('idle');
    setUploadedFile(null);
    setErrorMessage(null);
    setLastUploadedDoc(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {pipelineStep === 'idle' ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-150 ${
            isDragging
              ? 'border-indigo-600 bg-indigo-50/40 scale-[1.005]'
              : 'border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50'
          }`}
        >
          <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-600 mb-4">
            <UploadCloud className="w-7 h-7 text-slate-700" />
          </div>

          <h3 className="text-base font-semibold text-slate-900 mb-1">
            Drag &amp; Drop your PDF here
          </h3>
          <p className="text-sm text-slate-500 mb-4">
            or <span className="font-medium text-indigo-600 hover:underline">browse files</span> from your computer
          </p>

          <div className="inline-flex items-center gap-3 text-xs text-slate-500 pt-3 border-t border-slate-200/80">
            <span>Supports academic papers, textbooks, lecture notes</span>
            <span aria-hidden="true">·</span>
            <span>Up to 25 MB</span>
          </div>
        </div>
      ) : (
        <div className="border border-slate-200 rounded-xl p-6 sm:p-8 bg-white shadow-xs">
          {/* File summary header */}
          <div className="flex items-start justify-between pb-5 border-b border-slate-100">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900 truncate max-w-xs sm:max-w-md">
                  {uploadedFile?.name}
                </h4>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                  <span>{uploadedFile ? formatBytes(uploadedFile.size) : ''}</span>
                  <span aria-hidden="true">·</span>
                  <span>PDF Document</span>
                </div>
              </div>
            </div>

            <button
              onClick={resetUpload}
              className="text-xs text-slate-500 hover:text-slate-800 transition-colors py-1 px-2.5 rounded-md hover:bg-slate-100"
            >
              Upload another
            </button>
          </div>

          {/* Stepper feedback display */}
          <div className="py-6">
            {pipelineStep === 'error' ? (
              <div className="p-4 rounded-lg bg-red-50/80 border border-red-200/70 text-red-700 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
                <div className="text-xs sm:text-sm">
                  <p className="font-medium mb-1">Upload Failed</p>
                  <p className="text-red-600/90">{errorMessage}</p>
                  <button
                    onClick={resetUpload}
                    className="mt-3 px-3 py-1.5 bg-red-100/80 hover:bg-red-200/80 text-red-800 text-xs font-medium rounded-md transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                <div className="space-y-2">
                  {stepsList.map((step, idx) => {
                    const stepOrder = ['uploading', 'extracting', 'processing', 'embedding', 'ready'];
                    const currentIdx = stepOrder.indexOf(pipelineStep);
                    const thisIdx = stepOrder.indexOf(step.key);

                    const isDone = currentIdx > thisIdx || pipelineStep === 'ready';
                    const isCurrent = currentIdx === thisIdx && pipelineStep !== 'ready';
                    const isUpcoming = currentIdx < thisIdx;

                    return (
                      <div key={step.key} className="flex items-center gap-3 text-xs sm:text-sm">
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : isCurrent ? (
                          <Loader2 className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                        )}

                        <span
                          className={`${
                            isDone
                              ? 'text-slate-700 font-medium'
                              : isCurrent
                              ? 'text-indigo-900 font-semibold'
                              : 'text-slate-400'
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {pipelineStep === 'ready' && lastUploadedDoc && (
                  <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="text-xs text-slate-600">
                      <span className="font-medium text-emerald-700">✓ Document processed successfully</span>
                      <div className="flex items-center gap-2 mt-0.5 text-slate-500">
                        <span>{lastUploadedDoc.totalPages} Pages</span>
                        <span aria-hidden="true">·</span>
                        <span>{lastUploadedDoc.chunkCount} Vector Chunks</span>
                      </div>
                    </div>

                    {onStartChatWithDoc && (
                      <button
                        onClick={() => onStartChatWithDoc(lastUploadedDoc)}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors shadow-xs"
                      >
                        <span>Start Asking Questions</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
