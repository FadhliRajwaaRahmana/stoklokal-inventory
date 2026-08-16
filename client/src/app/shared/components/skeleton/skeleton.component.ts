// shared/components/skeleton/skeleton.component.ts — placeholder loading
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  template: `
    <div class="skeleton-block" [style.height.px]="height" [style.width]="width" [style.borderRadius.px]="radius"></div>
  `,
  styles: [`
    .skeleton-block {
      position: relative; overflow: hidden; background: #f2ece5;
      animation: pulse 1.4s ease-in-out infinite;
    }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .55; } }
  `],
})
export class SkeletonComponent {
  @Input() height = 16;
  @Input() width = '100%';
  @Input() radius = 8;
}
