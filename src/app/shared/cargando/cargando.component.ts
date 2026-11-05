import { Component, Input, OnDestroy, OnInit, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';

/** A partir de aquí una espera ya se siente larga. */
const ESPERA_LENTA_MS = 4000;

/** Espiral de carga. Si la espera se alarga, avisa que el servidor sigue trabajando. */
@Component({
  selector: 'app-cargando',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="cargando" [class.cubrir]="cubrir" role="status">
      <div class="tarjeta">
        <span class="espiral" aria-hidden="true"></span>
        <p class="texto">{{ texto }}</p>
        <p class="aviso" *ngIf="lento">El servidor sigue trabajando. Por favor espera, no cierres esta pantalla.</p>
      </div>
    </div>
  `,
  styles: [`
    .cargando { display: flex; align-items: center; justify-content: center; padding: 48px 16px; }
    .cargando.cubrir { position: fixed; inset: 0; z-index: 15; padding: 16px; background: rgba(16, 42, 67, 0.45); }
    .tarjeta { display: flex; flex-direction: column; align-items: center; gap: 12px; max-width: 320px; text-align: center; }
    .cubrir .tarjeta { padding: 28px 24px; background: #fff; border-radius: 16px; box-shadow: var(--umam-sombra-media); }
    .texto { margin: 0; color: var(--umam-texto-fuerte); font-weight: 500; }
    .aviso { margin: 0; color: var(--umam-texto-suave); font-size: 0.9rem; }

    /* Un arco que se desvanece hacia la cola, recortado en anillo: se lee como espiral. */
    .espiral {
      display: block; width: 56px; height: 56px; border-radius: 50%;
      background: conic-gradient(from 0deg, transparent 8%, var(--umam-header-bg) 62%, var(--umam-azul-marino));
      -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 7px), #000 calc(100% - 6px));
      mask: radial-gradient(farthest-side, transparent calc(100% - 7px), #000 calc(100% - 6px));
      animation: girar 0.9s linear infinite;
    }
    @keyframes girar { to { transform: rotate(360deg); } }

    /* Quien pide menos movimiento ve un pulso suave en lugar del giro. */
    @media (prefers-reduced-motion: reduce) {
      .espiral { animation: pulso 2s ease-in-out infinite; }
      @keyframes pulso { 50% { opacity: 0.45; } }
    }
  `],
})
export class CargandoComponent implements OnInit, OnDestroy {
  @Input() texto = 'Cargando…';
  /** Ocupa toda la pantalla y bloquea los clics mientras dura. */
  @Input({ transform: booleanAttribute }) cubrir = false;

  lento = false;
  private espera?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.espera = setTimeout(() => (this.lento = true), ESPERA_LENTA_MS);
  }

  ngOnDestroy(): void {
    clearTimeout(this.espera);
  }
}
