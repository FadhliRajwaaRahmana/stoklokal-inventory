// features/categories/categories.component.ts — CRUD kategori dengan hitungan produk
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../core/services/data.service';
import { ToastService } from '../../core/services/toast.service';
import { Category } from '../../core/models';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { ConfirmDialogService } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { GsapRevealDirective } from '../../shared/directives/gsap-reveal.directive';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [
    CommonModule, FormsModule, IconComponent, ModalComponent, EmptyStateComponent,
    SkeletonComponent, PageHeaderComponent, GsapRevealDirective,
  ],
  template: `
    <app-page-header
      title="Kategori"
      subtitle="Kelompokkan produk agar mudah dikelola"
      actionLabel="Tambah Kategori"
      actionIcon="plus"
      [showAction]="true"
      (action)="openModal()"
    />

    <div class="cat-grid" gsapReveal [gsapRevealY]="24">
      <ng-container *ngIf="loading; else listTpl">
        <div *ngFor="let _ of [1,2,3,4]" class="card cat-card">
          <app-skeleton [height]="22" [width]="'60%'" /><app-skeleton [height]="14" [width]="'80%'" />
        </div>
      </ng-container>
      <ng-template #listTpl>
        <ng-container *ngIf="categories.length; else emptyTpl">
          <div class="card cat-card" *ngFor="let c of categories; let i = index">
            <div class="cat-emoji" [style.background]="emojiColor(i)">📂</div>
            <div class="cat-info">
              <h3 class="cat-name">{{ c.name }}</h3>
              <p class="cat-desc">{{ c.description || 'Tanpa deskripsi' }}</p>
              <span class="cat-count">
                <app-icon name="box" [size]="13" />
                {{ c.product_count ?? 0 }} produk
              </span>
            </div>
            <div class="cat-actions">
              <button class="icon-btn" (click)="editCategory(c)" title="Edit">
                <app-icon name="edit" [size]="16" />
              </button>
              <button class="icon-btn icon-btn--danger" (click)="deleteCategory(c)" title="Hapus">
                <app-icon name="trash" [size]="16" />
              </button>
            </div>
          </div>
        </ng-container>
        <ng-template #emptyTpl>
          <div class="card" style="grid-column: 1 / -1;">
            <app-empty-state icon="tag" title="Belum ada kategori" description="Buat kategori pertama untuk mengelompokkan produk Anda.">
              <button class="btn btn-primary btn-sm" (click)="openModal()">
                <app-icon name="plus" [size]="16" /> Tambah Kategori
              </button>
            </app-empty-state>
          </div>
        </ng-template>
      </ng-template>
    </div>

    <!-- Modal form -->
    <app-modal
      *ngIf="modalOpen"
      [title]="editing ? 'Edit Kategori' : 'Tambah Kategori'"
      (close)="closeModal()"
    >
      <form (ngSubmit)="save()">
        <div class="field">
          <label class="field-label">Nama Kategori *</label>
          <input class="input" [(ngModel)]="form.name" name="name" placeholder="cth: Elektronik" required />
        </div>
        <div class="field">
          <label class="field-label">Deskripsi</label>
          <textarea class="textarea" [(ngModel)]="form.description" name="description" placeholder="Keterangan singkat (opsional)"></textarea>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" (click)="closeModal()">Batal</button>
          <button type="submit" class="btn btn-primary" [disabled]="saving">
            {{ saving ? 'Menyimpan...' : (editing ? 'Simpan' : 'Tambah') }}
          </button>
        </div>
      </form>
    </app-modal>
  `,
  styles: [`
    :host { display: block; }
    .cat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 18px; }
    .card { background: #fff; border: 3px solid #0a0a0a; border-radius: 24px; box-shadow: 4px 4px 0 #0a0a0a; }
    .cat-card {
      display: flex; align-items: flex-start; gap: 14px; padding: 20px;
      transition: transform .25s cubic-bezier(.34,1.56,.64,1), box-shadow .25s;
    }
    .cat-card:hover { transform: translateY(-4px) rotate(-.5deg); box-shadow: 7px 7px 0 #0a0a0a; }
    .cat-emoji {
      width: 48px; height: 48px; border-radius: 16px; border: 3px solid #0a0a0a;
      display: grid; place-items: center; font-size: 1.4rem; flex-shrink: 0;
    }
    .cat-info { flex: 1; min-width: 0; }
    .cat-name { font-size: 1.05rem; font-weight: 900; margin: 0 0 4px; }
    .cat-desc { color: #777; font-size: .82rem; margin: 0 0 8px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .cat-count {
      display: inline-flex; align-items: center; gap: 5px; font-size: .72rem; font-weight: 700;
      color: #555; background: #fff7ef; padding: 4px 10px; border-radius: 9999px; border: 2px solid #0a0a0a;
    }
    .cat-actions { display: flex; flex-direction: column; gap: 6px; }
    .icon-btn {
      width: 34px; height: 34px; border-radius: 10px; border: 2px solid #0a0a0a; background: #fff;
      display: inline-grid; place-items: center; transition: transform .15s, background .15s;
    }
    .icon-btn:hover { transform: translateY(-2px) rotate(-4deg); background: #fff7ef; }
    .icon-btn--danger:hover { background: #ff7096; color: #fff; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; }
  `],
})
export class CategoriesComponent {
  private dataService = inject(DataService);
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);
  private confirmDialog = inject(ConfirmDialogService);

  categories: Category[] = [];
  loading = true;
  modalOpen = false;
  editing: Category | null = null;
  saving = false;
  form: Partial<Category> = {};

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading = true;
    this.dataService.getCategories().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (c) => {
        this.categories = c;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        this.toast.error(err.message || 'Gagal memuat kategori');
        this.cdr.markForCheck();
      },
    });
  }

  emojiColor(i: number): string {
    const colors = ['#f8be9e', '#70d6ff', '#ffd670', '#bcffbe', '#d8b4fe', '#ffb3c6'];
    return colors[i % colors.length];
  }

  openModal(): void {
    this.editing = null;
    this.form = { name: '', description: '' };
    this.modalOpen = true;
  }

  editCategory(c: Category): void {
    this.editing = c;
    this.form = { name: c.name, description: c.description };
    this.modalOpen = true;
  }

  closeModal(): void {
    this.modalOpen = false;
    this.editing = null;
  }

  save(): void {
    if (this.saving) return;
    if (!this.form.name?.trim()) {
      this.toast.error('Nama kategori wajib diisi');
      return;
    }
    this.saving = true;
    const body = { name: this.form.name.trim(), description: this.form.description?.trim() ?? '' };
    const req = this.editing
      ? this.dataService.updateCategory(this.editing.id, body)
      : this.dataService.createCategory(body);
    req.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving = false;
        this.closeModal();
        this.toast.success(this.editing ? 'Kategori diperbarui' : 'Kategori ditambahkan');
        this.load();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.saving = false;
        this.toast.error(err.message || 'Gagal menyimpan kategori');
      },
    });
  }

  async deleteCategory(c: Category): Promise<void> {
    const used = c.product_count ?? 0;
    if (used > 0) {
      this.toast.error(`Kategori "${c.name}" masih dipakai ${used} produk. Tidak dapat dihapus.`);
      return;
    }
    const ok = await this.confirmDialog.confirm({
      title: `Hapus "${c.name}"?`,
      message: 'Kategori ini akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.',
      confirmLabel: 'Ya, Hapus',
      cancelLabel: 'Batal',
      tone: 'danger',
      icon: 'trash',
    });
    if (!ok) return;
    this.dataService.deleteCategory(c.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.toast.success(`Kategori "${c.name}" dihapus`);
        this.load();
        this.cdr.markForCheck();
      },
      error: (err) => this.toast.error(err.message || 'Gagal menghapus kategori'),
    });
  }
}
