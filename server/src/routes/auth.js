// routes/auth.js — register, login, me, logout (+ rate limiting anti brute force, token revocation)
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { signToken, authRequired, revokeToken } from '../middleware/auth.js';
import { logAudit, auditContext } from '../audit.js';

const router = Router();

// ---------- Rate limiter in-memory (per IP, HANYA untuk percobaan GAGAL) ----------
// Maks 10 percobaan GAGAL / 15 menit per IP (anti brute force).
// Login/register sukses tidak dihitung — jadi tidak mengganggu user normal.
const failedAttempts = new Map(); // ip → { count, resetAt }
function rateLimitFailed(ip) {
  const now = Date.now();
  const rec = failedAttempts.get(ip);
  if (!rec || rec.resetAt < now) {
    failedAttempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return true;
  }
  rec.count += 1;
  return rec.count <= 10;
}
function recordSuccess(ip) {
  failedAttempts.delete(ip); // reset setelah berhasil
}
function clientIp(req) {
  // Jangan percaya X-Forwarded-For tanpa trust proxy — spoofable.
  // Gunakan remoteAddress langsung (rate limit per koneksi asli).
  return req.socket?.remoteAddress || 'unknown';
}

// ---------- Validasi ----------
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/register', async (req, res) => {
  const ip = clientIp(req);
  if (!rateLimitFailed(ip)) {
    return res.status(429).json({ message: 'Terlalu banyak percobaan. Coba lagi 15 menit lagi.' });
  }
  const { name, email, password } = req.body || {};
  if (!name?.trim() || !email?.trim() || !password) {
    return res.status(400).json({ message: 'Nama, email, dan password wajib diisi' });
  }
  const normalizedEmail = String(email).trim().toLowerCase();
  if (!EMAIL_RE.test(normalizedEmail)) {
    return res.status(400).json({ message: 'Format email tidak valid' });
  }
  if (String(name).trim().length < 2 || String(name).trim().length > 80) {
    return res.status(400).json({ message: 'Nama harus 2–80 karakter' });
  }
  if (String(password).length < 6 || String(password).length > 72) {
    return res.status(400).json({ message: 'Password harus 6–72 karakter' });
  }
  const exists = await db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
  if (exists) return res.status(409).json({ message: 'Email sudah terdaftar' });

  const hash = bcrypt.hashSync(String(password), 10);
  const info = await db
    .prepare('INSERT INTO users (name, email, password, created_at) VALUES (?, ?, ?, datetime(\'now\', \'+7 hours\'))')
    .run(name.trim(), normalizedEmail, hash);
  recordSuccess(ip);
  const user = { id: info.lastInsertRowid, name: name.trim(), email: normalizedEmail };
  await logAudit({
    userId: user.id,
    actor: user.name,
    action: 'register',
    entity: 'user',
    entityId: user.id,
    details: { email: normalizedEmail },
    ip,
    ua: auditContext(req).ua,
  });
  res.status(201).json({ token: signToken(user), user });
});

router.post('/login', async (req, res) => {
  const ip = clientIp(req);
  if (!rateLimitFailed(ip)) {
    return res.status(429).json({ message: 'Terlalu banyak percobaan. Coba lagi 15 menit lagi.' });
  }
  const { email, password } = req.body || {};
  if (!email?.trim() || !password) return res.status(400).json({ message: 'Email dan password wajib diisi' });

  const user = await db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).trim().toLowerCase());
  if (!user || !bcrypt.compareSync(String(password), user.password)) {
    // Login gagal tercatat atas nama user TERSANGKA (jika email terdaftar) —
    // pemilik akun bisa melihat percobaan login gagal ke akunnya sendiri.
    const suspect = user ? { id: user.id, name: user.name } : null;
    await logAudit({
      userId: suspect?.id ?? null,
      actor: suspect?.name ?? '',
      action: 'login_failed',
      entity: 'user',
      entityId: suspect?.id ?? null,
      details: { email: String(email).trim().toLowerCase() },
      ip,
      ua: auditContext(req).ua,
    });
    return res.status(401).json({ message: 'Email atau password salah' });
  }
  recordSuccess(ip);
  const safe = { id: user.id, name: user.name, email: user.email, created_at: user.created_at };
  await logAudit({
    userId: user.id,
    actor: user.name,
    action: 'login',
    entity: 'user',
    entityId: user.id,
    details: { email: user.email },
    ip,
    ua: auditContext(req).ua,
  });
  res.json({ token: signToken(safe), user: safe });
});

router.get('/me', authRequired, (req, res) => res.json({ user: req.user }));

// Logout: revoke token (masuk blacklist sampai expiry) — token lama tidak bisa dipakai lagi
router.post('/logout', authRequired, async (req, res) => {
  const exp = req.tokenExp;
  if (req.tokenJti && exp) await revokeToken(req.tokenJti, exp);
  await logAudit({
    userId: req.user.id,
    actor: req.user.name,
    action: 'logout',
    entity: 'user',
    entityId: req.user.id,
    details: {},
    ip: auditContext(req).ip,
    ua: auditContext(req).ua,
  });
  res.json({ ok: true });
});

export default router;
