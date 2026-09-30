import { PDFParse } from 'pdf-parse';

export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

export interface PDFExtractionResult {
  totalPages: number;
  pages: ExtractedPage[];
  fullText: string;
  isScannedOrEmpty: boolean;
}

/**
 * Clean extracted text: remove irregular whitespace, preserve paragraph structure
 */
export function cleanExtractedText(raw: string): string {
  if (!raw) return '';
  return raw
    // Replace non-breaking spaces and carriage returns
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[\u00A0\u2000-\u200B\u202F\u205F]/g, ' ')
    // Normalize spaces within lines
    .replace(/[ ]{2,}/g, ' ')
    // Remove repeated page numbers like "Page 1 of 10" or standalone numbers if on their own line
    .replace(/^\s*\d+\s*$/gm, '')
    // Replace 3+ consecutive newlines with 2
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Extract text and page metadata from PDF buffer
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<PDFExtractionResult> {
  // 1. Basic format validation
  if (!buffer || buffer.length < 10) {
    throw new Error('Please upload a valid PDF file.');
  }

  const header = buffer.subarray(0, 5).toString('ascii');
  if (!header.startsWith('%PDF-')) {
    throw new Error('Please upload a valid PDF file. The file header does not match PDF format.');
  }

  let parser: any = null;
  try {
    parser = new PDFParse({ data: buffer });
    const parsedData = await parser.getText();

    const totalPages = parsedData.total || (parsedData.pages ? parsedData.pages.length : 1);
    const pages: ExtractedPage[] = [];

    if (Array.isArray(parsedData.pages) && parsedData.pages.length > 0) {
      for (const p of parsedData.pages) {
        const cleaned = cleanExtractedText(p.text || '');
        pages.push({
          pageNumber: p.num || pages.length + 1,
          text: cleaned,
        });
      }
    } else {
      // Single page or continuous text fallback
      const cleaned = cleanExtractedText(parsedData.text || '');
      pages.push({
        pageNumber: 1,
        text: cleaned,
      });
    }

    const fullText = pages.map((p) => p.text).join('\n\n').trim();

    // Check if empty or scanned (fewer than 25 alphanumeric chars across all pages)
    const alphanumericCount = (fullText.match(/[a-zA-Z0-9]/g) || []).length;
    const isScannedOrEmpty = alphanumericCount < 25;

    return {
      totalPages,
      pages,
      fullText,
      isScannedOrEmpty,
    };
  } catch (error: any) {
    if (error.message?.includes('Password') || error.name === 'PasswordException') {
      throw new Error('This PDF is password-protected. Please upload an unprotected PDF.');
    }
    throw new Error(`Failed to extract text from PDF: ${error.message || 'Corrupted or unreadable format'}`);
  } finally {
    if (parser && typeof parser.destroy === 'function') {
      try {
        await parser.destroy();
      } catch {
        // Ignore cleanup error
      }
    }
  }
}
