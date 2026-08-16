// api/index.js — Vercel Serverless Function: Express app sebagai handler
// Dipakai untuk deploy monorepo ke Vercel (frontend + backend satu deploy).
// Node.js runtime Vercel mendukung Express 5.
import { createApp } from '../server/src/app.js';

export default async function handler(req, res) {
  const app = await createApp();
  return app(req, res);
}
