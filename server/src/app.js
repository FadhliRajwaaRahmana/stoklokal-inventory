// app.js — Express app factory (dipakai index.js & netlify function)
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { db } from './db.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import categoryRoutes from './routes/categories.js';
import transactionRoutes from './routes/transactions.js';
import dashboardRoutes from './routes/dashboard.js';
import statsRoutes from './routes/stats.js';

// CORS whitelist — dev: localhost:4200; prod: set CORS_ORIGINS env (koma-terpisah)
function resolveOrigins() {
  const env = process.env.CORS_ORIGINS;
  if (env) return env.split(',').map((s) => s.trim()).filter(Boolean);
  return ['http://localhost:4200', 'http://127.0.0.1:4200'];
}

export async function createApp() {
  const app = express();

  // Security headers (helmet): X-Content-Type-Options, X-Frame-Options, dll.
  // Matikan CSP karena frontend Angular butuh inline styles & Google Fonts.
  app.use(helmet({ contentSecurityPolicy: false }));

  // CORS: whitelist origin (bukan '*' sembarang)
  app.use(
    cors({
      origin: (origin, cb) => {
        // Non-browser (curl, server-to-server, health check) tanpa Origin → izinkan
        if (!origin || origin === 'null') return cb(null, true);
        const allowed = resolveOrigins();
        if (allowed.includes(origin)) return cb(null, true);
        // Tolak dengan 403 (bukan 500) — buat error expose dengan status
        const err = new Error('Origin tidak diizinkan');
        err.status = 403;
        err.expose = true;
        return cb(err);
      },
      credentials: false, // token via header (bukan cookie) → Origin:null tidak bisa mencuri sesi
    })
  );

  app.use(express.json({ limit: '100kb' })); // batasi body (anti payload raksasa)

  app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

  app.use('/api/auth', authRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/transactions', transactionRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/stats', statsRoutes); // publik (landing page)

  // 404 JSON (bukan HTML default Express)
  app.use((_req, res) => res.status(404).json({ message: 'Endpoint tidak ditemukan' }));

  // Error handler terpusat — jangan bocorkan stack trace ke client
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    console.error('[server] error:', err.message);
    const status = err.status || 500;
    const message = err.expose ? err.message : 'Terjadi kesalahan pada server';
    res.status(status).json({ message });
  });

  return app;
}

export { db };
