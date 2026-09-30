import { GoogleGenAI } from '@google/genai';
import { DocumentChunk, RetrievedSource } from '../../src/types/index.js';

let aiInstance: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiInstance;
}

/**
 * Generate embedding vector using gemini-embedding-2-preview
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const ai = getGenAI();
    const result = await ai.models.embedContent({
      model: 'gemini-embedding-2-preview',
      contents: text.slice(0, 2048), // fit within embedding context
    });

    if (result.embeddings && result.embeddings.length > 0 && result.embeddings[0].values) {
      return result.embeddings[0].values;
    }
    return null;
  } catch (error: any) {
    console.warn('Embedding API call warning:', error.message || error);
    return null;
  }
}

/**
 * Batch generate embeddings with concurrency control
 */
export async function batchGenerateEmbeddings(
  chunks: DocumentChunk[],
  onProgress?: (completed: number, total: number) => void
): Promise<DocumentChunk[]> {
  const enrichedChunks: DocumentChunk[] = [...chunks];
  const BATCH_SIZE = 5;

  for (let i = 0; i < enrichedChunks.length; i += BATCH_SIZE) {
    const slice = enrichedChunks.slice(i, i + BATCH_SIZE);
    await Promise.all(
      slice.map(async (chunk) => {
        if (!chunk.embedding) {
          const emb = await generateEmbedding(chunk.text);
          if (emb) {
            chunk.embedding = emb;
          }
        }
      })
    );

    if (onProgress) {
      onProgress(Math.min(i + BATCH_SIZE, enrichedChunks.length), enrichedChunks.length);
    }
  }

  return enrichedChunks;
}

/**
 * Compute cosine similarity between two numeric vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Tokenize text for lexical / keyword scoring
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

/**
 * Compute BM25-style lexical relevance score
 */
function computeLexicalScore(queryTokens: string[], textTokens: string[]): number {
  if (queryTokens.length === 0 || textTokens.length === 0) return 0;

  const textFreq: Record<string, number> = {};
  for (const token of textTokens) {
    textFreq[token] = (textFreq[token] || 0) + 1;
  }

  let matches = 0;
  let weightedScore = 0;

  for (const q of queryTokens) {
    if (textFreq[q]) {
      matches++;
      // Diminishing returns on term frequency
      const tf = textFreq[q];
      weightedScore += Math.log(1 + tf);
    }
  }

  if (matches === 0) return 0;
  const coverage = matches / queryTokens.length;
  return Math.min(1.0, (coverage * 0.7) + (Math.min(weightedScore, 5) / 5 * 0.3));
}

/**
 * Search relevant chunks for a question using Hybrid Retrieval (Vector + BM25)
 */
export async function searchRelevantChunks(
  query: string,
  chunks: DocumentChunk[],
  topK: number = 5
): Promise<RetrievedSource[]> {
  if (chunks.length === 0) return [];

  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query);
  const queryTokens = tokenize(query);

  const scoredChunks: { chunk: DocumentChunk; score: number }[] = [];

  for (const chunk of chunks) {
    let semanticScore = 0;
    if (queryEmbedding && chunk.embedding) {
      semanticScore = cosineSimilarity(queryEmbedding, chunk.embedding);
      // Normalize cosine from [-1, 1] to [0, 1]
      semanticScore = Math.max(0, semanticScore);
    }

    const chunkTokens = tokenize(chunk.text);
    const lexicalScore = computeLexicalScore(queryTokens, chunkTokens);

    // Hybrid formula:
    // If we have semantic vector: 70% semantic, 30% lexical
    // If semantic embedding is absent: 100% lexical score
    let finalScore = 0;
    if (queryEmbedding && chunk.embedding) {
      finalScore = (semanticScore * 0.75) + (lexicalScore * 0.25);
    } else {
      finalScore = lexicalScore;
    }

    scoredChunks.push({
      chunk,
      score: finalScore,
    });
  }

  // Sort descending by score
  scoredChunks.sort((a, b) => b.score - a.score);

  // Return top K with a small threshold or top elements
  const results = scoredChunks.slice(0, topK).map(({ chunk, score }) => ({
    documentId: chunk.documentId,
    documentName: chunk.documentName,
    pageNumber: chunk.pageNumber,
    chunkIndex: chunk.chunkIndex,
    snippet: chunk.text,
    score: Math.round(score * 100) / 100,
  }));

  return results;
}
