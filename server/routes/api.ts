import express, { Request, Response } from 'express';
import multer from 'multer';
import { extractTextFromPDF } from '../services/pdfService.js';
import { chunkDocumentPages } from '../services/chunkingService.js';
import { batchGenerateEmbeddings } from '../services/vectorService.js';
import { answerQuestionRAG } from '../services/ragService.js';
import {
  getAllDocuments,
  getDocumentById,
  saveDocument,
  deleteDocument,
  getChunksForDocument,
  getChatSession,
  addMessageToSession,
  clearChatSession,
} from '../services/storageService.js';
import { DocumentMetadata, ChatMessage } from '../../src/types/index.js';

export const apiRouter = express.Router();

// Configure Multer for PDF uploads up to 25MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Please upload a valid PDF file.'));
    }
  },
});

// GET /api/documents
apiRouter.get('/documents', (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'default';
  const docs = getAllDocuments(userId);
  res.json({ documents: docs });
});

// GET /api/documents/:id
apiRouter.get('/documents/:id', (req: Request, res: Response) => {
  const doc = getDocumentById(req.params.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }
  const chunks = getChunksForDocument(req.params.id);
  // Strip heavy embedding vector for lightweight transport in chunk inspection
  const lightweightChunks = chunks.map(({ embedding, ...rest }) => rest);
  res.json({ document: doc, chunks: lightweightChunks });
});

// DELETE /api/documents/:id
apiRouter.delete('/documents/:id', (req: Request, res: Response) => {
  deleteDocument(req.params.id);
  res.json({ success: true, message: 'Document deleted successfully' });
});

// POST /api/upload
apiRouter.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please select a PDF file to upload.' });
    }

    const userId = (req.body.userId as string) || 'default';
    const originalName = req.file.originalname;
    const fileBuffer = req.file.buffer;
    const fileSize = req.file.size;

    const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // 1. Extract text
    const extractionResult = await extractTextFromPDF(fileBuffer);

    if (extractionResult.isScannedOrEmpty) {
      return res.status(422).json({
        error: 'This PDF does not contain readable text. OCR processing may be required.',
      });
    }

    // 2. Split into chunks
    const chunks = chunkDocumentPages(docId, originalName, extractionResult.pages, {
      chunkSize: 700,
      chunkOverlap: 120,
    });

    if (chunks.length === 0) {
      return res.status(422).json({
        error: 'Unable to extract coherent sections from this PDF document.',
      });
    }

    // 3. Generate sample questions preview based on extracted headings
    const firstChunks = chunks.slice(0, 3).map((c) => c.text).join(' ');
    const sampleQuestions: string[] = [
      `What is the primary topic of ${originalName}?`,
      `Summarize the key conclusions from this document.`,
      `Explain the main methods or principles discussed in page 1.`,
    ];

    // 4. Batch generate embeddings for semantic search
    const enrichedChunks = await batchGenerateEmbeddings(chunks);

    const docMetadata: DocumentMetadata = {
      id: docId,
      userId,
      filename: originalName,
      originalName,
      fileSizeBytes: fileSize,
      totalPages: extractionResult.totalPages,
      chunkCount: chunks.length,
      uploadedAt: new Date().toISOString(),
      status: 'ready',
      summary: firstChunks.slice(0, 280) + '...',
      sampleQuestions,
    };

    saveDocument(docMetadata, enrichedChunks);

    res.json({
      success: true,
      document: docMetadata,
    });
  } catch (error: any) {
    console.error('PDF Upload/Processing error:', error);
    res.status(500).json({
      error: error.message || 'Failed to process PDF document.',
    });
  }
});

