// features/products/products.component.ts — daftar produk: search, filter, sort, CRUD
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, inject, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { DataService } from '../../core/services/data.service';
import { ToastService } from '../../core/services/toast.service';
import { Category, Product, stockStatus } from '../../core/models';
import { formatRupiah } from '../../core/utils';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { StockBadgeComponent } from '../../shared/components/stock-badge/stock-badge.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { KawaiiSelectComponent } from '../../shared/components/kawaii-select/kawaii-select.component';
import { GsapRevealDirective } from '../../shared/directives/gsap-reveal.directive';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule, IconComponent, ModalComponent, StockBadgeComponent,
    EmptyStateComponent, SkeletonComponent, PageHeaderComponent, KawaiiSelectComponent, GsapRevealDirective,
  ],
  template: `
    <app-page-header
      title="Produk"
      subtitle="Kelola katalog produk dan stok Anda"
      actionLabel="Tambah Produk"
      actionIcon="plus"
      [showAction]="true"
      (action)="openModal()"
    />

    <!-- Toolbar: search + filter -->
    <div class="toolbar card" gsapReveal [gsapRevealY]="24">
      <div class="search-box">
        <app-icon name="search" [size]="18" />
        <input
          class="input search-input"
          type="text"
          placeholder="Cari nama produk atau SKU..."
          [ngModel]="search"
          (ngModelChange)="onSearch($event)"
        />
      </div>
      <app-kawaii-select
        class="filter-select"
        [options]="categoryOptions"
        [value]="categoryId === '' ? null : categoryId"
        placeholder="Semua Kategori"
        [searchable]="true"
        searchPlaceholder="Cari kategori..."
        (valueChange)="onCategory($event)"
      />
      <div class="filter-chips">
        <button
          class="chip"
          [class.chip--active]="status === ''"
          (click)="setStatus('')"
        >Semua</button>
        <button
          class="chip chip--ok"
          [class.chip--active]="status === 'ok'"
          (click)="setStatus('ok')"
        >Aman</button>
        <button
          class="chip chip--low"
          [class.chip--active]="status === 'low'"
          (click)="setStatus('low')"
        >Menipis</button>
        <button
          class="chip chip--out"
          [class.chip--active]="status === 'out'"
          (click)="setStatus('out')"
        >Habis</button>
      </div>
    </div>

    <!-- Tabel produk -->
    <div class="card table-card" gsapReveal [gsapRevealDelay]="0.08">
      <div class="table-wrap" data-lenis-prevent>
        <table class="table">
          <thead>
            <tr>
              <th>Produk</th>
              <th class="sortable" (click)="toggleSort('name')">
                Nama <span class="sort-caret">{{ sortCaret('name') }}</span>
              </th>
              <th>Kategori</th>
              <th class="sortable text-right" (click)="toggleSort('price')">
                Harga <span class="sort-caret">{{ sortCaret('price') }}</span>
              </th>
              <th class="sortable text-right" (click)="toggleSort('stock')">
                Stok <span class="sort-caret">{{ sortCaret('stock') }}</span>
              </th>
              <th>Status</th>
              <th class="text-right">Aksi</th>
            </tr>
          </thead>
          <tbody *ngIf="!loading && products.length; else emptyTpl">
            <tr *ngFor="let p of products; let i = index" [class.row-low]="stockStatus(p) === 'low'" [class.row-out]="stockStatus(p) === 'out'">
              <td class="prod-cell">
                <span class="prod-avatar" [style.background]="avatarColor(i)">{{ p.name.charAt(0).toUpperCase() }}</span>
              </td>
              <td>
                <strong>{{ p.name }}</strong>
                <small class="prod-sku">{{ p.sku }}</small>
              </td>
              <td><span class="cat-chip">{{ p.category_name ?? '-' }}</span></td>
              <td class="text-right price-cell">{{ formatRupiah(p.price) }}</td>
              <td class="text-right stock-cell">{{ p.stock }}</td>
              <td><app-stock-badge [status]="stockStatus(p)" [stock]="p.stock" [minStock]="p.min_stock" /></td>
              <td class="text-right actions-cell">
                <button class="icon-btn icon-btn--in" (click)="quickInOut(p, 'in')" title="Stok masuk">
                  <app-icon name="arrow-down" [size]="16" />
                </button>
                <button class="icon-btn icon-btn--out" (click)="quickInOut(p, 'out')" title="Stok keluar">
                  <app-icon name="arrow-up" [size]="16" />
                </button>
                <button class="icon-btn" (click)="editProduct(p)" title="Edit">
                  <app-icon name="edit" [size]="16" />
                </button>
                <button class="icon-btn icon-btn--danger" (click)="deleteProduct(p)" title="Hapus">
                  <app-icon name="trash" [size]="16" />
                </button>
              </td>
            </tr>
          </tbody>
          <ng-template #emptyTpl>
            <tbody>
              <tr>
                <td colspan="7">
                  <div *ngIf="loading" class="loading-row">
                    <app-skeleton [height]="18" /><app-skeleton [height]="18" /><app-skeleton [height]="18" /><app-skeleton [height]="18" />
                  </div>
                  <app-empty-state
                    *ngIf="!loading"
                    icon="package"
                    title="Produk tidak ditemukan"
                    description="Coba ubah kata kunci pencarian atau tambahkan produk baru."
                  >
                    <button class="btn btn-primary btn-sm" (click)="openModal()">
                      <app-icon name="plus" [size]="16" /> Tambah Produk
                    </button>
                  </app-empty-state>
                </td>
              </tr>
            </tbody>
          </ng-template>
        </table>
      </div>

      <div class="table-foot">
        <span class="count-label">{{ products.length }} dari {{ total }} produk</span>
        <div class="pager" *ngIf="total > limit">
          <button class="icon-btn" [disabled]="offset === 0" (click)="prevPage()"><app-icon name="chevron-right" [size]="16" class="flip" /></button>
          <span class="page-ind">Hal {{ currentPage }} / {{ totalPages }}</span>
          <button class="icon-btn" [disabled]="offset + limit >= total" (click)="nextPage()"><app-icon name="chevron-right" [size]="16" /></button>
        </div>
      </div>
    </div>

    <!-- Modal form produk -->
    <app-modal
      *ngIf="modalOpen"
      [title]="editing ? 'Edit Produk' : 'Tambah Produk'"
      (close)="closeModal()"
    >
      <form (ngSubmit)="saveProduct()">
        <div class="field">
          <label class="field-label">Nama Produk *</label>
          <input class="input" [(ngModel)]="form.name" name="name" placeholder="cth: Headphone Bluetooth" required />
        </div>
        <div class="grid-2">
          <div class="field">
            <label class="field-label">SKU *</label>
            <input class="input" [(ngModel)]="form.sku" name="sku" placeholder="cth: ELEK-001" required />
          </div>
          <div class="field">
            <label class="field-label">Kategori *</label>
            <app-kawaii-select
              [options]="formCategoryOptions"
              [value]="form.category_id || null"
              placeholder="Pilih kategori"
              [searchable]="true"
              searchPlaceholder="Cari kategori..."
              [error]="formError"
              (valueChange)="onFormCategoryChange($event)"
            />
          </div>
        </div>
        <div class="grid-2">
          <div class="field">
            <label class="field-label">Harga Jual</label>
            <input class="input" type="number" min="0" [(ngModel)]="form.price" name="price" placeholder="0" />
          </div>
          <div class="field">
            <label class="field-label">Harga Modal</label>
            <input class="input" type="number" min="0" [(ngModel)]="form.cost" name="cost" placeholder="0" />
          </div>
        </div>
        <div class="grid-2">
          <div class="field">
            <label class="field-label">Stok Awal</label>
            <input class="input" type="number" min="0" [(ngModel)]="form.stock" name="stock" placeholder="0" />
          </div>
          <div class="field">
            <label class="field-label">Min. Stok</label>
            <input class="input" type="number" min="0" [(ngModel)]="form.min_stock" name="min_stock" placeholder="5" />
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" (click)="closeModal()">Batal</button>
          <button type="submit" class="btn btn-primary" [disabled]="saving">
            {{ saving ? 'Menyimpan...' : (editing ? 'Simpan Perubahan' : 'Tambah Produk') }}
          </button>
        </div>
      </form>
    </app-modal>

    <!-- Modal quick in/out -->
    <app-modal
      *ngIf="qtyModal"
      [title]="qtyType === 'in' ? 'Stok Masuk' : 'Stok Keluar'"
      (close)="qtyModal = false"
    >
      <p class="qty-info">
        <app-icon [name]="qtyType === 'in' ? 'arrow-down' : 'arrow-up'" [size]="16" />
        {{ qtyType === 'in' ? 'Tambah stok' : 'Kurangi stok' }}
        <strong>{{ qtyProduct?.name }}</strong> (stok saat ini: <strong>{{ qtyProduct?.stock }}</strong>)
      </p>
      <div class="field">
        <label class="field-label">Jumlah *</label>
        <input class="input" type="number" min="1" [(ngModel)]="qtyValue" name="qty" placeholder="1" />
      </div>
      <div class="field">
        <label class="field-label">Catatan</label>
        <input class="input" [(ngModel)]="qtyNote" name="note" placeholder="cth: Restock supplier / Penjualan online" />
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" (click)="qtyModal = false">Batal</button>
        <button
          class="btn"
          [class.btn-success]="qtyType === 'in'"
          [class.btn-secondary]="qtyType === 'out'"
          (click)="confirmQty()"
        >Konfirmasi</button>
      </div>
    </app-modal>
  `,
  styles: [`
    :host { display: block; }
    .card { background: #fff; border: 3px solid #0a0a0a; border-radius: 24px; box-shadow: 4px 4px 0 #0a0a0a; }
    /* Toolbar WAJIB overflow:visible — dropdown kawaii-select posisi absolute
       keluar dari toolbar; overflow:hidden/clip memotongnya (menu hanya search
       box yang terlihat, item hilang). */
    .toolbar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; padding: 16px; margin-bottom: 16px; overflow: visible; }
    .search-box { position: relative; flex: 1; min-width: 200px; display: flex; align-items: center; }
    .search-box app-icon { position: absolute; left: 14px; color: #888; pointer-events: none; }
    .search-input { padding-left: 42px; }
    .filter-select { width: auto; min-width: 160px; }
    @media (max-width: 640px) {
      .toolbar { flex-direction: column; align-items: stretch; min-width: 0; }
      .search-box { min-width: 0; width: 100%; }
      .filter-select { width: 100%; min-width: 0; }
      .filter-chips { flex-wrap: wrap; overflow: hidden; padding-bottom: 0; }
      .chip { white-space: nowrap; }
    }
    .filter-chips { display: flex; gap: 8px; flex-wrap: wrap; }
    .chip {
      padding: 8px 16px; border-radius: 9999px; border: 2px solid #0a0a0a; font-weight: 800;
      font-size: .8rem; background: #fff; transition: transform .15s, box-shadow .15s;
    }
    .chip:hover { transform: translateY(-2px); box-shadow: 2px 2px 0 #0a0a0a; }
    .chip--active { background: #f8be9e; box-shadow: 3px 3px 0 #0a0a0a; }
    .chip--low.chip--active { background: #ffd670; }
    .chip--out.chip--active { background: #ff7096; color: #fff; }

    .table-card { padding: 0; overflow: clip; }
    @media (max-width: 640px) {
      .table-card { overflow: visible; }
    }
    .prod-cell { width: 46px; }
    .prod-avatar {
      width: 40px; height: 40px; border-radius: 14px; border: 2px solid #0a0a0a;
      display: grid; place-items: center; font-family: 'Nunito', sans-serif; font-weight: 900; font-size: 1rem;
    }
    .prod-sku { display: block; color: #999; font-size: .7rem; }
    .cat-chip {
      display: inline-block; padding: 4px 10px; border-radius: 9999px; background: #fff1e6;
      border: 2px solid #0a0a0a; font-size: .72rem; font-weight: 700;
    }
    .price-cell, .stock-cell { font-weight: 700; }
    .sortable { cursor: pointer; user-select: none; }
    .sortable:hover { color: #e07a5f; }
    .sort-caret { font-size: .65rem; }
    .actions-cell { white-space: nowrap; }
    .icon-btn {
      width: 34px; height: 34px; border-radius: 10px; border: 2px solid #0a0a0a; background: #fff;
      display: inline-grid; place-items: center; margin-left: 4px; transition: transform .15s, background .15s;
    }
    .icon-btn:hover { transform: translateY(-2px) rotate(-4deg); background: #fff7ef; }
    .icon-btn--in:hover { background: #bcffbe; }
    .icon-btn--out:hover { background: #70d6ff; }
    .icon-btn--danger:hover { background: #ff7096; color: #fff; }
    .icon-btn:disabled { opacity: .4; cursor: not-allowed; transform: none; }
    .flip { transform: rotate(180deg); }
    .row-low td { background: rgba(255, 214, 112, .12); }
    .row-out td { background: rgba(255, 112, 150, .1); }

    .table-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 20px; border-top: 3px solid #0a0a0a; }
    .count-label { font-size: .8rem; font-weight: 700; color: #888; }
    .pager { display: flex; align-items: center; gap: 10px; }
    .page-ind { font-size: .8rem; font-weight: 700; }

    .loading-row { display: flex; flex-direction: column; gap: 12px; padding: 20px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    @media (max-width: 560px) { .grid-2 { grid-template-columns: 1fr; } }
    .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; }
    .qty-info { font-size: .95rem; margin-bottom: 14px; color: #333; display: flex; align-items: center; gap: 6px; }
    .qty-info strong { color: #0a0a0a; }
  `],
})
export class ProductsComponent implements OnDestroy {
  private dataService = inject(DataService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  categories: Category[] = [];
  products: Product[] = [];
  total = 0;
  loading = true;

  search = '';
  categoryId: number | '' = '';
  status = '';
  sort = 'name';
  order: 'asc' | 'desc' = 'asc';
  limit = 50;
  offset = 0;

  modalOpen = false;
  editing: Product | null = null;
  saving = false;
  form: Partial<Product> = {};
  formError = false; // validasi kategori di form

  // Opsi dropdown kategori untuk toolbar filter (nilai campuran string/number)
  get categoryOptions(): { value: string | number; label: string; icon?: string }[] {
    return [
      { value: '', label: 'Semua Kategori', icon: 'tag' },
      ...this.categories.map((c) => ({ value: c.id, label: c.name, icon: 'tag' })),
    ];
  }

  // Opsi dropdown kategori untuk form modal
  get formCategoryOptions() {
    return this.categories.map((c) => ({ value: c.id, label: c.name, icon: 'tag' as const }));
  }

  onFormCategoryChange(v: number | null): void {
    this.form.category_id = v ?? undefined;
    this.formError = false;
  }

  qtyModal = false;
  qtyType: 'in' | 'out' = 'in';
  qtyProduct: Product | null = null;
  qtyValue = 1;
  qtyNote = '';

  private searchSub = new Subject<string>();
  private subs: Subscription[] = [];

  constructor() {
    this.route.queryParams.subscribe((q) => {
      if (q['status']) this.status = q['status'];
    });
    this.loadCategories();
    this.load();

    this.subs.push(
      this.searchSub.pipe(debounceTime(350), distinctUntilChanged()).subscribe(() => {
        this.offset = 0;
        this.load();
      })
    );
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.limit));
  }

  get currentPage(): number {
    return Math.floor(this.offset / this.limit) + 1;
  }

  private loadCategories(): void {
    this.dataService.getCategories().subscribe({
      next: (c) => {
        this.categories = c;
        this.cdr.markForCheck();
      },
      error: () => {
        this.toast.error('Gagal memuat kategori');
        this.cdr.markForCheck();
      },
    });
  }

  private load(): void {
    this.loading = true;
    this.dataService
      .getProducts({
        search: this.search,
        category_id: this.categoryId === '' ? undefined : this.categoryId,
        status: this.status || undefined,
        sort: this.sort,
        order: this.order,
        limit: this.limit,
        offset: this.offset,
      })
      .subscribe({
        next: (res) => {
          this.products = res.rows;
          this.total = res.total;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.loading = false;
          this.toast.error(err.message || 'Gagal memuat produk');
          this.cdr.markForCheck();
        },
      });
  }

  stockStatus(p: Product) {
    return stockStatus(p);
  }

  formatRupiah(n: number) {
    return formatRupiah(n);
  }

  onSearch(v: string): void {
    this.search = v;
    this.searchSub.next(v);
  }

  onCategory(v: number | string | null): void {
    // dari kawaii-select: '' (Semua) → categoryId '' ; number → id ; null → reset
    this.categoryId = v === null ? '' : (v as number | '');
    this.offset = 0;
    this.load();
  }

  setStatus(s: string): void {
    this.status = s;
    this.offset = 0;
    this.load();
  }

  toggleSort(col: string): void {
    if (this.sort === col) {
      this.order = this.order === 'asc' ? 'desc' : 'asc';
    } else {
      this.sort = col;
      this.order = 'asc';
    }
    this.load();
  }

  sortCaret(col: string): string {
    if (this.sort !== col) return '↕';
    return this.order === 'asc' ? '↑' : '↓';
  }

  prevPage(): void {
    this.offset = Math.max(0, this.offset - this.limit);
    this.load();
  }

  nextPage(): void {
    this.offset += this.limit;
    this.load();
  }

  avatarColor(i: number): string {
    const colors = ['#f8be9e', '#70d6ff', '#ffd670', '#bcffbe', '#d8b4fe', '#ffb3c6'];
    return colors[i % colors.length];
  }

  // ----- CRUD -----
  openModal(): void {
    this.editing = null;
    this.form = { name: '', sku: '', category_id: 0, price: 0, cost: 0, stock: 0, min_stock: 5 };
    this.modalOpen = true;
  }

  editProduct(p: Product): void {
    this.editing = p;
    this.form = {
      name: p.name,
      sku: p.sku,
      category_id: p.category_id,
      price: p.price,
      cost: p.cost,
      stock: p.stock,
      min_stock: p.min_stock,
      image: p.image,
    };
    this.modalOpen = true;
  }

  closeModal(): void {
    this.modalOpen = false;
    this.editing = null;
  }

  saveProduct(): void {
    if (this.saving) return;
    if (!this.form.name?.trim() || !this.form.sku?.trim()) {
      this.toast.error('Nama dan SKU wajib diisi');
      return;
    }
    if (!this.form.category_id) {
      this.toast.error('Pilih kategori produk');
      return;
    }
    this.saving = true;
    const body = {
      name: this.form.name.trim(),
      sku: this.form.sku.trim().toUpperCase(),
      category_id: Number(this.form.category_id),
      price: Number(this.form.price) || 0,
      cost: Number(this.form.cost) || 0,
      stock: Number(this.form.stock) || 0,
      min_stock: Number(this.form.min_stock) || 5,
      image: this.form.image ?? '',
    };
    const req = this.editing
      ? this.dataService.updateProduct(this.editing.id, body)
      : this.dataService.createProduct(body);
    req.subscribe({
      next: () => {
        this.saving = false;
        this.closeModal();
        this.toast.success(this.editing ? 'Produk berhasil diperbarui' : 'Produk berhasil ditambahkan');
        this.load();
      },
      error: (err) => {
        this.saving = false;
        this.toast.error(err.message || 'Gagal menyimpan produk');
      },
    });
  }

  deleteProduct(p: Product): void {
    const ok = confirm(`Hapus produk "${p.name}"? Riwayat transaksinya juga akan dihapus.`);
    if (!ok) return;
    this.dataService.deleteProduct(p.id).subscribe({
      next: () => {
        this.toast.success(`"${p.name}" dihapus`);
        this.load();
      },
      error: (err) => this.toast.error(err.message || 'Gagal menghapus produk'),
    });
  }

  // ----- Quick in/out -----
  quickInOut(p: Product, type: 'in' | 'out'): void {
    this.qtyProduct = p;
    this.qtyType = type;
    this.qtyValue = 1;
    this.qtyNote = type === 'in' ? 'Restock' : 'Penjualan';
    this.qtyModal = true;
  }

  confirmQty(): void {
    if (!this.qtyProduct || !this.qtyValue || this.qtyValue <= 0) {
      this.toast.error('Jumlah harus lebih dari 0');
      return;
    }
    if (this.qtyType === 'out' && this.qtyValue > this.qtyProduct.stock) {
      this.toast.error(`Stok tidak cukup (tersisa ${this.qtyProduct.stock})`);
      return;
    }
    this.dataService
      .createTransaction({
        product_id: this.qtyProduct.id,
        type: this.qtyType,
        qty: this.qtyValue,
        note: this.qtyNote,
      })
      .subscribe({
        next: (res) => {
          this.toast.success(
            `${this.qtyType === 'in' ? 'Stok masuk' : 'Stok keluar'} ${this.qtyValue} × ${res.product.name}`
          );
          this.qtyModal = false;
          this.load();
        },
        error: (err) => this.toast.error(err.message || 'Gagal memproses transaksi'),
      });
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }
}
