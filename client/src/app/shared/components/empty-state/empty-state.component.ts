// shared/components/empty-state/empty-state.component.ts — placeholder saat data kosong
import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="empty-state">
      <div class="empty-icon">
        <app-icon [name]="icon" [size]="36" />
      </div>
      <h3 class="empty-title">{{ title }}</h3>
      <p class="empty-desc">{{ description }}</p>
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    .empty-state { text-align: center; padding: 48px 20px; }
    .empty-icon {
      width: 88px; height: 88px; margin: 0 auto 16px; border-radius: 9999px;
      display: grid; place-items: center; background: #fff7ef; border: 3px dashed #0a0a0a;
    }
    .empty-title { font-size: 1.15rem; font-weight: 800; margin-bottom: 6px; }
    .empty-desc { color: #555; font-size: .9rem; margin-bottom: 18px; }
  `],
})
export class EmptyStateComponent {
  @Input() icon = 'inbox';
  @Input() title = 'Belum ada data';
  @Input() description = 'Data akan tampil di sini setelah Anda menambahkannya.';
}
