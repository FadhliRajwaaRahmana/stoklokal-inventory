// core/utils.ts — helper format
export function formatRupiah(n: number | undefined | null): string {
  const v = Number(n) || 0;
  return 'Rp ' + v.toLocaleString('id-ID');
}

export function formatDate(iso: string | undefined | null): string {
  if (!iso) return '-';
  const d = new Date(iso.endsWith('Z') ? iso : iso + 'Z');
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso: string | undefined | null): string {
  if (!iso) return '-';
  const d = new Date(iso.endsWith('Z') ? iso : iso + 'Z');
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

export function timeAgo(iso: string | undefined | null): string {
  if (!iso) return '-';
  const d = new Date(iso.endsWith('Z') ? iso : iso + 'Z');
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
