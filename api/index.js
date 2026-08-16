// api/index.js — Vercel Serverless Function: Express app sebagai handler
// Turso (SQLite cloud) → data PERMANEN di Vercel.
import { createApp } from '../server/src/app.js';
import { db } from '../server/src/db.js';
import { seed } from '../server/src/seed.js';

// Seed otomatis jika DB kosong (Turso cloud / :memory: cold start)
let seeded = false;
async function ensureSeed() {
  if (seeded) return;
  try {
    const row = await db.prepare('SELECT COUNT(*) AS n FROM users').get();
    if (!row || row.n === 0) {
      await seed();
    }
    seeded = true;
  } catch {
    // ignore — jangan crash handler jika seed gagal
  }
}

let appPromise = null;

export default async function handler(req, res) {
  if (!appPromise) {
    await ensureSeed();
    appPromise = createApp();
  }
  const app = await appPromise;
  return app(req, res);
}
