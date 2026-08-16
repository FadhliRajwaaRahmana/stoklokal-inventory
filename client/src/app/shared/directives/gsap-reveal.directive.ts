// shared/directives/gsap-reveal.directive.ts — fade+rise saat masuk viewport (GSAP ScrollTrigger)
import { Directive, ElementRef, Inject, Input, OnDestroy, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

@Directive({
  selector: '[gsapReveal]',
  standalone: true,
})
export class GsapRevealDirective implements OnInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private anim?: gsap.core.Tween;

  @Input() gsapRevealDelay = 0;
  @Input() gsapRevealY = 40;
  @Input() gsapRevealOnce = true;

  constructor(@Inject(ElementRef) private el: ElementRef<HTMLElement>) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const node = this.el.nativeElement;
    this.anim = gsap.fromTo(
      node,
      { autoAlpha: 0, y: this.gsapRevealY },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.9,
        ease: 'power3.out',
        delay: this.gsapRevealDelay,
        scrollTrigger: {
          trigger: node,
          start: 'top 88%',
          once: this.gsapRevealOnce,
        },
      }
    );
  }

  ngOnDestroy(): void {
    this.anim?.scrollTrigger?.kill();
    this.anim?.kill();
  }
}
