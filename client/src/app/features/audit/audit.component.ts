// features/audit/audit.component.ts — riwayat audit: semua aktivitas tercatat lengkap
// (login/register/logout, buat/ubah/hapus, stok masuk/keluar) + detail sebelum→sesudah.
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { DataService } from '../../core/services/data.service';
import { ToastService } from '../../core/services/toast.service';
import { AuditLog, actionMeta, entityLabel } from '../../core/models';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { GsapRevealDirective } from '../../shared/directives/gsap-reveal.directive';

interface ParsedDetails {
  raw: string;
  rows: { k: string; v: string }[];
  before?: { k: string; v: string }[];
  after?: { k: string; v: string }[];
}

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [
    CommonModule, FormsModule, IconComponent, EmptyStateComponent, SkeletonComponent,
    PageHeaderComponent, GsapRevealDirective,
  ],
  template: `
    <app-page-header
      title="Audit Log"
      subtitle="Jejak semua aktivitas — siapa melakukan apa, kapan, dan detailnya"
    />

    <!-- Toolbar: filter aksi + search -->
    <div class="toolbar card" gsapReveal [gsapRevealY]="24">
      <div class="search-box">
        <app-icon name="search" [size]="18" />
        <input
          class="input search-input"
          type="text"
          placeholder="Cari pelaku, entitas, atau detail..."
          [ngModel]="search"
          (ngModelChange)="onSearch($event)"
        />
      </div>
      <div class="filter-chips">
        <button
          class="chip"
          [class.chip--active]="action === ''"
          (click)="setAction('')"
        >Semua</button>
        <button
          *ngFor="let a of actionFilters"
          class="chip"
          [class.chip--active]="action === a.value"
          (click)="setAction(a.value)"
        >{{ a.label }}</button>
      </div>
    </div>

    <!-- Daftar log -->
    <div class="card table-card" gsapReveal [gsapRevealDelay]="0.08">
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th class="time-col">Waktu</th>
              <th>Pelaku</th>
              <th>Aksi</th>
              <th>Entitas</th>
              <th>Detail</th>
              <th class="ip-col">IP</th>
            </tr>
          </thead>
          <tbody *ngIf="!loading && rows.length; else emptyTpl">
            <tr *ngFor="let log of rows">
              <td class="time-cell">
                <span class="log-time">{{ fmtTime(log.created_at) }}</span>
                <small class="log-date">{{ fmtDate(log.created_at) }}</small>
              </td>
              <td class="actor-cell">
                <span class="actor-avatar" [style.background]="avatarColor(log.actor)">{{ log.actor.charAt(0).toUpperCase() }}</span>
                <span class="actor-name">{{ log.actor || '—' }}</span>
              </td>
              <td><span class="badge" [class]="actionMeta(log.action).cls">{{ actionMeta(log.action).label }}</span></td>
              <td>
                <span class="entity-chip">{{ entityLabel(log.entity) || '—' }}</span>
                <small *ngIf="log.entity_id != null" class="entity-id">#{{ log.entity_id }}</small>
              </td>
              <td>
                <div class="detail-box" [class.detail-box--long]="detailOf(log).rows.length > 3">
                  <ng-container *ngIf="detailOf(log).before && detailOf(log).after; else plainDetail">
                    <span class="kv-diff">
                      <span class="kv-old" title="Sebelum">{{ kvSummary(detailOf(log).before) }}</span>
                      <span class="kv-arrow"><app-icon name="arrow-right" [size]="12" /></span>
                      <span class="kv-new" title="Sesudah">{{ kvSummary(detailOf(log).after) }}</span>
                    </span>
                  </ng-container>
                  <ng-template #plainDetail>
                    <span class="kv-inline">{{ kvSummary(detailOf(log).rows) }}</span>
                  </ng-template>
                  <span *ngIf="detailOf(log).raw !== '{}' && !detailOf(log).before" class="kv-more">
                    {{ detailOf(log).rows.length > 3 ? ' +' + (detailOf(log).rows.length - 3) + ' lagi' : '' }}
                  </span>
                </div>
              </td>
              <td class="ip-cell"><code class="ip-code">{{ log.ip || '—' }}</code></td>
            </tr>
          </tbody>
          <ng-template #emptyTpl>
            <tbody>
              <tr>
                <td colspan="6">
                  <div *ngIf="loading" class="loading-row">
                    <app-skeleton [height]="18" /><app-skeleton [height]="18" /><app-skeleton [height]="18" /><app-skeleton [height]="18" />
                  </div>
                  <app-empty-state
                    *ngIf="!loading"
                    icon="clipboard"
                    title="Belum ada aktivitas"
                    description="Semua perubahan (tambah, ubah, hapus, login) akan tercatat di sini secara otomatis."
                  />
                </td>
              </tr>
            </tbody>
          </ng-template>
        </table>
      </div>

      <div class="table-foot">
        <span class="count-label">{{ rows.length }} dari {{ total }} aktivitas</span>
        <div class="pager" *ngIf="total > limit">
          <button class="icon-btn" [disabled]="offset === 0" (click)="prevPage()"><app-icon name="chevron-right" [size]="16" class="flip" /></button>
          <span class="page-ind">Hal {{ currentPage }} / {{ totalPages }}</span>
          <button class="icon-btn" [disabled]="offset + limit >= total" (click)="nextPage()"><app-icon name="chevron-right" [size]="16" /></button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .card { background: #fff; border: 3px solid #0a0a0a; border-radius: 24px; box-shadow: 4px 4px 0 #0a0a0a; }
    .toolbar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; padding: 16px; margin-bottom: 16px; }
    .search-box { position: relative; flex: 1; min-width: 200px; display: flex; align-items: center; }
    .search-box app-icon { position: absolute; left: 14px; color: #888; pointer-events: none; }
    .search-input { padding-left: 42px; }
    .filter-chips { display: flex; gap: 8px; flex-wrap: wrap; }
    .chip {
      padding: 8px 14px; border-radius: 9999px; border: 2px solid #0a0a0a; font-weight: 800;
      font-size: .78rem; background: #fff; transition: transform .15s, box-shadow .15s; white-space: nowrap;
    }
    .chip:hover { transform: translateY(-2px); box-shadow: 2px 2px 0 #0a0a0a; }
    .chip--active { background: #f8be9e; box-shadow: 3px 3px 0 #0a0a0a; }
    @media (max-width: 640px) {
      .toolbar { flex-direction: column; align-items: stretch; }
      .search-box { min-width: 0; }
      .filter-chips { overflow-x: auto; flex-wrap: nowrap; padding-bottom: 4px; -webkit-overflow-scrolling: touch; }
    }

    .table-card { padding: 0; overflow: hidden; }
    .table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .table { min-width: 720px; }
    .time-col { min-width: 110px; }
    .ip-col { min-width: 110px; }

    .time-cell { display: flex; flex-direction: column; gap: 2px; }
    .log-time { font-weight: 800; font-size: .78rem; }
    .log-date { color: #999; font-size: .68rem; }

    .actor-cell { display: flex; align-items: center; gap: 8px; }
    .actor-avatar {
      width: 30px; height: 30px; border-radius: 10px; border: 2px solid #0a0a0a; flex-shrink: 0;
      display: grid; place-items: center; font-family: 'Nunito', sans-serif; font-weight: 900; font-size: .78rem;
    }
    .actor-name { font-weight: 800; font-size: .8rem; white-space: nowrap; }

    .badge {
      display: inline-block; padding: 4px 10px; border-radius: 9999px; border: 2px solid #0a0a0a;
      font-size: .68rem; font-weight: 800; white-space: nowrap;
    }
    .action-create { background: #bcffbe; }
    .action-update { background: #ffd670; }
    .action-delete { background: #ff7096; color: #fff; }
    .action-login { background: #70d6ff; }
    .action-login-failed { background: #ffb3c6; }
    .action-register { background: #d8b4fe; }
    .action-logout { background: #e8e8e8; }
    .action-stock-in { background: #bcffbe; }
    .action-stock-out { background: #70d6ff; }
    .action-other { background: #f8be9e; }

    .entity-chip {
      display: inline-block; padding: 3px 9px; border-radius: 9999px; background: #fff1e6;
      border: 2px solid #0a0a0a; font-size: .68rem; font-weight: 700; white-space: nowrap;
    }
    .entity-id { color: #999; font-size: .68rem; margin-left: 4px; }

    .detail-box { max-width: 320px; }
    .kv-inline { font-size: .74rem; color: #555; font-weight: 600; word-break: break-word; }
    .kv-diff { display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .kv-old { font-size: .7rem; color: #c0392b; text-decoration: line-through; background: rgba(255,112,150,.12); padding: 2px 6px; border-radius: 6px; font-weight: 700; }
    .kv-new { font-size: .7rem; color: #1e8449; background: rgba(188,255,190,.5); padding: 2px 6px; border-radius: 6px; font-weight: 800; }
    .kv-arrow { display: inline-flex; color: #999; }
    .kv-more { font-size: .68rem; color: #999; font-weight: 700; }
    .detail-box--long { max-width: none; }

    .ip-code {
      font-family: 'JetBrains Mono', 'Consolas', monospace; font-size: .68rem; color: #555;
      background: #f5f5f5; border: 1px solid #ddd; padding: 2px 6px; border-radius: 6px;
    }

    .table-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 20px; border-top: 3px solid #0a0a0a; }
    .count-label { font-size: .8rem; font-weight: 700; color: #888; }
    .pager { display: flex; align-items: center; gap: 10px; }
    .page-ind { font-size: .8rem; font-weight: 700; }
    .icon-btn {
      width: 34px; height: 34px; border-radius: 10px; border: 2px solid #0a0a0a; background: #fff;
      display: inline-grid; place-items: center; transition: transform .15s, background .15s;
    }
    .icon-btn:hover { transform: translateY(-2px); background: #fff7ef; }
    .icon-btn:disabled { opacity: .4; cursor: not-allowed; transform: none; }
    .flip { transform: rotate(180deg); }

    .loading-row { display: flex; flex-direction: column; gap: 12px; padding: 20px; }
  `],
})
export class AuditComponent implements OnDestroy {
  private data = inject(DataService);
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  rows: AuditLog[] = [];
  total = 0;
  loading = true;

