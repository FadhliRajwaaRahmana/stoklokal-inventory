// api/index.js — Vercel Serverless Function: Express app sebagai handler
// Dipakai untuk deploy monorepo ke Vercel (frontend + backend satu deploy).
import { createApp } from '../server/src/app.js';
import { db } from '../server/src/db.js';
// Import seed di module-level → side-effect seed() jalan SEKALI saat cold start,
// SEBELUM handler menerima request apa pun. Pasti akun demo tersedia.
import '../server/src/seed.js';

let appPromise = null;

export default async function handler(req, res) {
  if (!appPromise) {
    appPromise = createApp();
  }
  const app = await appPromise;
  return app(req, res);
}
