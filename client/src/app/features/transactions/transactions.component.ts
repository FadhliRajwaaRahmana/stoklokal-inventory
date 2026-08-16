// features/transactions/transactions.component.ts — riwayat transaksi + catat transaksi
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../core/services/data.service';
import { ToastService } from '../../core/services/toast.service';
import { Product, Transaction } from '../../core/models';
import { formatDateTime } from '../../core/utils';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { KawaiiSelectComponent } from '../../shared/components/kawaii-select/kawaii-select.component';
import { GsapRevealDirective } from '../../shared/directives/gsap-reveal.directive';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [
    CommonModule, FormsModule, IconComponent, ModalComponent, EmptyStateComponent,
    SkeletonComponent, PageHeaderComponent, KawaiiSelectComponent, GsapRevealDirective,
  ],
  template: `
    <app-page-header
      title="Transaksi"
      subtitle="Catat pergerakan stok dan lihat riwayat lengkap"
      actionLabel="Catat Transaksi"
      actionIcon="plus"
      [showAction]="true"
      (action)="openModal()"
    />

    <!-- Filter tipe -->
    <div class="filter-row" gsapReveal [gsapRevealY]="24">
      <button class="chip" [class.chip--active]="typeFilter === ''" (click)="setType('')">Semua</button>
      <button class="chip chip--in" [class.chip--active]="typeFilter === 'in'" (click)="setType('in')">↓ Masuk</button>
      <button class="chip chip--out" [class.chip--active]="typeFilter === 'out'" (click)="setType('out')">↑ Keluar</button>
    </div>

    <!-- Tabel riwayat -->
    <div class="card table-card" gsapReveal [gsapRevealDelay]="0.08">
      <div class="table-wrap" data-lenis-prevent>
        <table class="table">
          <thead>
            <tr>
              <th>Waktu</th>
              <th>Produk</th>
              <th>Tipe</th>
              <th class="text-right">Jumlah</th>
              <th>Catatan</th>
            </tr>
          </thead>
          <tbody *ngIf="!loading && transactions.length; else emptyTpl">
            <tr *ngFor="let t of transactions">
              <td class="tx-time">{{ formatDateTime(t.created_at) }}</td>
              <td>
                <strong>{{ t.product_name }}</strong>
                <small class="tx-sku">{{ t.product_sku }}</small>
              </td>
              <td>
                <span class="badge" [class.badge--in]="t.type === 'in'" [class.badge--out]="t.type === 'out'">
                  {{ t.type === 'in' ? 'Masuk' : 'Keluar' }}
                </span>
              </td>
              <td class="text-right tx-qty" [class.tx-qty--in]="t.type === 'in'" [class.tx-qty--out]="t.type === 'out'">
                {{ t.type === 'in' ? '+' : '-' }}{{ t.qty }}
              </td>
              <td class="tx-note">{{ t.note || '-' }}</td>
            </tr>
          </tbody>
          <ng-template #emptyTpl>
            <tbody>
              <tr>
                <td colspan="5">
                  <div *ngIf="loading" class="loading-row">
                    <app-skeleton [height]="18" /><app-skeleton [height]="18" /><app-skeleton [height]="18" />
                  </div>
                  <app-empty-state
                    *ngIf="!loading"
                    icon="repeat"
                    title="Belum ada transaksi"
                    description="Catat transaksi stok masuk atau keluar pertama Anda."
                  >
                    <button class="btn btn-primary btn-sm" (click)="openModal()">
                      <app-icon name="plus" [size]="16" /> Catat Transaksi
                    </button>
                  </app-empty-state>
                </td>
              </tr>
            </tbody>
          </ng-template>
        </table>
      </div>

      <div class="table-foot">
        <span class="count-label">{{ transactions.length }} dari {{ total }} transaksi</span>
        <div class="pager" *ngIf="total > limit">
          <button class="icon-btn" [disabled]="offset === 0" (click)="prevPage()"><app-icon name="chevron-right" [size]="16" class="flip" /></button>
          <span class="page-ind">Hal {{ currentPage }} / {{ totalPages }}</span>
          <button class="icon-btn" [disabled]="offset + limit >= total" (click)="nextPage()"><app-icon name="chevron-right" [size]="16" /></button>
        </div>
      </div>
    </div>

    <!-- Modal catat transaksi -->
    <app-modal
      *ngIf="modalOpen"
      title="Catat Transaksi"
      (close)="closeModal()"
    >
      <form (ngSubmit)="submit()">
        <div class="type-picker">
          <button
            type="button"
            class="type-btn type-btn--in"
            [class.type-btn--selected]="txType === 'in'"
            (click)="txType = 'in'"
          >
            <app-icon name="arrow-down" [size]="20" />
            <span>Stok Masuk</span>
          </button>
          <button
            type="button"
            class="type-btn type-btn--out"
            [class.type-btn--selected]="txType === 'out'"
            (click)="txType = 'out'"
          >
            <app-icon name="arrow-up" [size]="20" />
            <span>Stok Keluar</span>
          </button>
        </div>

        <div class="field">
          <label class="field-label">Produk *</label>
          <app-kawaii-select
            [options]="productOptions"
            [value]="txProductId || null"
            placeholder="Pilih produk"
            [searchable]="true"
            searchPlaceholder="Cari produk atau SKU..."
            (valueChange)="txProductId = $event ?? 0"
          />
        </div>

        <div class="grid-2">
          <div class="field">
            <label class="field-label">Jumlah *</label>
            <input class="input" type="number" min="1" [(ngModel)]="txQty" name="qty" placeholder="1" required />
          </div>
          <div class="field">
            <label class="field-label">Catatan</label>
            <input class="input" [(ngModel)]="txNote" name="note" placeholder="cth: Restock / Penjualan" />
          </div>
        </div>

        <div class="stok-info" *ngIf="selectedProduct">
          Stok <strong>{{ selectedProduct.name }}</strong> saat ini:
          <span class="stok-info-val">{{ selectedProduct.stock }}</span>
          <span *ngIf="txType === 'out'" class="stok-info-remains">
            → sisa <strong>{{ Math.max(0, selectedProduct.stock - (txQty || 0)) }}</strong>
          </span>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" (click)="closeModal()">Batal</button>
          <button type="submit" class="btn" [class.btn-success]="txType === 'in'" [class.btn-secondary]="txType === 'out'" [disabled]="saving">
            {{ saving ? 'Menyimpan...' : 'Simpan Transaksi' }}
          </button>
        </div>
      </form>
    </app-modal>
  `,
  styles: [`
    :host { display: block; }
    .card { background: #fff; border: 3px solid #0a0a0a; border-radius: 24px; box-shadow: 4px 4px 0 #0a0a0a; }
    .filter-row { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
    .chip {
      padding: 9px 18px; border-radius: 9999px; border: 2px solid #0a0a0a; font-weight: 800;
      font-size: .82rem; background: #fff; transition: transform .15s, box-shadow .15s;
    }
    .chip:hover { transform: translateY(-2px); box-shadow: 2px 2px 0 #0a0a0a; }
    .chip--active { background: #f8be9e; box-shadow: 3px 3px 0 #0a0a0a; }
    .chip--in.chip--active { background: #bcffbe; }
    .chip--out.chip--active { background: #70d6ff; }

    .table-card { padding: 0; overflow: clip; }
    @media (max-width: 640px) { .table-card { overflow: visible; } }
    .tx-time { color: #777; font-size: .8rem; white-space: nowrap; }
    .tx-sku { display: block; color: #999; font-size: .7rem; }
    .badge { display: inline-flex; padding: 4px 10px; border-radius: 9999px; font-size: .72rem; font-weight: 800; border: 2px solid #0a0a0a; }
    .badge--in { background: #bcffbe; }
    .badge--out { background: #70d6ff; }
    .tx-qty { font-family: 'Nunito', sans-serif; font-weight: 900; }
    .tx-qty--in { color: #2e7d32; }
    .tx-qty--out { color: #c62828; }
    .tx-note { color: #555; font-size: .84rem; max-width: 220px; }

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

    .type-picker { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 18px; }
    .type-btn {
      display: flex; align-items: center; justify-content: center; gap: 8px; padding: 14px;
      border-radius: 16px; border: 3px solid #0a0a0a; font-weight: 800; font-family: 'Nunito', sans-serif;
      transition: transform .2s cubic-bezier(.34,1.56,.64,1), box-shadow .2s;
    }
    .type-btn--in { background: #fff; }
    .type-btn--out { background: #fff; }
    .type-btn--selected.type-btn--in { background: #bcffbe; box-shadow: 3px 3px 0 #0a0a0a; }
    .type-btn--selected.type-btn--out { background: #70d6ff; box-shadow: 3px 3px 0 #0a0a0a; }
    .type-btn:hover { transform: translateY(-2px); }

    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    @media (max-width: 560px) { .grid-2 { grid-template-columns: 1fr; } }
    .stok-info {
      padding: 12px 14px; border-radius: 14px; background: #fff7ef; border: 2px dashed #0a0a0a;
      font-size: .85rem; color: #333; margin-bottom: 16px;
    }
    .stok-info-val { font-weight: 900; font-family: 'Nunito', sans-serif; font-size: 1.05rem; }
    .stok-info-remains { color: #555; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; }
  `],
})
export class TransactionsComponent implements OnDestroy {
  private dataService = inject(DataService);
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  transactions: Transaction[] = [];
  products: Product[] = [];
  total = 0;
  loading = true;