  search = '';
  action = '';
  limit = 50;
  offset = 0;

  actionFilters = [
    { value: 'login', label: 'Login' },
    { value: 'login_failed', label: 'Login Gagal' },
    { value: 'register', label: 'Daftar' },
    { value: 'logout', label: 'Logout' },
    { value: 'create', label: 'Buat' },
    { value: 'update', label: 'Ubah' },
    { value: 'delete', label: 'Hapus' },
    { value: 'stock_in', label: 'Stok Masuk' },
    { value: 'stock_out', label: 'Stok Keluar' },
  ];

  private searchSub = new Subject<string>();
  private subs: Subscription[] = [];

  constructor() {
    this.subs.push(
      this.searchSub.pipe(debounceTime(350), distinctUntilChanged()).subscribe(() => {
        this.offset = 0;
        this.load();
      })
    );
    this.load();
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.limit));
  }

  get currentPage(): number {
    return Math.floor(this.offset / this.limit) + 1;
  }

  private load(): void {
    this.loading = true;
    this.data
      .getAuditLogs({
        action: this.action || undefined,
        search: this.search || undefined,
        limit: this.limit,
        offset: this.offset,
      })
      .subscribe({
        next: (res) => {
          this.rows = res.rows;
          this.total = res.total;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.loading = false;
          this.toast.error(err.message || 'Gagal memuat audit log');
          this.cdr.markForCheck();
        },
      });
  }

  onSearch(v: string): void {
    this.search = v;
    this.searchSub.next(v);
  }

  setAction(a: string): void {
    this.action = a;
    this.offset = 0;
    this.load();
  }

  prevPage(): void {
    this.offset = Math.max(0, this.offset - this.limit);
    this.load();
  }

  nextPage(): void {
    this.offset += this.limit;
    this.load();
  }

  // ----- helpers tampilan -----
  actionMeta(a: string) {
    return actionMeta(a);
  }

  entityLabel(e: string): string {
    return entityLabel(e);
  }

  fmtTime(iso: string): string {
    if (!iso) return '—';
    const d = new Date(iso.replace(' ', 'T') + (iso.includes('Z') ? '' : 'Z'));
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }

  fmtDate(iso: string): string {
    if (!iso) return '—';
    const d = new Date(iso.replace(' ', 'T') + (iso.includes('Z') ? '' : 'Z'));
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  // Parse detail JSON → pasangan k/v untuk ditampilkan
  private parsedCache = new Map<number, ParsedDetails>();
  detailOf(log: AuditLog): ParsedDetails {
    const cached = this.parsedCache.get(log.id);
    if (cached) return cached;
    let obj: Record<string, unknown> = {};
    try {
      obj = JSON.parse(log.details || '{}');
    } catch {
      obj = {};
    }
    const out: ParsedDetails = {
      raw: log.details || '',
      rows: [],
    };
    const KV = (o: Record<string, unknown>, n: number) =>
      Object.entries(o || {})
        .slice(0, n)
        .map(([k, v]) => ({
          k,
          v: typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v ?? ''),
        }));
    const before = obj['before'];
    const after = obj['after'];
    if (before && typeof before === 'object' && after && typeof after === 'object') {
      out.before = KV(before as Record<string, unknown>, 6);
      out.after = KV(after as Record<string, unknown>, 6);
    } else {
      out.rows = KV(obj, 6);
    }
    this.parsedCache.set(log.id, out);
    return out;
  }

  kvSummary(rows?: { k: string; v: string }[]): string {
    if (!rows || !rows.length) return '—';
    return rows.map((r) => `${r.k}=${r.v}`).join(', ');
  }

  avatarColor(name: string): string {
    const colors = ['#f8be9e', '#70d6ff', '#ffd670', '#bcffbe', '#d8b4fe', '#ffb3c6'];
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return colors[h % colors.length];
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
    this.parsedCache.clear();
  }
}
