import { Component, Input, OnChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { LogoUmamComponent } from '../../shared/logo-umam/logo-umam.component';
import { SesionService } from '../../core/services/sesion.service';

/**
 * Pantalla de acceso. Con usuarioFijo se muestra encima de la app cuando la
 * sesión venció: solo deja entrar a la misma persona, para que lo capturado no
 * quede guardado a nombre de otra.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, MatButtonModule, LogoUmamComponent],
  template: `
    <div class="pantalla" [class.encima]="usuarioFijo">
      <form class="tarjeta" (submit)="entrar($event)">
        <span class="logo"><app-logo-umam></app-logo-umam></span>
        <h1>UMAM</h1>
        <p class="subtitulo">{{ usuarioFijo ? 'Tu sesión venció. Entra de nuevo para seguir; lo capturado sigue aquí.' : 'Registro de Atención Prehospitalaria' }}</p>

        <label>
          Usuario
          <input name="usuario" autocomplete="username" autocapitalize="none" required
            [value]="usuario" [readOnly]="!!usuarioFijo" (input)="usuario = $any($event.target).value" />
        </label>
        <label>
          Contraseña
          <input name="clave" type="password" autocomplete="current-password" required
            [value]="clave" (input)="clave = $any($event.target).value" />
        </label>

        <p class="error" *ngIf="mensajeError" role="alert">{{ mensajeError }}</p>
        <button class="entrar" type="submit" mat-flat-button [disabled]="entrando">{{ entrando ? 'Entrando…' : 'Entrar' }}</button>
      </form>
    </div>
  `,
  styles: [`
    .pantalla {
      display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 16px; box-sizing: border-box;
      background: linear-gradient(135deg, var(--umam-header-bg), var(--umam-header-oscuro));
    }
    .pantalla.encima { position: fixed; inset: 0; z-index: 20; background: rgba(16, 42, 67, 0.72); }
    .tarjeta {
      display: flex; flex-direction: column; gap: 14px; width: 100%; max-width: 360px; padding: 28px 24px;
      box-sizing: border-box; background: #fff; border-radius: 16px; box-shadow: var(--umam-sombra-media);
    }
    .logo { align-self: center; width: 84px; height: 84px; }
    .logo app-logo-umam { width: 100%; height: 100%; }
    h1 { margin: 0; text-align: center; font-size: 1.5rem; letter-spacing: 0.06em; color: var(--umam-texto-fuerte); }
    .subtitulo { margin: -8px 0 4px; text-align: center; color: var(--umam-texto-suave); font-size: 0.9rem; }
    label { display: flex; flex-direction: column; gap: 4px; font-size: 0.9rem; color: var(--umam-texto-fuerte); }
    input {
      min-height: 44px; padding: 0 12px; box-sizing: border-box; font: inherit; font-size: 1rem;
      border: 1px solid var(--umam-section-border); border-radius: 10px;
    }
    input:read-only { background: var(--umam-section-bg); }
    .error { margin: 0; padding: 10px 12px; border-radius: 10px; color: var(--umam-error); background: #fdecea; font-size: 0.9rem; }
    .entrar {
      min-height: 46px; border-radius: 12px;
      --mat-button-filled-container-color: var(--umam-azul-marino);
      --mat-button-filled-label-text-color: #fff;
    }
  `],
})
export class LoginComponent implements OnChanges {
  @Input() usuarioFijo?: string;

  usuario = '';
  clave = '';
  entrando = false;
  mensajeError = '';

  private sesion = inject(SesionService);

  ngOnChanges(): void {
    if (this.usuarioFijo) this.usuario = this.usuarioFijo;
  }

  async entrar(evento: Event): Promise<void> {
    evento.preventDefault();
    this.entrando = true;
    this.mensajeError = '';
    try {
      await this.sesion.entrar(this.usuario.trim(), this.clave);
    } catch (error) {
      this.clave = '';
      this.mensajeError = this.mensajeDe(error);
    } finally {
      this.entrando = false;
    }
  }

  private mensajeDe(error: unknown): string {
    const estado = error instanceof HttpErrorResponse ? error.status : 0;
    if (estado === 401) return 'Usuario o contraseña incorrectos.';
    if (estado === 429) return 'Demasiados intentos. Espera 15 minutos.';
    return 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
  }
}
