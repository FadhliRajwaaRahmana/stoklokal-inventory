// shared/directives/motion-reveal.directive.ts — stagger reveal pakai Motion (framer-motion style)
// Penggunaan: <div motionReveal motionStagger="0.06"> — semua child .reveal-item di-stagger
import { Directive, ElementRef, Input, OnDestroy, OnInit, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { animate, stagger } from 'motion';

@Directive({
  selector: '[motionReveal]',
  standalone: true,
})
export class MotionRevealDirective implements OnInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private raf = 0;

  @Input() motionStagger = 0.06;
  @Input() motionStartY = 28;

  constructor(private el: ElementRef<HTMLElement>) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const targets = Array.from(
      this.el.nativeElement.querySelectorAll<HTMLElement>('.reveal-item')
    );
    if (!targets.length) {
      targets.push(this.el.nativeElement);
    }

    // Tunggu layout selesai, lalu stagger masuk
    this.raf = requestAnimationFrame(() => {
      (animate as any)(
        targets,
        { opacity: [0, 1], y: [this.motionStartY, 0] },
        {
          delay: stagger(this.motionStagger),
          duration: 0.6,
          easing: [0.22, 1, 0.36, 1],
        }
      );
    });
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.raf);
  }
}
