// shared/directives/gsap-float.directive.ts — animasi float infinite (melayang seperti sticker)
import { Directive, ElementRef, Input, OnDestroy, OnInit, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import gsap from 'gsap';

@Directive({
  selector: '[gsapFloat]',
  standalone: true,
})
export class GsapFloatDirective implements OnInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private anim?: gsap.core.Tween;

  @Input() gsapFloatDistance = 10;
  @Input() gsapFloatDuration = 2.6;
  @Input() gsapFloatRotate = 3;

  constructor(private el: ElementRef<HTMLElement>) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.anim = gsap.to(this.el.nativeElement, {
      y: `-=${this.gsapFloatDistance}`,
      rotation: this.gsapFloatRotate,
      duration: this.gsapFloatDuration,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
      transformOrigin: 'center center',
    });
  }

  ngOnDestroy(): void {
    this.anim?.kill();
  }
}
