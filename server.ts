import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { apiRouter } from './server/routes/api.js';
import { initStorage } from './server/services/storageService.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Parse JSON request bodies
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Initialize persistent storage and seeds
initStorage();

// Mount API routes
app.use('/api', apiRouter);

// Global API error handler (catches Multer fileFilter errors and others)
app.use('/api', (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('API Error handler:', err.message);
  res.status(err.status || 400).json({
    error: err.message || 'An error occurred while processing the request.',
  });
});

async function startServer() {
  if (!isProduction) {
    // Development mode: Mount Vite dev server middlewares
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    // Production mode: Serve static assets from dist
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DocuMind server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
