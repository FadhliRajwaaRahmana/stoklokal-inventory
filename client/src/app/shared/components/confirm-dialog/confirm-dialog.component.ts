// shared/components/confirm-dialog/confirm-dialog.component.ts
// Pop-up konfirmasi kawaii — menggantikan window.confirm() yang jelek.
// Fitur: ikon animasi, backdrop blur, pop/bounce, responsive mobile, promise-based.
import { CommonModule } from '@angular/common';
import {
  ApplicationRef,
  ChangeDetectorRef,
  Component,
  ComponentRef,
  createComponent,
  EnvironmentInjector,
  inject,
  Injectable,
  Input,
} from '@angular/core';
import { animate } from 'motion';
import { IconComponent } from '../icon/icon.component';

// ───────── Tipe & konfigurasi ─────────
export interface ConfirmDialogConfig {
  /** Judul dialog — "Hapus Produk?" */
  title?: string;
  /** Pesan tambahan di bawah judul */
  message: string;
  /** Label tombol konfirmasi (default: "Hapus") */
  confirmLabel?: string;
  /** Label tombol batal (default: "Batal") */
  cancelLabel?: string;
  /** Tone: "danger" (merah) | "warning" (kuning) | "info" (biru) */
  tone?: 'danger' | 'warning' | 'info';
  /** Nama ikon dari icon component (default sesuai tone) */
  icon?: string;
}

