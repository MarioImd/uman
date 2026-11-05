import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AdminService, NuevoUsuario, UsuarioAdmin } from '../../core/services/admin.service';

const USUARIO_VACIO: NuevoUsuario = { usuario: '', nombre: '', clave: '', rol: 'usuario' };

/** Alta y mantenimiento de cuentas. Solo la ve el administrador. */
@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <div class="contenido">
      <h1>Usuarios</h1>

      <form class="alta" (submit)="crear($event)">
        <label>Usuario <input name="usuario" required autocomplete="off" autocapitalize="none" [value]="nuevo.usuario" (input)="nuevo.usuario = $any($event.target).value" /></label>
        <label>Nombre <input name="nombre" required autocomplete="off" [value]="nuevo.nombre" (input)="nuevo.nombre = $any($event.target).value" /></label>
        <label>Contraseña <input name="clave" type="password" required minlength="8" autocomplete="new-password" [value]="nuevo.clave" (input)="nuevo.clave = $any($event.target).value" /></label>
        <label>Rol
          <select name="rol" [value]="nuevo.rol" (change)="nuevo.rol = $any($event.target).value">
            <option value="usuario">Usuario</option>
            <option value="admin">Administrador</option>
          </select>
        </label>
        <button type="submit" class="crear" mat-flat-button [disabled]="guardando"><mat-icon>person_add</mat-icon> Crear usuario</button>
      </form>

      <p class="aviso-error" *ngIf="mensajeError" role="alert">{{ mensajeError }}</p>
      <p class="aviso-exito" *ngIf="mensajeExito" role="status">{{ mensajeExito }}</p>

      <div class="tabla-envoltura" *ngIf="usuarios.length > 0">
        <table>
          <thead>
            <tr><th>Usuario</th><th>Nombre</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            <tr *ngFor="let usuario of usuarios">
              <td class="fuerte">{{ usuario.usuario }}</td>
              <td>{{ usuario.nombre }}</td>
              <td>{{ usuario.rol === 'admin' ? 'Administrador' : 'Usuario' }}</td>
              <td [class.inactivo]="!usuario.activo">{{ usuario.activo ? 'Activo' : 'Inactivo' }}</td>
              <td class="acciones">
                <button type="button" class="cambiar-clave" mat-stroked-button (click)="cambiarClave(usuario)">Cambiar contraseña</button>
                <button type="button" class="alternar-activo" mat-stroked-button (click)="alternarActivo(usuario)">{{ usuario.activo ? 'Desactivar' : 'Activar' }}</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .contenido { max-width: 1000px; margin: 0 auto; padding: 20px 16px 32px; }
    h1 { margin: 0 0 16px; font-size: 1.4rem; color: var(--umam-texto-fuerte); }
    .alta {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; align-items: end;
      padding: 16px; margin-bottom: 16px; background: #fff; border: 1px solid var(--umam-section-border);
      border-radius: 16px; box-shadow: var(--umam-sombra-suave);
    }
    label { display: flex; flex-direction: column; gap: 4px; font-size: 0.85rem; color: var(--umam-texto-fuerte); }
    input, select { min-height: 44px; padding: 0 10px; box-sizing: border-box; font: inherit; border: 1px solid var(--umam-section-border); border-radius: 10px; background: #fff; }
    .crear { min-height: 44px; border-radius: 12px; --mat-button-filled-container-color: var(--umam-azul-marino); --mat-button-filled-label-text-color: #fff; }
    .aviso-error { color: var(--umam-error); background: #fdecea; padding: 10px 14px; border-radius: 10px; margin: 0 0 12px; }
    .aviso-exito { color: var(--umam-exito); background: #e8f6ee; padding: 10px 14px; border-radius: 10px; margin: 0 0 12px; }
    .tabla-envoltura { overflow-x: auto; background: #fff; border: 1px solid var(--umam-section-border); border-radius: 16px; box-shadow: var(--umam-sombra-suave); }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 10px 14px; text-align: left; white-space: nowrap; border-bottom: 1px solid #edf1f6; }
    th { background: var(--umam-section-bg); color: var(--umam-header-bg); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; }
    tbody tr:last-child td { border-bottom: none; }
    .fuerte { font-weight: 600; color: var(--umam-texto-fuerte); }
    .inactivo { color: var(--umam-error); }
    .acciones { display: flex; gap: 6px; }
    .acciones button { min-height: 38px; border-radius: 10px; }
  `],
})
export class UsuariosComponent implements OnInit {
  usuarios: UsuarioAdmin[] = [];
  nuevo: NuevoUsuario = { ...USUARIO_VACIO };
  guardando = false;
  mensajeError = '';
  mensajeExito = '';

  private admin = inject(AdminService);

  ngOnInit(): Promise<void> {
    return this.cargar();
  }

  private async cargar(): Promise<void> {
    try {
      this.usuarios = await this.admin.usuarios();
    } catch (error) {
      this.mostrarError(error);
    }
  }

  async crear(evento: Event): Promise<void> {
    evento.preventDefault();
    await this.ejecutar(async () => {
      await this.admin.crearUsuario(this.nuevo);
      this.nuevo = { ...USUARIO_VACIO };
      return 'Usuario creado.';
    });
  }

  alternarActivo(usuario: UsuarioAdmin): Promise<void> {
    return this.ejecutar(async () => {
      await this.admin.editarUsuario(usuario.id, { activo: !usuario.activo });
      return usuario.activo ? 'Usuario desactivado.' : 'Usuario activado.';
    });
  }

  cambiarClave(usuario: UsuarioAdmin): Promise<void> {
    const clave = prompt(`Nueva contraseña para ${usuario.usuario} (mínimo 8 caracteres):`);
    if (clave === null) return Promise.resolve();
    return this.ejecutar(async () => {
      await this.admin.editarUsuario(usuario.id, { clave });
      return 'Contraseña actualizada.';
    });
  }

  /** Hace un cambio, muestra su resultado y actualiza la lista. */
  private async ejecutar(accion: () => Promise<string>): Promise<void> {
    this.guardando = true;
    this.mensajeError = '';
    this.mensajeExito = '';
    try {
      this.mensajeExito = await accion();
      await this.cargar();
    } catch (error) {
      this.mostrarError(error);
    } finally {
      this.guardando = false;
    }
  }

  private mostrarError(error: unknown): void {
    const delServidor = error instanceof HttpErrorResponse ? error.error?.error : undefined;
    this.mensajeError = delServidor ?? 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
  }
}
