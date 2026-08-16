// shared/components/toast/toast.component.ts — render stack toast
import { CommonModule } from '@angular/common';
import { Component, ElementRef, inject } from '@angular/core';
import { animate } from 'motion';
import { ToastService } from '../../../core/services/toast.service';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="toast-stack">
      <div
        *ngFor="let t of toastService.stack | async"
        class="toast"
        [class]="'toast--' + t.type"
        (click)="toastService.dismiss(t.id)"
      >
        <app-icon [name]="t.type === 'success' ? 'check' : t.type === 'error' ? 'warning' : 'sparkle'" [size]="18" />
        <span>{{ t.message }}</span>
      </div>
    </div>
  `,
  styles: [`
    .toast-stack {
      position: fixed; top: 20px; right: 20px; z-index: 200;
      display: flex; flex-direction: column; gap: 10px;
      max-width: min(380px, calc(100vw - 40px));
    }
    .toast {
      display: flex; align-items: center; gap: 10px; padding: 13px 18px;
      border: 3px solid #0a0a0a; border-radius: 16px; background: #fff;
      box-shadow: 4px 4px 0 #0a0a0a; font-weight: 600; font-size: .88rem;
      cursor: pointer;
    }
    .toast--success { background: #bcffbe; }
    .toast--error { background: #ff7096; color: #fff; }
    .toast--info { background: #70d6ff; }
    .toast--warning { background: #ffd670; }
  `],
})
export class ToastComponent {
  toastService = inject(ToastService);

  ngAfterViewInit(): void {
    // Animasi masuk per toast baru — dipantau via subscription
    this.toastService.stack.subscribe((toasts) => {
      // Cari elemen toast terakhir yang baru muncul
      requestAnimationFrame(() => {
        const els = this.container?.querySelectorAll('.toast');
        const last = els && els.length ? els[els.length - 1] : null;
        if (last && !(last as HTMLElement).dataset['animated']) {
          (last as HTMLElement).dataset['animated'] = 'true';
          animate(last as HTMLElement, { x: [120, 0], opacity: [0, 1] }, {
            duration: 0.45,
            easing: [0.34, 1.56, 0.64, 1],
          } as any);
        }
      });
    });
  }

  private get container(): HTMLElement | null {
    return this.el?.nativeElement?.querySelector('.toast-stack') ?? null;
  }

  constructor(private el: ElementRef<HTMLElement>) {}
}
