// audit.js — pencatat jejak aktivitas (audit trail).
// Semua operasi penting (login, CRUD, transaksi) dicatat ke tabel audit_logs.
// Prinsip: audit TIDAK PERNAH menggagalkan operasi utama — error di sini di-ignore.
import { db } from './db.js';

const MAX_LEN = 120; // panjang maks satu nilai string dalam snapshot

// Snapshot ringkas (batasi ukuran — jangan simpan field raksasa)
function toSnapshot(value) {
  if (!value || typeof value !== 'object') {
    const s = value == null ? '' : String(value);
    return s.slice(0, MAX_LEN);
  }
  const out = {};
  for (const k of Object.keys(value).slice(0, 8)) {
    const v = value[k];
    out[k] = typeof v === 'string' ? v.slice(0, MAX_LEN) : v;
  }
  return out;
}

// Konteks jaringan dari request — konsisten dengan rate limiter:
// jangan percaya X-Forwarded-For tanpa trust proxy (spoofable).
export function auditContext(req) {
  const ip = req.socket?.remoteAddress || '';
  const ua = typeof req.headers?.['user-agent'] === 'string' ? req.headers['user-agent'].slice(0, 250) : '';
  return { ip, ua };
}

// Catat satu entri audit. `details` di-serialize ke JSON.
// userId nullable (misal login gagal — user belum teridentifikasi).
export async function logAudit({ userId, actor, action, entity, entityId, details, ip, ua }) {
  try {
    await db
      .prepare(
        `INSERT INTO audit_logs (user_id, actor, action, entity, entity_id, details, ip, user_agent, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+7 hours'))`
      )
      .run(
        userId ?? null,
        typeof actor === 'string' ? actor.slice(0, 120) : '',
        action,
        entity ?? '',
        entityId ?? null,
        JSON.stringify(details ?? {}),
        ip ?? '',
        ua ?? ''
      );
  } catch {
    /* audit tidak boleh merusak operasi utama */
  }
}

export { toSnapshot };
