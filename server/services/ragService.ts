import { GoogleGenAI } from '@google/genai';
import { ChatMessage, RetrievedSource, DocumentChunk } from '../../src/types/index.js';
import { searchRelevantChunks } from './vectorService.js';

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

const SYSTEM_PROMPT = `You are a document question-answering assistant. Answer the user's question using the provided document context and conversation history. Prioritize information contained in the uploaded document. Do not invent facts or claim that information appears in the document when it does not. If the answer cannot be determined from the provided document context, clearly state that the information was not found in the uploaded document. For follow-up questions, use the conversation history to resolve references such as 'it', 'this', or 'that'. Give clear, concise and context-aware answers. Format code, key terms, and bullet points using clean Markdown.`;

/**
 * Call Gemini model with retry logic
 */
async function generateWithRetry(contents: any, retries: number = 2): Promise<string> {
  const ai = getGenAI();
  const modelsToTry = ['gemini-3.8-flash', 'gemini-flash-latest'];

  for (const model of modelsToTry) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction: SYSTEM_PROMPT,
            temperature: 0.2, // low temperature for grounded factual answering
          },
        });

        if (response.text) {
          return response.text;
        }
      } catch (error: any) {
        console.warn(`Attempt ${attempt + 1} with ${model} failed:`, error.message);
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
        }
      }
    }
  }

  throw new Error('Unable to generate a response right now. Please try again.');
}

export interface RAGAnswerResult {
  answer: string;
  sources: RetrievedSource[];
  promptTokensEstimate?: number;
}

/**
 * Execute the full RAG pipeline for a user query
 */
export async function answerQuestionRAG(
  question: string,
  allChunks: DocumentChunk[],
  conversationHistory: ChatMessage[] = [],
  options: { topK?: number; strictGrounding?: boolean } = {}
): Promise<RAGAnswerResult> {
  const topK = options.topK || 4;

  if (allChunks.length === 0) {
    return {
      answer: "No document content is currently available to answer your question. Please upload a PDF document first.",
      sources: [],
    };
  }

  // 1. Retrieve relevant chunks
  const retrievedSources = await searchRelevantChunks(question, allChunks, topK);

  // If even the top chunk has near-zero relevance score (< 0.05) and strict grounding is on
  const maxScore = retrievedSources.length > 0 ? retrievedSources[0].score : 0;
  if (retrievedSources.length === 0 || maxScore < 0.04) {
    return {
      answer: "I couldn't find information related to this question in the uploaded document. Please check the document contents or ask a question directly related to its topics.",
      sources: [],
    };
  }

  // 2. Build Context text
  let contextText = 'RETRIEVED DOCUMENT CONTEXT:\n\n';
  retrievedSources.forEach((src, idx) => {
    contextText += `[SOURCE ${idx + 1}] Document: "${src.documentName}" | Page: ${src.pageNumber}\n`;
    contextText += `Content:\n${src.snippet}\n\n`;
  });

  // 3. Format conversational history (last 6 messages to keep context focused)
  const recentHistory = conversationHistory.slice(-6);
  let conversationText = '';
  if (recentHistory.length > 0) {
    conversationText = 'PREVIOUS CONVERSATION:\n';
    recentHistory.forEach((msg) => {
      const roleLabel = msg.role === 'user' ? 'User' : 'Assistant';
      conversationText += `${roleLabel}: ${msg.content}\n`;
    });
    conversationText += '\n';
  }

  // 4. Construct Full Prompt
  const userPrompt = `${contextText}
${conversationText}CURRENT QUESTION:
${question}

Instructions:
- Provide an accurate, comprehensive, and well-structured answer grounded in the sources above.
- Specifically mention relevant concepts, sections, or details from the document.
- If the question cannot be answered from the provided sources, explicitly state: "I couldn't find information related to this question in the uploaded document."`;

  // 5. Generate Answer via Gemini
  const answer = await generateWithRetry(userPrompt);

  return {
    answer: answer.trim(),
    sources: retrievedSources,
  };
}
