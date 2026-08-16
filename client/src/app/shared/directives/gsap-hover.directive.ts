// shared/directives/gsap-hover.directive.ts — efek hover bouncy (spring) saat mouse masuk/keluar
import { Directive, ElementRef, Input, OnDestroy, OnInit, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import gsap from 'gsap';

@Directive({
  selector: '[gsapHover]',
  standalone: true,
})
export class GsapHoverDirective implements OnInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private anims: gsap.core.Tween[] = [];
  private over = false;

  @Input() gsapHoverScale = 1.04;
  @Input() gsapHoverRotate = 1.2;

  constructor(private el: ElementRef<HTMLElement>) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const node = this.el.nativeElement;
    node.style.transformOrigin = 'center center';

    const enter = () => {
      if (this.over) return;
      this.over = true;
      this.anims.push(
        gsap.to(node, {
          scale: this.gsapHoverScale,
          rotation: this.gsapHoverRotate,
          duration: 0.35,
          ease: 'back.out(2.5)',
        })
      );
    };
    const leave = () => {
      this.over = false;
      this.anims.push(
        gsap.to(node, {
          scale: 1,
          rotation: 0,
          duration: 0.4,
          ease: 'elastic.out(1, 0.4)',
        })
      );
    };

    node.addEventListener('mouseenter', enter);
    node.addEventListener('mouseleave', leave);
    this.cleanup = () => {
      node.removeEventListener('mouseenter', enter);
      node.removeEventListener('mouseleave', leave);
    };
  }

  private cleanup: () => void = () => undefined;

  ngOnDestroy(): void {
    this.cleanup();
    this.anims.forEach((a) => a.kill());
  }
}
