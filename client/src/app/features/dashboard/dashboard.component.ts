// features/dashboard/dashboard.component.ts — dashboard: statistik, chart, alert stok, transaksi terbaru
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, ElementRef, inject, OnDestroy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterModule } from '@angular/router';
import Chart from 'chart.js/auto';
import { DataService } from '../../core/services/data.service';
import { ToastService } from '../../core/services/toast.service';
import { DashboardData, Product, stockStatus } from '../../core/models';
import { formatRupiah, nowDeviceFull, timeAgo as timeAgoFn, WIB_TZ } from '../../core/utils';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { GsapRevealDirective } from '../../shared/directives/gsap-reveal.directive';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, RouterModule, IconComponent, StatCardComponent,
    EmptyStateComponent, GsapRevealDirective,
  ],
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title">Halo, {{ userName }}!</h1>
        <p class="page-sub">Ini ringkasan inventori Anda hari ini.</p>
      </div>
      <div class="header-actions">
        <span class="live-indicator" title="Data diperbarui otomatis setiap 30 detik">
          <span class="live-dot"></span>
          <span class="live-text">
            <span class="live-label">Terakhir update</span>
            <time class="live-clock">{{ liveClock }}</time>
          </span>
        </span>
        <button class="btn btn-primary" routerLink="/transactions" (click)="goTransactions()">
          <app-icon name="plus" [size]="18" /> Catat Transaksi
        </button>
      </div>
    </div>

    <!-- Error state + retry -->
    <div *ngIf="errorMessage" class="error-box">
      <app-icon name="alert" [size]="20" />
      <span>{{ errorMessage }}</span>
      <button class="btn btn-ghost btn-sm" (click)="load()">Coba lagi</button>
    </div>

    <!-- Stat cards -->
    <div class="stats-grid" gsapReveal [gsapRevealY]="30">
      <app-stat-card
        *ngIf="data"
        label="Total Produk" [value]="data.cards.products" icon="package" tone="peach"
        sub="SKU aktif di katalog" [clickable]="true" (cardClick)="goProducts()"
      />
      <app-stat-card
        *ngIf="data"
        label="Total Stok" [value]="data.cards.totalStock" icon="boxes" tone="blue"
        sub="Unit tersimpan"
      />
      <app-stat-card
        *ngIf="data"
        label="Nilai Inventori" [value]="data.cards.inventoryValue" prefix="Rp " icon="coins" tone="yellow"
        sub="Berdasarkan harga modal" [clickable]="true" (cardClick)="goProducts()"
      />
      <app-stat-card
        *ngIf="data"
        label="Stok Menipis" [value]="data.cards.lowStock" icon="alert" tone="pink"
        sub="Perlu restock segera" [clickable]="true" (cardClick)="goProducts('low')"
      />
      <app-stat-card *ngIf="!data" label="Memuat..." [value]="0" icon="box" tone="peach" [animate]="false" />
      <app-stat-card *ngIf="!data" label="Memuat..." [value]="0" icon="box" tone="blue" [animate]="false" />
      <app-stat-card *ngIf="!data" label="Memuat..." [value]="0" icon="box" tone="yellow" [animate]="false" />
      <app-stat-card *ngIf="!data" label="Memuat..." [value]="0" icon="box" tone="pink" [animate]="false" />
    </div>

    <!-- Chart + low stock -->
    <div class="dashboard-grid">
      <div class="card chart-card" gsapReveal [gsapRevealDelay]="0.1">
        <div class="card-head">
          <div>
            <h3 class="card-title">Pergerakan Stok</h3>
            <span class="card-sub">7 hari terakhir</span>
          </div>
          <div class="chart-legend">
            <span class="legend-item"><span class="legend-dot" style="background:#f8be9e"></span> Masuk</span>
            <span class="legend-item"><span class="legend-dot" style="background:#70d6ff"></span> Keluar</span>
          </div>
        </div>
        <div class="chart-wrap">
          <canvas id="chartCanvas"></canvas>
        </div>
      </div>

      <div class="card low-card" gsapReveal [gsapRevealDelay]="0.15">
        <div class="card-head">
          <div>
            <h3 class="card-title">Stok Menipis</h3>
            <span class="card-sub">Segera lakukan restock</span>
          </div>
          <button class="btn btn-ghost btn-sm" routerLink="/products" (click)="goProducts('low')">Lihat semua</button>
        </div>
        <div class="low-list">
          <ng-container *ngIf="data?.lowStockItems?.length; else lowEmpty">
            <a
              *ngFor="let p of data!.lowStockItems"
              class="low-item"
              routerLink="/products"
              (click)="goProducts('low')"
            >
              <span class="low-emoji"><app-icon name="alert" [size]="20" /></span>
              <div class="low-info">
                <strong>{{ p.name }}</strong>
                <small>{{ p.category_name }} · {{ p.sku }}</small>
              </div>
              <span class="low-qty" [class.low-qty--out]="p.stock <= 0">
                {{ p.stock <= 0 ? 'Habis' : p.stock + ' tersisa' }}
              </span>
            </a>
          </ng-container>
          <ng-template #lowEmpty>
            <p class="low-all-good">Semua stok aman!</p>
          </ng-template>
        </div>
      </div>
    </div>

    <!-- Recent transactions -->
    <div class="card recent-card" gsapReveal [gsapRevealDelay]="0.2">
      <div class="card-head">
        <div>
          <h3 class="card-title">Transaksi Terbaru</h3>
          <span class="card-sub">Aktivitas stok masuk & keluar</span>
        </div>
        <button class="btn btn-ghost btn-sm" routerLink="/transactions">
          Lihat riwayat <app-icon name="chevron-right" [size]="15" />
        </button>
      </div>

      <div class="table-wrap" data-lenis-prevent>
        <table class="table">
          <thead>
            <tr>
              <th>Produk</th>
              <th>Tipe</th>
              <th>Jumlah</th>
              <th>Waktu</th>
            </tr>
          </thead>
          <tbody *ngIf="data?.recent?.length; else recentEmpty">
            <tr *ngFor="let t of data!.recent">
              <td>
                <strong>{{ t.product_name }}</strong>
                <small class="table-sku">{{ t.product_sku }}</small>
              </td>
              <td>
                <span class="badge" [class.badge--in]="t.type === 'in'" [class.badge--out]="t.type === 'out'">
                  {{ t.type === 'in' ? '↓ Masuk' : '↑ Keluar' }}
                </span>
              </td>
              <td class="tx-qty" [class.tx-qty--in]="t.type === 'in'" [class.tx-qty--out]="t.type === 'out'">
                {{ t.type === 'in' ? '+' : '-' }}{{ t.qty }}
              </td>
              <td class="tx-time">{{ timeAgo(t.created_at) }}</td>
            </tr>
          </tbody>
          <ng-template #recentEmpty>
            <tbody>
              <tr><td colspan="4"><app-empty-state icon="repeat" title="Belum ada transaksi" description="Catat transaksi pertama Anda untuk melihat aktivitas di sini." /></td></tr>
            </tbody>
          </ng-template>
        </table>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .page-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 26px; }
    .page-title { font-size: clamp(1.5rem, 3vw, 2rem); font-weight: 900; margin: 0; }
    .page-sub { color: #555; margin: 4px 0 0; }
    .error-box {
      display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
      background: #ffeef4; border: 3px solid #0a0a0a; border-radius: 16px;
      padding: 12px 16px; margin-bottom: 18px; font-weight: 700; color: #c62828;
    }
    .error-box .btn { margin-left: auto; }
    .header-actions { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
    .live-indicator {
      display: inline-flex; align-items: center; gap: 10px;
      background: #fff; border: 2px solid #0a0a0a; border-radius: 18px;
      padding: 8px 14px; box-shadow: 2px 2px 0 #0a0a0a;
      transition: transform .2s cubic-bezier(.34,1.56,.64,1), box-shadow .2s;
    }
    .live-indicator:hover { transform: translateY(-2px); box-shadow: 4px 4px 0 #0a0a0a; }
    .live-dot {
      width: 10px; height: 10px; border-radius: 50%; background: #2e7d32; flex-shrink: 0;
      animation: livePulse 1.3s ease-in-out infinite;
      box-shadow: 0 0 0 3px rgba(46,125,50,.2);
    }
    .live-text { display: flex; flex-direction: column; line-height: 1.15; }
    .live-label {
      font-size: .62rem; font-weight: 800; text-transform: uppercase;
      letter-spacing: .08em; color: #999;
    }
    .live-clock {
      font-family: 'Nunito', sans-serif; font-weight: 900; font-size: .78rem;
      color: #0a0a0a; font-variant-numeric: tabular-nums; /* angka tidak goyang saat detik berganti */
    }
    @keyframes livePulse {
      0%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 0 0 3px rgba(46,125,50,.2); }
      50% { opacity: .45; transform: scale(.75); box-shadow: 0 0 0 6px rgba(46,125,50,0); }
    }
    @media (max-width: 560px) {
      .live-clock { font-size: .72rem; }
      .live-indicator { padding: 7px 11px; border-radius: 14px; }
    }
    @media (max-width: 560px) {
      .page-header { align-items: flex-start; gap: 12px; margin-bottom: 20px; }
      .page-title { font-size: 1.35rem; }
      .page-header .btn { padding: 10px 16px; font-size: .85rem; }
    }

    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 26px; }
    @media (max-width: 1100px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 560px) { .stats-grid { grid-template-columns: 1fr; } }

    .dashboard-grid { display: grid; grid-template-columns: 1.6fr 1fr; gap: 18px; margin-bottom: 26px; }
    @media (max-width: 960px) { .dashboard-grid { grid-template-columns: 1fr; } }

    .card { background: #fff; border: 3px solid #0a0a0a; border-radius: 24px; box-shadow: 4px 4px 0 #0a0a0a; padding: 22px; }
    .card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
    .card-title { font-size: 1.15rem; font-weight: 900; margin: 0 0 2px; }
    .card-sub { color: #888; font-size: .78rem; font-weight: 600; }

    .chart-wrap { position: relative; height: 280px; }
    .chart-legend { display: flex; gap: 14px; font-size: .75rem; font-weight: 700; color: #555; }
    .legend-item { display: flex; align-items: center; gap: 6px; }
    .legend-dot { width: 10px; height: 10px; border-radius: 4px; border: 2px solid #0a0a0a; }

    .low-list { display: flex; flex-direction: column; }
    .low-item {
      display: flex; align-items: center; gap: 12px; padding: 12px 10px; border-radius: 14px;
      border-bottom: 2px dashed #e8e0d6; cursor: pointer; transition: background .15s, transform .15s;
    }
    .low-item:hover { background: #fff7ef; transform: translateX(4px); }
    .low-item:last-child { border-bottom: none; }
    .low-emoji { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border: 2px solid #0a0a0a; border-radius: 12px; background: #fff; color: #e07a5f; flex-shrink: 0; }
    .low-info { min-width: 0; flex: 1; }
    .low-info strong { display: block; font-size: .88rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .low-info small { color: #888; font-size: .72rem; }
    .low-qty {
      font-family: 'Nunito', sans-serif; font-weight: 900; font-size: .8rem; padding: 4px 10px;
      border-radius: 9999px; background: #ffd670; border: 2px solid #0a0a0a; white-space: nowrap;
    }
    .low-qty--out { background: #ff7096; color: #fff; }
    .low-all-good { color: #4a7c4f; font-weight: 700; text-align: center; padding: 24px 0; }

    .table-sku { display: block; color: #999; font-size: .7rem; }
    .badge { display: inline-flex; padding: 4px 10px; border-radius: 9999px; font-size: .72rem; font-weight: 800; border: 2px solid #0a0a0a; }
    .badge--in { background: #bcffbe; }
    .badge--out { background: #70d6ff; }
    .tx-qty { font-family: 'Nunito', sans-serif; font-weight: 900; }
    .tx-qty--in { color: #2e7d32; }
    .tx-qty--out { color: #c62828; }
    .tx-time { color: #888; font-size: .8rem; white-space: nowrap; }
  `],
})
export class DashboardComponent implements OnDestroy {
  private dataService = inject(DataService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private el = inject(ElementRef<HTMLElement>);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  data: DashboardData | null = null;
  errorMessage: string | null = null;
  liveClock: string = ''; // jam real-time (ticking tiap detik) — mengikuti timezone device
  lastUpdatedStamp = 0;   // waktu fetch terakhir (ms) — dipakai untuk animasi refresh
  private chart?: Chart;
  private autoRefresh?: ReturnType<typeof setInterval>;
  private clockTick?: ReturnType<typeof setInterval>;

  constructor() {
    this.load();
    // REAL-TIME: auto-refresh data setiap 30 detik (tanpa reload halaman)
    this.autoRefresh = setInterval(() => {
      // Hanya refresh jika halaman terlihat (hemat resource di background tab)
      if (!document.hidden) this.load(true);
    }, 30_000);

    // Jam berjalan real-time — tampilkan tanggal & waktu sesuai timezone device
    // pengguna, update detik (tidak hanya saat data refresh).
    this.updateClock();
    this.clockTick = setInterval(() => {
      if (!document.hidden) this.updateClock();
    }, 1000);
  }

  private updateClock(): void {
    this.liveClock = nowDeviceFull();
    // Zoneless: tidak perlu markForCheck di sini — string berubah & CD cukup
    // (bukan async external; interval callback zoneless tetap butuh markForCheck)
    this.cdr.markForCheck();
  }

  ngOnDestroy(): void {
    if (this.autoRefresh) clearInterval(this.autoRefresh);
    if (this.clockTick) clearInterval(this.clockTick);
    this.chart?.destroy();
  }

  timeAgo(iso: string | null | undefined): string {
    return timeAgoFn(iso);
  }

  get userName(): string {
    const u = localStorage.getItem('inventory_user');
    if (u) {
      try {
        return JSON.parse(u)?.name ?? 'Pengguna';
      } catch {
        /* ignore */
      }
    }
    return 'Pengguna';
  }

  load(silent = false): void {
    if (!silent) this.errorMessage = null;
    this.dataService
      .getDashboard()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (d) => {
          this.data = d;
          this.initChart(d);
          // Tandai waktu fetch — liveClock tetap berjalan sendiri (timezone device)
          this.lastUpdatedStamp = Date.now();
          // Zoneless: beri tahu Angular bahwa state berubah dari async (fetch)
          this.cdr.markForCheck();
        },
        error: (err: any) => {
          // 401 → sesi kedaluwarsa → bersihkan & arahkan ke login (jangan skeleton abadi)
          if (err?.status === 401) {
            localStorage.removeItem('inventory_token');
            localStorage.removeItem('inventory_user');
            this.router.navigate(['/login']);
            return;
          }
          // Refresh silent yang gagal → jangan spam toast, cukup update indicator
          if (silent) {
            this.cdr.markForCheck();
            return;
          }
          const msg = err?.message || 'Gagal memuat dashboard';
          this.errorMessage = msg;
          this.toast.error(msg);
          this.cdr.markForCheck();
        },
      });
  }

  private initChart(d: DashboardData): void {
    const host = this.el?.nativeElement as HTMLElement | undefined;
    const canvas = host?.querySelector<HTMLCanvasElement>('#chartCanvas');
    if (!canvas) return;

    // Hancurkan chart lama dulu (retry/reload) — hindari duplikat instance
    this.chart?.destroy();
    this.chart = undefined;

    // 7 hari terakhir (termasuk hari tanpa data)
    const labels: string[] = [];
    const ins: number[] = [];
    const outs: number[] = [];
    for (let i = 6; i >= 0; i--) {
      // Tanggal 7 hari terakhir dalam WIB — konsisten dengan data server (UTC)
      const dt = new Date(Date.now() - i * 86400000);
      const key = dt.toLocaleDateString('en-CA', { timeZone: WIB_TZ }); // YYYY-MM-DD
      labels.push(dt.toLocaleDateString('id-ID', { timeZone: WIB_TZ, weekday: 'short' }));
      const day = d.daily.find((x) => x.day === key);
      ins.push(day?.in_qty ?? 0);
      outs.push(day?.out_qty ?? 0);
    }

    this.chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Masuk',
            data: ins,
            backgroundColor: '#f8be9e',
            borderColor: '#0a0a0a',
            borderWidth: 2,
            borderRadius: 8,
            maxBarThickness: 28,
          },
          {
            label: 'Keluar',
            data: outs,
            backgroundColor: '#70d6ff',
            borderColor: '#0a0a0a',
            borderWidth: 2,
            borderRadius: 8,
            maxBarThickness: 28,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#fff',
            borderColor: '#0a0a0a',
            borderWidth: 2,
            titleColor: '#0a0a0a',
            bodyColor: '#0a0a0a',
            padding: 12,
            cornerRadius: 10,
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { weight: 'bold', size: 11 } } },
          y: {
            grid: { color: 'rgba(0,0,0,.06)' },
            ticks: { font: { size: 11 } },
            border: { display: false },
          },
        },
      },
    });
  }

  goProducts(status?: 'low'): void {
    this.router.navigate(['/products'], { queryParams: status ? { status } : {} });
  }

  goTransactions(): void {
    this.router.navigate(['/transactions']);
  }
}
