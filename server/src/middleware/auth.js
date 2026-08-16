// middleware/auth.js — verifikasi JWT + revocation (blacklist)
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '../db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SECRET_FILE = path.join(__dirname, '..', 'data', '.jwt-secret');

// JWT_SECRET diutamakan dari env (produksi). Jika tidak ada:
// - dev: generate acak & simpan ke file agar persisten antar restart
// - serverless: generate acak per instance (data tidak persisten di serverless)
function resolveSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  try {
    fs.mkdirSync(path.dirname(SECRET_FILE), { recursive: true });
    if (fs.existsSync(SECRET_FILE)) {
      const saved = fs.readFileSync(SECRET_FILE, 'utf8').trim();
      if (saved) return saved;
    }
    const gen = crypto.randomBytes(48).toString('hex');
    fs.writeFileSync(SECRET_FILE, gen, { mode: 0o600 });
    return gen;
  } catch {
    // Serverless / read-only FS: generate per-instance (token invalid setelah cold start — wajar)
    return crypto.randomBytes(48).toString('hex');
  }
}

export const SECRET = resolveSecret();

export function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, name: user.name }, SECRET, {
    expiresIn: '7d',
    jwtid: crypto.randomUUID(), // unique jti untuk revocation
  });
}

// Bersihkan blacklist yang sudah lewat expiry (sekali per panggilan, hemat query)
function cleanupBlacklist() {
  try {
    db.prepare('DELETE FROM token_blacklist WHERE expires_at < ?').run(Date.now());
  } catch {
    /* ignore — tabel mungkin belum ada saat init */
  }
}

export function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Silakan login terlebih dahulu' });

  try {
    const payload = jwt.verify(token, SECRET);
    // Cek apakah token sudah di-revoke (logout)
    const revoked = db.prepare('SELECT 1 FROM token_blacklist WHERE jti = ?').get(payload.jti);
    if (revoked) return res.status(401).json({ message: 'Sesi tidak valid (sudah logout)' });

    const user = db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?').get(payload.id);
    if (!user) return res.status(401).json({ message: 'Sesi tidak valid' });
    req.user = user;
    req.tokenJti = payload.jti;
    req.tokenExp = payload.exp ? payload.exp * 1000 : Date.now() + 7 * 24 * 3600 * 1000;
    next();
  } catch {
    return res.status(401).json({ message: 'Sesi kadaluarsa, silakan login ulang' });
  }
}

// Revoke token saat logout — masukkan jti ke blacklist sampai expiry
export function revokeToken(jti, expiresAt) {
  if (!jti) return;
  cleanupBlacklist();
  db.prepare('INSERT OR IGNORE INTO token_blacklist (jti, expires_at) VALUES (?, ?)').run(jti, expiresAt);
}
