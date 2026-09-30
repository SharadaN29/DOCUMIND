import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Parse lines into blocks
  const lines = content.split('\n');
  const blocks: React.ReactNode[] = [];

  let inCodeBlock = false;
  let codeContent = '';
  let codeLanguage = '';
  let codeIndex = 0;
  let listItems: string[] = [];
  let isNumberedList = false;

  const flushList = () => {
    if (listItems.length > 0) {
      if (isNumberedList) {
        blocks.push(
          <ol key={`ol-${blocks.length}`} className="list-decimal pl-5 my-2.5 space-y-1 text-slate-800 leading-relaxed">
            {listItems.map((item, idx) => (
              <li key={idx} dangerouslySetInnerHTML={{ __html: renderInlineFormatting(item) }} />
            ))}
          </ol>
        );
      } else {
        blocks.push(
          <ul key={`ul-${blocks.length}`} className="list-disc pl-5 my-2.5 space-y-1 text-slate-800 leading-relaxed">
            {listItems.map((item, idx) => (
              <li key={idx} dangerouslySetInnerHTML={{ __html: renderInlineFormatting(item) }} />
            ))}
          </ul>
        );
      }
      listItems = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block toggle
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        const currentCode = codeContent;
        const currentIdx = codeIndex++;
        blocks.push(
          <div key={`code-${blocks.length}`} className="relative my-3 rounded-lg overflow-hidden border border-slate-700 bg-slate-900 text-slate-100 font-mono text-xs">
            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800 border-b border-slate-700 text-slate-400">
              <span>{codeLanguage || 'text'}</span>
              <button
                type="button"
                onClick={() => handleCopyCode(currentCode, currentIdx)}
                className="flex items-center gap-1 hover:text-white transition-colors"
                title="Copy code"
              >
                {copiedIndex === currentIdx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="text-[11px]">{copiedIndex === currentIdx ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="p-3 overflow-x-auto leading-relaxed">
              <code>{currentCode}</code>
            </pre>
          </div>
        );
        inCodeBlock = false;
        codeContent = '';
        codeLanguage = '';
      } else {
        flushList();
        inCodeBlock = true;
        codeLanguage = line.trim().slice(3).trim();
        codeContent = '';
      }
      continue;
    }

    if (inCodeBlock) {
      codeContent += (codeContent ? '\n' : '') + line;
      continue;
    }

    // List item detection
    const bulletMatch = line.match(/^(\s*)[-*+]\s+(.*)$/);
    const numberMatch = line.match(/^(\s*)\d+\.\s+(.*)$/);

    if (bulletMatch) {
      if (isNumberedList && listItems.length > 0) flushList();
      isNumberedList = false;
      listItems.push(bulletMatch[2]);
      continue;
    } else if (numberMatch) {
      if (!isNumberedList && listItems.length > 0) flushList();
      isNumberedList = true;
      listItems.push(numberMatch[2]);
      continue;
    } else {
      flushList();
    }

    // Empty line
    if (!line.trim()) {
      continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      blocks.push(
        <h4 key={`h3-${blocks.length}`} className="text-base font-semibold text-slate-900 mt-4 mb-1.5" dangerouslySetInnerHTML={{ __html: renderInlineFormatting(line.slice(4)) }} />
      );
      continue;
    }
    if (line.startsWith('## ')) {
      blocks.push(
        <h3 key={`h2-${blocks.length}`} className="text-lg font-semibold text-slate-900 mt-4 mb-2 pb-1 border-b border-slate-100" dangerouslySetInnerHTML={{ __html: renderInlineFormatting(line.slice(3)) }} />
      );
      continue;
    }
    if (line.startsWith('# ')) {
      blocks.push(
        <h2 key={`h1-${blocks.length}`} className="text-xl font-bold text-slate-900 mt-5 mb-2.5" dangerouslySetInnerHTML={{ __html: renderInlineFormatting(line.slice(2)) }} />
      );
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      blocks.push(
        <blockquote key={`bq-${blocks.length}`} className="border-l-2 border-slate-300 pl-3.5 my-2.5 text-slate-600 italic text-sm" dangerouslySetInnerHTML={{ __html: renderInlineFormatting(line.slice(2)) }} />
      );
      continue;
    }

    // Standard paragraph
    blocks.push(
      <p key={`p-${blocks.length}`} className="my-2 text-slate-800 leading-relaxed text-sm md:text-[15px]" dangerouslySetInnerHTML={{ __html: renderInlineFormatting(line) }} />
    );
  }

  flushList();

  return <div className="markdown-body space-y-1">{blocks}</div>;
};

function renderInlineFormatting(text: string): string {
  let escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Bold + italic ***text***
  escaped = escaped.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
  // Bold **text**
  escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-slate-900">$1</strong>');
  // Italic *text*
  escaped = escaped.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');
  // Inline code `code`
  escaped = escaped.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-[13px] border border-slate-200/60">$1</code>');

  return escaped;
}
