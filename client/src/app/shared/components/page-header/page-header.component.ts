// shared/components/page-header/page-header.component.ts — header halaman + tombol aksi
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="page-header">
      <div class="ph-left">
        <h1 class="ph-title">{{ title }}</h1>
        <p class="ph-sub" *ngIf="subtitle">{{ subtitle }}</p>
      </div>
      <div class="ph-actions" *ngIf="showAction">
        <button class="btn btn-primary btn-sm" (click)="action.emit()">
          <app-icon [name]="actionIcon" [size]="16" />
          {{ actionLabel }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .page-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 26px; }
    .ph-title { font-size: clamp(1.5rem, 3vw, 2rem); font-weight: 900; margin: 0; }
    .ph-sub { color: #555; margin: 4px 0 0; font-size: .92rem; }
  `],
})
export class PageHeaderComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() actionLabel = '';
  @Input() actionIcon = 'plus';
  @Input() showAction = false;
  @Output() action = new EventEmitter<void>();
}