// POST /api/chat
apiRouter.post('/chat', async (req: Request, res: Response) => {
  try {
    const { question, documentId = 'all', userId = 'default', options = {} } = req.body;

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return res.status(400).json({ error: 'Question is required.' });
    }

    // Retrieve active chunks for document or all documents
    const chunks = getChunksForDocument(documentId);

    if (chunks.length === 0) {
      return res.json({
        answer: 'No document content is available to answer your question. Please upload a PDF document first.',
        sources: [],
      });
    }

    // Get current chat session for conversational memory
    const session = getChatSession(documentId, userId);

    // Run RAG pipeline
    const ragResult = await answerQuestionRAG(question.trim(), chunks, session.messages, options);

    // Save user message
    const userMessage: ChatMessage = {
      id: `msg_u_${Date.now()}`,
      userId,
      documentId,
      role: 'user',
      content: question.trim(),
      timestamp: new Date().toISOString(),
    };
    addMessageToSession(documentId, userMessage, userId);

    // Save assistant message
    const assistantMessage: ChatMessage = {
      id: `msg_a_${Date.now()}`,
      userId,
      documentId,
      role: 'assistant',
      content: ragResult.answer,
      timestamp: new Date().toISOString(),
      sources: ragResult.sources,
    };
    addMessageToSession(documentId, assistantMessage, userId);

    res.json({
      answer: ragResult.answer,
      sources: ragResult.sources,
      userMessage,
      assistantMessage,
    });
  } catch (error: any) {
    console.error('RAG Chat endpoint error:', error);
    res.status(500).json({
      error: error.message || 'Unable to generate a response right now. Please try again.',
    });
  }
});

// GET /api/chats/:documentId
apiRouter.get('/chats/:documentId', (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'default';
  const session = getChatSession(req.params.documentId, userId);
  res.json({ session });
});

// DELETE /api/chats/:documentId
apiRouter.delete('/chats/:documentId', (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'default';
  clearChatSession(req.params.documentId, userId);
  res.json({ success: true, message: 'Chat history cleared' });
});

