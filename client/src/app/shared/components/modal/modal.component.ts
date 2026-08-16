// shared/components/modal/modal.component.ts — modal dialog dengan animasi buka/tutup
import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, Output } from '@angular/core';
import { animate } from 'motion';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="modal-backdrop" (click)="onBackdrop($event)">
      <div class="modal-card" [style.maxWidth.px]="maxWidth">
        <div class="modal-head" *ngIf="title || showClose">
          <h3 class="modal-title">{{ title }}</h3>
          <button class="modal-close" (click)="close.emit()" aria-label="Tutup">
            <app-icon name="close" [size]="18" />
          </button>
        </div>
        <div class="modal-body">
          <ng-content></ng-content>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed; inset: 0; z-index: 100; background: rgba(10,10,10,.45);
      backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center;
      padding: 20px;
    }
    .modal-card {
      background: #fff; border: 3px solid #0a0a0a; border-radius: 32px;
      box-shadow: 0 20px 50px rgba(0,0,0,.15); padding: 28px; width: 100%;
      max-height: 90vh; overflow-y: auto;
    }
    .modal-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 20px; }
    .modal-title { font-size: 1.3rem; font-weight: 800; margin: 0; }
    .modal-close {
      width: 36px; height: 36px; border-radius: 12px; border: 2px solid #0a0a0a;
      display: grid; place-items: center; background: #fff;
      transition: transform .15s, background .15s;
    }
    .modal-close:hover { background: #ff7096; color: #fff; transform: rotate(90deg); }
  `],
})
export class ModalComponent {
  @Input() title = '';
  @Input() showClose = true;
  @Input() maxWidth = 520;
  @Output() close = new EventEmitter<void>();

  private entered = false;

  ngAfterViewInit(): void {
    if (this.entered) return;
    this.entered = true;
    const host = this.el?.nativeElement as HTMLElement | undefined;
    const backdrop = host?.querySelector('.modal-backdrop');
    const card = host?.querySelector('.modal-card');
    if (!backdrop || !card) return;

    animate(backdrop as HTMLElement, { opacity: [0, 1] }, { duration: 0.25 } as any);
    animate(card as HTMLElement, { opacity: [0, 1], y: [28, 0], scale: [0.96, 1] }, {
      duration: 0.45,
      easing: [0.34, 1.56, 0.64, 1],
    } as any);
  }

  constructor(private el: ElementRef<HTMLElement>) {}

  onBackdrop(e: MouseEvent): void {
    if (e.target === e.currentTarget) this.close.emit();
  }
}
