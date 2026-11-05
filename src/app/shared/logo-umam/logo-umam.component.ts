import { Component } from '@angular/core';

/** Logo de UMAM. Ocupa el tamaño que le dé su contenedor. */
@Component({
  selector: 'app-logo-umam',
  standalone: true,
  template: `
    <svg viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="18" fill="none" stroke="#0d3a5c" stroke-width="3"/>
      <path d="M20 6 L23 15 L32 12 L26 20 L32 28 L23 25 L20 34 L17 25 L8 28 L14 20 L8 12 L17 15 Z" fill="#0d3a5c"/>
      <path d="M20 11 L20 29 M15 14 C 25 17, 15 23, 25 26" stroke="#fff" stroke-width="1.6" fill="none"/>
    </svg>
  `,
  styles: [`
    :host { display: inline-flex; }
    svg { width: 100%; height: 100%; }
  `],
})
export class LogoUmamComponent {}
