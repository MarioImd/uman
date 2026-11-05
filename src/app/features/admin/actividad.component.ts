import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AdminService, FilaActividad } from '../../core/services/admin.service';
import { PaginadorComponent } from '../../shared/paginador/paginador.component';

const ACCIONES: Record<FilaActividad['accion'], string> = {
  creo: 'Creó',
  edito: 'Editó',
  elimino: 'Eliminó',
  restauro: 'Restauró',
};

/** Quién hizo qué sobre cada registro. Solo la ve el administrador. */
@Component({
  selector: 'app-actividad',
  standalone: true,
  imports: [CommonModule, MatIconModule, PaginadorComponent],
  template: `
    <div class="contenido">
      <header class="cabecera">
        <h1>Actividad</h1>
        <label class="buscador">
          <mat-icon>search</mat-icon>
          <input type="search" placeholder="Buscar por usuario o folio" [value]="busqueda" (input)="alEscribir($any($event.target).value)" />
        </label>
      </header>

      <p class="aviso-error" *ngIf="errorCarga" role="alert">No se pudo cargar la actividad. Revisa tu conexión.</p>
      <p class="estado" *ngIf="!cargando && !errorCarga && filas.length === 0">No hay actividad que mostrar.</p>

      <div class="tabla-envoltura" *ngIf="filas.length > 0">
        <table>
          <thead>
            <tr><th>Usuario</th><th>Acción</th><th>Folio</th><th>Inicio</th><th>Fin</th></tr>
          </thead>
          <tbody>
            <tr *ngFor="let fila of filas">
              <td class="fuerte">{{ fila.usuario }}</td>
              <td>{{ textoAccion(fila) }}</td>
              <td>{{ fila.folio || '—' }}</td>
              <td>{{ fila.inicio | date: 'dd/MM/yyyy HH:mm' }}</td>
              <td>{{ fila.fin | date: 'dd/MM/yyyy HH:mm' }}</td>
            </tr>
          </tbody>
        </table>
        <app-paginador [pagina]="pagina" [total]="total" [porPagina]="porPagina" (cambiar)="irAPagina($event)"></app-paginador>
      </div>
    </div>
  `,
  styles: [`
    .contenido { max-width: 1200px; margin: 0 auto; padding: 20px 16px 32px; }
    .cabecera { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
    h1 { margin: 0; font-size: 1.4rem; color: var(--umam-texto-fuerte); }
    .buscador { display: flex; align-items: center; gap: 6px; flex: 1; max-width: 360px; min-width: 220px; padding: 0 12px;
      background: #fff; border: 1px solid var(--umam-section-border); border-radius: 999px; box-shadow: var(--umam-sombra-suave); }
    .buscador mat-icon { color: var(--umam-texto-suave); }
    .buscador input { flex: 1; min-width: 0; border: none; outline: none; height: 42px; font: inherit; background: transparent; }
    .aviso-error { color: var(--umam-error); background: #fdecea; padding: 10px 14px; border-radius: 10px; margin: 0 0 12px; }
    .estado { color: var(--umam-texto-suave); text-align: center; padding: 48px 16px; margin: 0; background: #fff; border: 1px dashed var(--umam-section-border); border-radius: 16px; }
    .tabla-envoltura { overflow-x: auto; background: #fff; border: 1px solid var(--umam-section-border); border-radius: 16px; box-shadow: var(--umam-sombra-suave); }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 10px 14px; text-align: left; white-space: nowrap; border-bottom: 1px solid #edf1f6; }
    th { background: var(--umam-section-bg); color: var(--umam-header-bg); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; }
    .fuerte { font-weight: 600; color: var(--umam-texto-fuerte); }
  `],
})
export class ActividadComponent implements OnInit, OnDestroy {
  filas: FilaActividad[] = [];
  total = 0;
  pagina = 1;
  porPagina = 20;
  busqueda = '';
  cargando = true;
  errorCarga = false;

  private admin = inject(AdminService);
  private esperaBusqueda?: ReturnType<typeof setTimeout>;
  /** Identifica la petición más reciente, para descartar respuestas que lleguen tarde. */
  private ultimaPeticion = 0;

  ngOnInit(): Promise<void> {
    return this.cargar();
  }

  ngOnDestroy(): void {
    clearTimeout(this.esperaBusqueda);
  }

  async cargar(): Promise<void> {
    const peticion = ++this.ultimaPeticion;
    this.cargando = true;
    this.errorCarga = false;
    try {
      const resultado = await this.admin.actividad(this.pagina, this.busqueda.trim());
      if (peticion !== this.ultimaPeticion) return;
      this.filas = resultado.items;
      this.total = resultado.total;
      this.porPagina = resultado.porPagina;
    } catch (error) {
      if (peticion !== this.ultimaPeticion) return;
      console.error('No se pudo cargar la actividad.', error);
      this.errorCarga = true;
    }
    this.cargando = false;
  }

  irAPagina(pagina: number): void {
    this.pagina = pagina;
    this.cargar();
  }

  alEscribir(texto: string): void {
    this.busqueda = texto;
    clearTimeout(this.esperaBusqueda);
    this.esperaBusqueda = setTimeout(() => {
      this.pagina = 1;
      this.cargar();
    }, 300);
  }

  textoAccion(fila: FilaActividad): string {
    return ACCIONES[fila.accion];
  }
}
