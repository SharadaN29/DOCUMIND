import { DocumentChunk } from '../../src/types/index.js';
import { ExtractedPage } from './pdfService.js';

export interface ChunkOptions {
  chunkSize?: number;      // target characters (e.g. 700)
  chunkOverlap?: number;   // overlap characters (e.g. 120)
}

/**
 * Split text from pages into coherent chunks with overlap and page metadata
 */
export function chunkDocumentPages(
  documentId: string,
  documentName: string,
  pages: ExtractedPage[],
  options: ChunkOptions = {}
): DocumentChunk[] {
  const targetSize = options.chunkSize || 650;
  const overlap = options.chunkOverlap || 120;
  const chunks: DocumentChunk[] = [];

  let overallChunkIndex = 0;

  for (const page of pages) {
    const pageText = page.text.trim();
    if (!pageText) continue;

    // If page text is within target size, make a single chunk
    if (pageText.length <= targetSize + 100) {
      chunks.push({
        id: `${documentId}_p${page.pageNumber}_c${overallChunkIndex}`,
        documentId,
        documentName,
        pageNumber: page.pageNumber,
        chunkIndex: overallChunkIndex,
        text: pageText,
        tokenEstimate: Math.ceil(pageText.length / 4),
      });
      overallChunkIndex++;
      continue;
    }

    // Split page into paragraphs or sentences
    const paragraphs = pageText.split(/\n\s*\n/);
    let currentChunk = '';

    for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
      const para = paragraphs[pIdx].trim();
      if (!para) continue;

      // If single paragraph is very long, split by sentences
      if (para.length > targetSize) {
        const sentences = para.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [para];
        for (const sentence of sentences) {
          const trimmedSentence = sentence.trim();
          if (!trimmedSentence) continue;

          if (currentChunk.length + trimmedSentence.length > targetSize && currentChunk.length > 0) {
            chunks.push({
              id: `${documentId}_p${page.pageNumber}_c${overallChunkIndex}`,
              documentId,
              documentName,
              pageNumber: page.pageNumber,
              chunkIndex: overallChunkIndex,
              text: currentChunk.trim(),
              tokenEstimate: Math.ceil(currentChunk.length / 4),
            });
            overallChunkIndex++;

            // Retain overlap from end of current chunk
            const overlapText = currentChunk.slice(Math.max(0, currentChunk.length - overlap)).trim();
            currentChunk = overlapText ? `${overlapText} ${trimmedSentence}` : trimmedSentence;
          } else {
            currentChunk = currentChunk ? `${currentChunk} ${trimmedSentence}` : trimmedSentence;
          }
        }
      } else {
        if (currentChunk.length + para.length > targetSize && currentChunk.length > 0) {
          chunks.push({
            id: `${documentId}_p${page.pageNumber}_c${overallChunkIndex}`,
            documentId,
            documentName,
            pageNumber: page.pageNumber,
            chunkIndex: overallChunkIndex,
            text: currentChunk.trim(),
            tokenEstimate: Math.ceil(currentChunk.length / 4),
          });
          overallChunkIndex++;

          const overlapText = currentChunk.slice(Math.max(0, currentChunk.length - overlap)).trim();
          currentChunk = overlapText ? `${overlapText}\n\n${para}` : para;
        } else {
          currentChunk = currentChunk ? `${currentChunk}\n\n${para}` : para;
        }
      }
    }

    // Push any remaining text for this page
    if (currentChunk.trim().length > 0) {
      chunks.push({
        id: `${documentId}_p${page.pageNumber}_c${overallChunkIndex}`,
        documentId,
        documentName,
        pageNumber: page.pageNumber,
        chunkIndex: overallChunkIndex,
        text: currentChunk.trim(),
        tokenEstimate: Math.ceil(currentChunk.length / 4),
      });
      overallChunkIndex++;
    }
  }

  return chunks;
}
