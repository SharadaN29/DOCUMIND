import fs from 'fs';
import path from 'path';
import { DocumentMetadata, DocumentChunk, ChatSession, ChatMessage } from '../../src/types/index.js';
import { generateEmbedding } from './vectorService.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DOCS_FILE = path.join(DATA_DIR, 'documents.json');
const CHUNKS_FILE = path.join(DATA_DIR, 'chunks.json');
const CHATS_FILE = path.join(DATA_DIR, 'chats.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory cache
let documentsCache: DocumentMetadata[] = [];
let chunksCache: DocumentChunk[] = [];
let chatsCache: ChatSession[] = [];

/**
 * Load persisted data into memory
 */
export function initStorage() {
  try {
    if (fs.existsSync(DOCS_FILE)) {
      documentsCache = JSON.parse(fs.readFileSync(DOCS_FILE, 'utf-8'));
    }
    if (fs.existsSync(CHUNKS_FILE)) {
      chunksCache = JSON.parse(fs.readFileSync(CHUNKS_FILE, 'utf-8'));
    }
    if (fs.existsSync(CHATS_FILE)) {
      chatsCache = JSON.parse(fs.readFileSync(CHATS_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('Failed to load local storage data:', err);
  }

  // If no documents exist yet, seed the default academic documents
  if (documentsCache.length === 0) {
    seedDefaultAcademicDocuments();
  }
}

function persistAll() {
  try {
    fs.writeFileSync(DOCS_FILE, JSON.stringify(documentsCache, null, 2), 'utf-8');
    fs.writeFileSync(CHUNKS_FILE, JSON.stringify(chunksCache, null, 2), 'utf-8');
    fs.writeFileSync(CHATS_FILE, JSON.stringify(chatsCache, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist data:', err);
  }
}

export function getAllDocuments(userId?: string): DocumentMetadata[] {
  if (!userId) return documentsCache;
  return documentsCache.filter((d) => !d.userId || d.userId === userId || d.userId === 'system');
}

export function getDocumentById(id: string): DocumentMetadata | undefined {
  return documentsCache.find((d) => d.id === id);
}

export function saveDocument(doc: DocumentMetadata, chunks: DocumentChunk[]) {
  // Update or insert doc
  const docIdx = documentsCache.findIndex((d) => d.id === doc.id);
  if (docIdx >= 0) {
    documentsCache[docIdx] = doc;
  } else {
    documentsCache.unshift(doc);
  }

  // Remove existing chunks for this doc and add new
  chunksCache = chunksCache.filter((c) => c.documentId !== doc.id);
  chunksCache.push(...chunks);

  persistAll();
}

export function deleteDocument(id: string) {
  documentsCache = documentsCache.filter((d) => d.id !== id);
  chunksCache = chunksCache.filter((c) => c.documentId !== id);
  chatsCache = chatsCache.filter((c) => c.documentId !== id);
  persistAll();
}

export function getChunksForDocument(docId: string): DocumentChunk[] {
  if (docId === 'all') {
    return chunksCache;
  }
  return chunksCache.filter((c) => c.documentId === docId);
}

export function getAllChunks(): DocumentChunk[] {
  return chunksCache;
}

// Chat sessions
export function getChatSession(documentId: string, userId: string = 'default'): ChatSession {
  let session = chatsCache.find((s) => s.documentId === documentId && s.userId === userId);
  if (!session) {
    const doc = documentId === 'all' ? null : getDocumentById(documentId);
    session = {
      id: `chat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      documentId,
      documentName: doc ? doc.filename : 'All Documents',
      title: doc ? `Discussion on ${doc.filename}` : 'Cross-Document Synthesis',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    };
    chatsCache.unshift(session);
    persistAll();
  }
  return session;
}

export function addMessageToSession(
  documentId: string,
  message: ChatMessage,
  userId: string = 'default'
): ChatSession {
  const session = getChatSession(documentId, userId);
  session.messages.push(message);
  session.updatedAt = new Date().toISOString();
  persistAll();
  return session;
}

export function clearChatSession(documentId: string, userId: string = 'default'): void {
  const sessionIdx = chatsCache.findIndex((s) => s.documentId === documentId && s.userId === userId);
  if (sessionIdx >= 0) {
    chatsCache[sessionIdx].messages = [];
    chatsCache[sessionIdx].updatedAt = new Date().toISOString();
    persistAll();
  }
}

/**
 * Seed realistic academic sample lecture notes so users can test immediately
 */
export function seedDefaultAcademicDocuments() {
  const dbmsId = 'sample_doc_dbms_01';
  const mlId = 'sample_doc_ml_02';

  const dbmsDoc: DocumentMetadata = {
    id: dbmsId,
    userId: 'system',
    filename: 'DBMS_Notes.pdf',
    originalName: 'DBMS_Notes.pdf',
    fileSizeBytes: 2450000,
    totalPages: 4,
    chunkCount: 8,
    uploadedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    status: 'ready',
    summary: 'Comprehensive academic lecture notes covering Relational Model fundamentals, Database Normalization (1NF through BCNF), Functional Dependencies, ACID Transaction Properties, and B+ Tree Indexing.',
    sampleQuestions: [
      'What is normalization and what problems does it solve?',
      'What are the advantages of normalization?',
      'Explain the ACID properties of database transactions.',
      'What is the difference between 3NF and BCNF?',
      'How does indexing improve query performance?',
    ],
  };

  const dbmsChunks: DocumentChunk[] = [
    {
      id: `${dbmsId}_p1_c0`,
      documentId: dbmsId,
      documentName: 'DBMS_Notes.pdf',
      pageNumber: 1,
      chunkIndex: 0,
      text: 'Chapter 1: Relational Database Model & Functional Dependencies.\nIn a Relational Database Management System (RDBMS), data is organized into two-dimensional tables called relations. A relation consists of rows (tuples) and columns (attributes). A candidate key is a minimal superkey that uniquely identifies each tuple. The primary key is chosen among candidate keys to serve as the principal identifier. Functional dependency X -> Y means that if two tuples agree on attribute X, they must also agree on attribute Y.',
      tokenEstimate: 98,
    },
    {
      id: `${dbmsId}_p1_c1`,
      documentId: dbmsId,
      documentName: 'DBMS_Notes.pdf',
      pageNumber: 1,
      chunkIndex: 1,
      text: 'Chapter 2: Normalization Concepts and Redundancy.\nNormalization is the systematic approach of decomposing tables to eliminate data redundancy and avoid undesirable anomalies such as Insertion Anomalies, Deletion Anomalies, and Update Anomalies.\n- Insertion Anomaly: Inability to record certain facts without adding unrelated attributes.\n- Deletion Anomaly: Unintended loss of unrelated data when deleting a record.\n- Update Anomaly: Inconsistent updates across duplicate occurrences of data in multiple records.',
      tokenEstimate: 96,
    },
    {
      id: `${dbmsId}_p2_c2`,
      documentId: dbmsId,
      documentName: 'DBMS_Notes.pdf',
      pageNumber: 2,
      chunkIndex: 2,
      text: 'Chapter 2.1: Normal Forms (1NF, 2NF, 3NF, BCNF).\nFirst Normal Form (1NF): A relation is in 1NF if and only if each attribute contains only atomic (indivisible) values, and there are no repeating groups or multivalued attributes.\nSecond Normal Form (2NF): A relation is in 2NF if it is in 1NF and every non-prime attribute is fully functionally dependent on the entire primary key (no partial dependencies on a subset of a composite key).\nThird Normal Form (3NF): A relation is in 3NF if it is in 2NF and no non-prime attribute is transitively dependent on the primary key (no X -> Y and Y -> Z where Z is non-prime).',
      tokenEstimate: 125,
    },
    {
      id: `${dbmsId}_p2_c3`,
      documentId: dbmsId,
      documentName: 'DBMS_Notes.pdf',
      pageNumber: 2,
      chunkIndex: 3,
      text: 'Chapter 2.2: Boyce-Codd Normal Form (BCNF) & Advantages of Normalization.\nBoyce-Codd Normal Form (BCNF) is a stricter version of 3NF. A relation is in BCNF if for every non-trivial functional dependency X -> Y, X must be a superkey.\nAdvantages of Normalization:\n1. Minimizes duplicate data storage.\n2. Eliminates data anomalies during INSERT, UPDATE, and DELETE operations.\n3. Ensures referential integrity and consistency across related tables.\n4. Simplifies database maintenance and schema evolution.',
      tokenEstimate: 98,
    },
    {
      id: `${dbmsId}_p3_c4`,
      documentId: dbmsId,
      documentName: 'DBMS_Notes.pdf',
      pageNumber: 3,
      chunkIndex: 4,
      text: 'Chapter 3: Transaction Processing & ACID Properties.\nA transaction is a logical unit of database processing that includes one or more database access operations. To maintain data integrity under concurrent access and system crashes, transactions must adhere to ACID properties:\n- Atomicity: "All or nothing". Either all operations of a transaction execute completely, or none are reflected in the database.\n- Consistency: A transaction must transform the database from one valid state to another, preserving all schema invariants and constraints.',
      tokenEstimate: 98,
    },
    {
      id: `${dbmsId}_p3_c5`,
      documentId: dbmsId,
      documentName: 'DBMS_Notes.pdf',
      pageNumber: 3,
      chunkIndex: 5,
      text: 'Chapter 3.1: Isolation and Durability.\n- Isolation: The execution of concurrent transactions must result in a state equivalent to serial execution. Intermediate modifications of one transaction are not visible to other transactions until commit (using isolation levels like Read Committed, Repeatable Read, Serializable).\n- Durability: Once a transaction has committed, its updates persist permanently in non-volatile storage, surviving subsequent power outages or system crashes through write-ahead logging (WAL).',
      tokenEstimate: 92,
    },
    {
      id: `${dbmsId}_p4_c6`,
      documentId: dbmsId,
      documentName: 'DBMS_Notes.pdf',
      pageNumber: 4,
      chunkIndex: 6,
      text: 'Chapter 4: Physical Database Storage and Indexing.\nAn index is an auxiliary data structure that enhances the speed of data retrieval operations on a database table at the cost of additional storage and write overhead.\nPrimary Index: Created on the primary key ordered data file.\nClustered Index: Determines the physical order of data in the table.\nSecondary Index: Created on non-ordering attributes, pointing to records via record pointers or primary keys.',
      tokenEstimate: 87,
    },
    {
      id: `${dbmsId}_p4_c7`,
      documentId: dbmsId,
      documentName: 'DBMS_Notes.pdf',
      pageNumber: 4,
      chunkIndex: 7,
      text: 'Chapter 4.1: B+ Tree Index Architecture.\nA B+ tree is a self-balancing search tree data structure. All actual record pointers or values reside in leaf nodes, which are linked together in a doubly-linked sequential chain. Internal nodes store only search keys and routing pointers. This enables both logarithmic search time O(log N) for point queries and high-efficiency sequential range scanning across contiguous leaf blocks.',
      tokenEstimate: 82,
    },
  ];

  const mlDoc: DocumentMetadata = {
    id: mlId,
    userId: 'system',
    filename: 'Machine_Learning.pdf',
    originalName: 'Machine_Learning.pdf',
    fileSizeBytes: 1840000,
    totalPages: 3,
    chunkCount: 6,
    uploadedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    status: 'ready',
    summary: 'Foundational guide to Machine Learning paradigms, Supervised vs Unsupervised Learning, Bias-Variance Tradeoff, and Neural Network architectures.',
    sampleQuestions: [
      'What is supervised learning?',
      'What are its applications?',
      'Explain the bias-variance tradeoff in machine learning.',
      'What is the difference between supervised and unsupervised learning?',
      'How does gradient descent optimize neural network weights?',
    ],
  };

  const mlChunks: DocumentChunk[] = [
    {
      id: `${mlId}_p1_c0`,
      documentId: mlId,
      documentName: 'Machine_Learning.pdf',
      pageNumber: 1,
      chunkIndex: 0,
      text: 'Section 1: Supervised Learning Foundations.\nAccording to the uploaded document, supervised learning is a core branch of machine learning where algorithms are trained using labeled datasets containing input features (X) paired with corresponding target outputs (Y). The goal is to learn a mapping function f(X) -> Y that accurately predicts outputs for previously unseen data. Common supervised learning tasks include classification (predicting discrete labels like email spam detection) and regression (predicting continuous numerical quantities like house prices).',
      tokenEstimate: 98,
    },
    {
      id: `${mlId}_p1_c1`,
      documentId: mlId,
      documentName: 'Machine_Learning.pdf',
      pageNumber: 1,
      chunkIndex: 1,
      text: 'Section 1.1: Supervised Learning Applications & Algorithms.\nProminent applications of supervised learning include:\n1. Medical diagnosis and patient outcome prognosis.\n2. Autonomous vehicles (object recognition and lane detection).\n3. Financial fraud detection and credit risk scoring.\n4. Natural language processing (sentiment analysis and named entity recognition).\nKey algorithms include Linear Regression, Logistic Regression, Support Vector Machines (SVM), Decision Trees, Random Forests, and Gradient Boosted Trees (XGBoost).',
      tokenEstimate: 90,
    },
    {
      id: `${mlId}_p2_c2`,
      documentId: mlId,
      documentName: 'Machine_Learning.pdf',
      pageNumber: 2,
      chunkIndex: 2,
      text: 'Section 2: Unsupervised Learning & Clustering.\nUnsupervised learning processes unlabeled data without predefined output targets. The model seeks to uncover hidden structures, groupings, or probability densities in the input feature space. Principal techniques include:\n- Clustering: Partitioning observations into homogeneous groups (e.g., K-Means clustering, DBSCAN, Hierarchical clustering).\n- Dimensionality Reduction: Compressing feature spaces while preserving maximum variance (e.g., Principal Component Analysis / PCA, t-SNE).',
      tokenEstimate: 92,
    },
    {
      id: `${mlId}_p2_c3`,
      documentId: mlId,
      documentName: 'Machine_Learning.pdf',
      pageNumber: 2,
      chunkIndex: 3,
      text: 'Section 2.1: Model Evaluation and Generalization.\nGeneralization refers to an algorithm\'s ability to perform accurately on new, previously unobserved inputs. Models must be evaluated using dedicated train-validation-test partitions or K-Fold Cross Validation. Metrics for classification include Accuracy, Precision, Recall, F1-Score (harmonic mean of precision and recall), and Area Under the ROC Curve (AUC-ROC). For regression, Mean Squared Error (MSE) and R-squared are standard.',
      tokenEstimate: 87,
    },
    {
      id: `${mlId}_p3_c4`,
      documentId: mlId,
      documentName: 'Machine_Learning.pdf',
      pageNumber: 3,
      chunkIndex: 4,
      text: 'Section 3: The Bias-Variance Tradeoff.\nTotal prediction error is composed of three components: Bias^2 + Variance + Irreducible Error.\n- High Bias (Underfitting): The model is overly simplistic and fails to capture underlying patterns in the training data, leading to poor training and testing accuracy.\n- High Variance (Overfitting): The model memorizes training noise and idiosyncrasies rather than underlying trends, resulting in near-perfect training scores but poor test generalization.\nThe optimal model complexity balances bias and variance to minimize total test error.',
      tokenEstimate: 104,
    },
    {
      id: `${mlId}_p3_c5`,
      documentId: mlId,
      documentName: 'Machine_Learning.pdf',
      pageNumber: 3,
      chunkIndex: 5,
      text: 'Section 3.1: Neural Networks and Backpropagation.\nDeep learning models are composed of layered artificial neurons with non-linear activation functions (ReLU, Sigmoid, GeLU). Learning is achieved through Backpropagation: the chain rule of calculus computes partial derivatives of the loss function with respect to each network weight. An optimization algorithm, such as Stochastic Gradient Descent (SGD) or Adam, updates the parameters in the direction of negative gradient.',
      tokenEstimate: 88,
    },
  ];

  documentsCache = [dbmsDoc, mlDoc];
  chunksCache = [...dbmsChunks, ...mlChunks];

  persistAll();

  // Async background embed generation for seeded docs
  setTimeout(async () => {
    try {
      for (const chunk of chunksCache) {
        if (!chunk.embedding) {
          const emb = await generateEmbedding(chunk.text);
          if (emb) {
            chunk.embedding = emb;
          }
        }
      }
      persistAll();
    } catch (e) {
      console.warn('Initial seed embedding error (will use lexical fallback if needed):', e);
    }
  }, 1000);
}
