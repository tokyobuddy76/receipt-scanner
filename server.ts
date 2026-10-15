import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import healthHandler from './api/health.ts';
import receiptScannerHandler from './api/receiptscanner.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Support high-resolution camera and scanned receipt uploads up to 35MB
app.use(express.json({ limit: '35mb' }));
app.use(express.urlencoded({ limit: '35mb', extended: true }));

// Serverless connection routes located in /api folder at project root level
app.all('/api/health', (req, res) => healthHandler(req, res));
app.all('/api/receiptscanner', (req, res) => receiptScannerHandler(req, res));
// Backward compatible alias
app.all('/api/analyze-receipt', (req, res) => receiptScannerHandler(req, res));

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Receipt Scanner server running at http://0.0.0.0:${PORT}`);
    console.log(`Serverless endpoints:`);
    console.log(`  - GET/POST http://0.0.0.0:${PORT}/api/health`);
    console.log(`  - POST     http://0.0.0.0:${PORT}/api/receiptscanner`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