// ───────── Component ─────────
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="cd-backdrop" (click)="onBackdropClick($event)">
      <div class="cd-card" [class]="'cd-card cd-card--' + (config.tone || 'danger')">
        <!-- Ikon besar animasi -->
        <div class="cd-icon-wrap" [class]="'cd-icon-wrap cd-icon-wrap--' + (config.tone || 'danger')">
          <div class="cd-icon-ring">
            <app-icon [name]="iconName" [size]="32" />
          </div>
        </div>

        <!-- Teks -->
        <h3 class="cd-title">{{ config.title || 'Konfirmasi' }}</h3>
        <p class="cd-message">{{ config.message }}</p>

        <!-- Tombol -->
        <div class="cd-actions">
          <button
            class="cd-btn cd-btn--cancel"
            (click)="onCancel()"
            type="button"
          >
            {{ config.cancelLabel || 'Batal' }}
          </button>
          <button
            class="cd-btn"
            [class]="'cd-btn cd-btn--confirm cd-btn--' + (config.tone || 'danger')"
            (click)="onConfirm()"
            type="button"
          >
            <app-icon [name]="confirmIcon" [size]="16" />
            {{ config.confirmLabel || 'Hapus' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* ===== Backdrop ===== */
    .cd-backdrop {
      position: fixed; inset: 0; z-index: 10000;
      background: rgba(10, 10, 10, .5);
      backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
      display: flex; align-items: center; justify-content: center;
      padding: 20px;
      animation: cdFadeIn .2s ease-out both;
    }
    @keyframes cdFadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    /* ===== Card ===== */
    .cd-card {
      background: #fff; border: 3px solid #0a0a0a; border-radius: 28px;
      box-shadow: 0 24px 60px rgba(0,0,0,.18), 8px 8px 0 #0a0a0a;
      padding: 32px 28px 24px; width: 100%; max-width: 400px;
      text-align: center;
      animation: cdPop .4s cubic-bezier(.34, 1.56, .64, 1) both;
    }
    @keyframes cdPop {
      from { opacity: 0; transform: translateY(20px) scale(.92); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    /* ===== Icon wrap ===== */
    .cd-icon-wrap {
      display: inline-flex; align-items: center; justify-content: center;
      margin: 0 auto 18px;
    }
    .cd-icon-ring {
      width: 72px; height: 72px; border-radius: 50%; border: 3px solid #0a0a0a;
      display: grid; place-items: center;
      animation: cdShake .5s cubic-bezier(.36,.07,.19,.97) .25s both;
    }
    .cd-icon-wrap--danger .cd-icon-ring { background: #ffe0e6; color: #e53e3e; }
    .cd-icon-wrap--warning .cd-icon-ring { background: #fff3d0; color: #d69e2e; }
    .cd-icon-wrap--info .cd-icon-ring { background: #dbeafe; color: #3b82f6; }
    @keyframes cdShake {
      0%, 100% { transform: rotate(0); }
      20%  { transform: rotate(-8deg); }
      40%  { transform: rotate(8deg); }
      60%  { transform: rotate(-4deg); }
      80%  { transform: rotate(4deg); }
    }

    /* ===== Teks ===== */
    .cd-title {
      font-size: 1.25rem; font-weight: 900; margin: 0 0 8px; color: #0a0a0a;
      line-height: 1.3;
    }
    .cd-message {
      font-size: .92rem; font-weight: 600; color: #666; margin: 0 0 24px;
      line-height: 1.5;
    }

    /* ===== Tombol ===== */
    .cd-actions {
      display: flex; gap: 10px; justify-content: center;
    }
    .cd-btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      padding: 12px 24px; border-radius: 14px; border: 3px solid #0a0a0a;
      font-family: inherit; font-weight: 800; font-size: .88rem;
      cursor: pointer;
      box-shadow: 3px 3px 0 #0a0a0a;
      transition: transform .15s cubic-bezier(.34,1.56,.64,1), box-shadow .15s, background .15s;
    }
    .cd-btn:hover {
      transform: translateY(-2px);
      box-shadow: 5px 5px 0 #0a0a0a;
    }
    .cd-btn:active {
      transform: translate(1px, 1px);
      box-shadow: 1px 1px 0 #0a0a0a;
    }

    /* Cancel */
    .cd-btn--cancel {
      background: #fff; color: #0a0a0a;
    }
    .cd-btn--cancel:hover { background: #f5f1eb; }

    /* Confirm variants */
    .cd-btn--danger  { background: #ff7096; color: #fff; }
    .cd-btn--danger:hover  { background: #ff5580; }
    .cd-btn--warning { background: #ffd670; color: #0a0a0a; }
    .cd-btn--warning:hover { background: #ffc940; }
    .cd-btn--info    { background: #70d6ff; color: #0a0a0a; }
    .cd-btn--info:hover    { background: #50c8ff; }

    /* ===== Responsive ===== */
    @media (max-width: 480px) {
      .cd-card { padding: 24px 20px 20px; border-radius: 22px; max-width: 92vw; }
      .cd-icon-ring { width: 60px; height: 60px; }
      .cd-icon-ring app-icon { --icon-size: 26px; }
      .cd-title { font-size: 1.1rem; }
      .cd-message { font-size: .85rem; margin-bottom: 20px; }
      .cd-actions { flex-direction: column-reverse; }
      .cd-btn { width: 100%; justify-content: center; padding: 14px 20px; }
    }
  `],
})
export class ConfirmDialogComponent {
  config: ConfirmDialogConfig = { message: '' };

  // Resolve / reject — di-set oleh service saat membuat component
  _resolve!: (value: boolean) => void;

  get iconName(): string {
    if (this.config.icon) return this.config.icon;
    switch (this.config.tone) {
      case 'warning': return 'alert';
      case 'info': return 'info';
      default: return 'trash';
    }
  }

  get confirmIcon(): string {
    switch (this.config.tone) {
      case 'warning': return 'alert';
      case 'info': return 'check';
      default: return 'trash';
    }
  }

  onConfirm(): void {
    this._resolve(true);
  }

  onCancel(): void {
    this._resolve(false);
  }

  onBackdropClick(e: MouseEvent): void {
    if (e.target === e.currentTarget) {
      this._resolve(false);
    }
  }
}

// ───────── Service (inject di mana saja, panggil confirm()) ─────────
@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private appRef = inject(ApplicationRef);
  private injector = inject(EnvironmentInjector);

  /**
   * Tampilkan confirm dialog. Mengembalikan Promise<boolean>.
   * ```ts
   * const ok = await this.confirmDialog.confirm({
   *   title: 'Hapus Produk?',
   *   message: 'Riwayat transaksinya juga akan dihapus.',
   *   confirmLabel: 'Ya, Hapus',
   *   tone: 'danger',
   * });
   * if (!ok) return;
   * ```
   */
  confirm(config: ConfirmDialogConfig): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      // Buat component secara dinamis
      const compRef: ComponentRef<ConfirmDialogComponent> = createComponent(
        ConfirmDialogComponent,
        {
          environmentInjector: this.injector,
        }
      );

      compRef.instance.config = config;
      compRef.instance._resolve = (val: boolean) => {
        // Animasi keluar
        const host = compRef.location.nativeElement as HTMLElement;
        const backdrop = host.querySelector('.cd-backdrop') as HTMLElement | null;
        const card = host.querySelector('.cd-card') as HTMLElement | null;

        if (backdrop && card) {
          animate(card, { opacity: [1, 0], y: [0, 12], scale: [1, .95] }, {
            duration: .18,
            easing: 'ease-in',
          } as any);
          animate(backdrop, { opacity: [1, 0] }, {
            duration: .2,
            easing: 'ease-in',
          } as any).then(() => {
            this.destroy(compRef);
            resolve(val);
          });
        } else {
          this.destroy(compRef);
          resolve(val);
        }
      };

      // Attach ke DOM
      this.appRef.attachView(compRef.hostView);
      document.body.appendChild(compRef.location.nativeElement);
    });
  }

  private destroy(ref: ComponentRef<ConfirmDialogComponent>): void {
    this.appRef.detachView(ref.hostView);
    ref.destroy();
    // Hapus host element dari DOM
    ref.location.nativeElement.remove();
  }
}