  typeFilter = '';
  limit = 50;
  offset = 0;

  modalOpen = false;
  txType: 'in' | 'out' = 'in';
  txProductId: number | 0 = 0;

  // Opsi dropdown produk (dengan info stok di label)
  get productOptions() {
    return this.products.map((p) => ({
      value: p.id,
      label: `${p.name} (${p.sku}) — stok ${p.stock}`,
      icon: 'box' as const,
    }));
  }
  txQty = 1;
  txNote = '';
  saving = false;

  readonly Math = Math;

  constructor() {
    this.load();
    this.loadProducts();
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.limit));
  }

  get currentPage(): number {
    return Math.floor(this.offset / this.limit) + 1;
  }

  get selectedProduct(): Product | undefined {
    return this.products.find((p) => p.id === this.txProductId);
  }

  private load(): void {
    this.loading = true;
    this.dataService
      .getTransactions({ type: this.typeFilter || undefined, limit: this.limit, offset: this.offset })
      .subscribe({
        next: (res) => {
          this.transactions = res.rows;
          this.total = res.total;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.loading = false;
          this.toast.error(err.message || 'Gagal memuat transaksi');
          this.cdr.markForCheck();
        },
      });
  }

  private loadProducts(): void {
    this.dataService.getProducts({ limit: 500 }).subscribe({
      next: (res) => {
        this.products = res.rows;
        this.cdr.markForCheck();
      },
      error: () => this.toast.error('Gagal memuat daftar produk'),
    });
  }

  formatDateTime(iso: string) {
    return formatDateTime(iso);
  }

  setType(t: string): void {
    this.typeFilter = t;
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

  openModal(): void {
    this.txType = 'in';
    this.txProductId = 0;
    this.txQty = 1;
    this.txNote = '';
    this.modalOpen = true;
  }

  closeModal(): void {
    this.modalOpen = false;
  }

  submit(): void {
    if (this.saving) return;
    if (!this.txProductId) {
      this.toast.error('Pilih produk terlebih dahulu');
      return;
    }
    if (!this.txQty || this.txQty <= 0) {
      this.toast.error('Jumlah harus lebih dari 0');
      return;
    }
    const product = this.selectedProduct;
    if (this.txType === 'out' && product && this.txQty > product.stock) {
      this.toast.error(`Stok tidak cukup (tersisa ${product.stock})`);
      return;
    }
    this.saving = true;
    this.dataService
      .createTransaction({ product_id: this.txProductId, type: this.txType, qty: this.txQty, note: this.txNote })
      .subscribe({
        next: (res) => {
          this.saving = false;
          this.closeModal();
          this.toast.success(
            `${this.txType === 'in' ? 'Stok masuk' : 'Stok keluar'} ${this.txQty} × ${res.product.name}`
          );
          this.load();
          this.loadProducts();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.saving = false;
          this.toast.error(err.message || 'Gagal menyimpan transaksi');
        },
      });
  }

  ngOnDestroy(): void {
    /* cleanup otomatis RxJS */
  }
}