// POST /api/sample-doc - Load another sample academic document
apiRouter.post('/sample-doc', async (req: Request, res: Response) => {
  try {
    const { docType = 'os', userId = 'default' } = req.body;

    const osId = `sample_doc_os_${Date.now()}`;
    const osDoc: DocumentMetadata = {
      id: osId,
      userId,
      filename: 'Operating_Systems.pdf',
      originalName: 'Operating_Systems.pdf',
      fileSizeBytes: 2150000,
      totalPages: 3,
      chunkCount: 6,
      uploadedAt: new Date().toISOString(),
      status: 'ready',
      summary: 'Academic lecture notes covering Process Scheduling, Deadlock Coffman conditions, Mutex/Semaphores, and Virtual Memory paging.',
      sampleQuestions: [
        'What are the four necessary conditions for a deadlock?',
        'Explain the difference between paging and segmentation.',
        'How does the Banker\'s algorithm prevent deadlock?',
        'Describe the Round Robin CPU scheduling algorithm.',
      ],
    };

    const osChunks = [
      {
        id: `${osId}_p1_c0`,
        documentId: osId,
        documentName: 'Operating_Systems.pdf',
        pageNumber: 1,
        chunkIndex: 0,
        text: 'Unit 1: Process Management & CPU Scheduling.\nA process is a program in execution, consisting of program code (text section), program counter, stack, and data section. The Operating System switches the CPU among processes to maximize CPU utilization.\nCPU Scheduling Algorithms:\n1. First-Come, First-Served (FCFS): Non-preemptive, suffers from the convoy effect.\n2. Shortest Job First (SJF): Optimal average waiting time; requires predicting CPU burst duration.\n3. Round Robin (RR): Preemptive scheduling where each process is assigned a small unit of CPU time called a time quantum (e.g., 10-100 ms).',
        tokenEstimate: 98,
      },
      {
        id: `${osId}_p1_c1`,
        documentId: osId,
        documentName: 'Operating_Systems.pdf',
        pageNumber: 1,
        chunkIndex: 1,
        text: 'Unit 1.1: Process Synchronization & Critical Section Problem.\nThe Critical Section is a segment of code where shared resources are accessed. Any valid synchronization solution must satisfy three requirements:\n1. Mutual Exclusion: If process P is executing in its critical section, no other processes can execute in their critical sections.\n2. Progress: If no process is executing in its critical section, only processes not executing in their remainder sections can participate in deciding who enters next.\n3. Bounded Waiting: A bound exists on the number of times other processes are allowed to enter after a request has been made.',
        tokenEstimate: 110,
      },
      {
        id: `${osId}_p2_c2`,
        documentId: osId,
        documentName: 'Operating_Systems.pdf',
        pageNumber: 2,
        chunkIndex: 2,
        text: 'Unit 2: Deadlocks and Banker\'s Algorithm.\nA deadlock is a permanent blocking of a set of processes that compete for system resources. Four Coffman conditions must hold simultaneously for a deadlock to arise:\n1. Mutual Exclusion: At least one resource is held in a non-shareable mode.\n2. Hold and Wait: A process holds at least one resource and is waiting to acquire additional resources held by other processes.\n3. No Preemption: Resources cannot be preempted; a resource can only be released voluntarily by the process holding it.\n4. Circular Wait: A closed chain of processes exists such that each process holds at least one resource needed by the next process in the chain.',
        tokenEstimate: 125,
      },
      {
        id: `${osId}_p2_c3`,
        documentId: osId,
        documentName: 'Operating_Systems.pdf',
        pageNumber: 2,
        chunkIndex: 3,
        text: 'Unit 2.1: Deadlock Avoidance with Banker\'s Algorithm.\nDeadlock avoidance dynamically examines resource-allocation state to ensure circular wait never occurs. Dijkstra\'s Banker\'s Algorithm tests for safety by simulating the allocation of predetermined maximum possible amounts of all resources, and then making an "s-state" check to test for possible activities, before deciding whether allocation should be allowed to proceed.',
        tokenEstimate: 75,
      },
      {
        id: `${osId}_p3_c4`,
        documentId: osId,
        documentName: 'Operating_Systems.pdf',
        pageNumber: 3,
        chunkIndex: 4,
        text: 'Unit 3: Memory Management & Paging.\nPaging is a memory management scheme that eliminates the need for contiguous allocation of physical memory. Physical memory is divided into fixed-sized blocks called frames. Logical memory is divided into blocks of the same size called pages.\nWhen a process executes, its pages are loaded into any available frames. The Memory Management Unit (MMU) uses a page table to translate logical addresses (page number + page offset) into physical addresses (frame number + offset).',
        tokenEstimate: 95,
      },
      {
        id: `${osId}_p3_c5`,
        documentId: osId,
        documentName: 'Operating_Systems.pdf',
        pageNumber: 3,
        chunkIndex: 5,
        text: 'Unit 3.1: Virtual Memory & Page Replacement Algorithms.\nVirtual memory allows the execution of processes that are not completely in main memory, separating logical memory as perceived by programmers from physical memory.\nWhen a process accesses a page not mapped into physical RAM, a Page Fault trap occurs, causing the OS to fetch the page from swap disk.\nPage Replacement Algorithms:\n- FIFO (First-In, First-Out): Replaces the oldest page; susceptible to Belady\'s Anomaly.\n- Optimal Algorithm: Replaces the page that will not be used for the longest period of time.\n- LRU (Least Recently Used): Replaces the page that has not been used for the longest period.',
        tokenEstimate: 115,
      },
    ];

    saveDocument(osDoc, osChunks);
    res.json({ success: true, document: osDoc });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load sample document' });
  }
});

// GET /api/status - System health check
apiRouter.get('/status', (_req: Request, res: Response) => {
  const docs = getAllDocuments();
  const totalChunks = docs.reduce((acc, d) => acc + d.chunkCount, 0);
  res.json({
    status: 'healthy',
    model: 'gemini-3.8-flash',
    embeddingModel: 'gemini-embedding-2-preview',
    documentsCount: docs.length,
    totalChunks,
  });
});
