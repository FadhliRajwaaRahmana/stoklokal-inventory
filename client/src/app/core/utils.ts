// core/utils.ts — helper format

// Paksa parse ke timezone Indonesia Barat (WIB, UTC+7) terlepas dari timezone browser.
// Server menyimpan datetime SQLite dalam UTC (datetime('now')) — selalu tampilkan WIB.
export const WIB_TZ = 'Asia/Jakarta';

// SQLite mengirim "YYYY-MM-DD HH:MM:SS" (UTC). Normalisasi:
// 1) spasi → 'T' (format ISO yang valid lintas browser, termasuk Safari)
// 2) pastikan suffix 'Z' (UTC) — tanpa ini browser menginterpretasikan sebagai
//    WAKTU LOKAL, sehingga waktu tampil bergeser (salah) di semua timezone.
function parseDate(iso: string | undefined | null): Date | null {
  if (!iso) return null;
  const norm = iso.replace(' ', 'T');
  const d = new Date(norm.endsWith('Z') ? norm : norm + 'Z');
  return isNaN(d.getTime()) ? null : d;
}

export function formatRupiah(n: number | undefined | null): string {
  const v = Number(n) || 0;
  return 'Rp ' + v.toLocaleString('id-ID');
}

export function formatDate(iso: string | undefined | null): string {
  const d = parseDate(iso);
  if (!d) return '-';
  return d.toLocaleDateString('id-ID', { timeZone: WIB_TZ, day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatTime(iso: string | undefined | null, withSeconds = false): string {
  const d = parseDate(iso);
  if (!d) return '—';
  return d.toLocaleTimeString('id-ID', {
    timeZone: WIB_TZ,
    hour: '2-digit',
    minute: '2-digit',
    ...(withSeconds ? { second: '2-digit' } : {}),
  });
}

export function formatDateTime(iso: string | undefined | null, withSeconds = false): string {
  const d = parseDate(iso);
  if (!d) return '-';
  return (
    d.toLocaleDateString('id-ID', { timeZone: WIB_TZ, day: 'numeric', month: 'short', year: 'numeric' }) +
    ' · ' +
    formatTime(iso, withSeconds)
  );
}

// Waktu "sekarang" dalam WIB — untuk indicator real-time (dashboard, dll)
export function nowWIB(withSeconds = true): string {
  return new Date().toLocaleTimeString('id-ID', {
    timeZone: WIB_TZ,
    hour: '2-digit',
    minute: '2-digit',
    ...(withSeconds ? { second: '2-digit' } : {}),
  });
}

export function timeAgo(iso: string | undefined | null): string {
  const d = parseDate(iso);
  if (!d) return '-';
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'baru saja';
  if (mins < 60) return `${mins} menit lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} jam lalu`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} hari lalu`;
  return formatDate(iso);
}

export function initials(name: string | undefined | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}
