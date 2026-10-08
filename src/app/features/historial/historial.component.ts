import { ChangeDetectorRef, Component, EventEmitter, Inject, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PdfVistaComponent } from '../exportacion/pdf-vista/pdf-vista.component';
import { ExcelExportadorService } from '../exportacion/excel-exportador.service';
import { construirFormularioRegistro } from '../../core/forms/construir-formulario';
import { RegistroAtencionPrehospitalaria } from '../../core/models/registro.model';
import { REGISTRO_SERVICE, RegistroService } from '../../core/services/registro.service';

/**
 * Historial de trámites guardados (RegistroService.listar() ya soportaba
 * varios registros desde el principio; solo faltaba una vista para verlos).
 * Cada fila deja abrir el trámite para seguir editándolo, exportar su PDF o
 * Excel tal cual quedó guardado, o eliminarlo.
 */
@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, PdfVistaComponent],
  template: `
    <div class="contenido">
      <header class="cabecera">
        <div>
          <h1>Historial de trámites</h1>
          <p class="subtitulo" *ngIf="!cargando && !errorCarga">
            {{ registros.length }} {{ registros.length === 1 ? 'trámite guardado' : 'trámites guardados' }}
          </p>
        </div>
        <label class="buscador" *ngIf="registros.length > 0">
          <mat-icon>search</mat-icon>
          <input type="search" placeholder="Buscar por folio, paciente o ciudad" [value]="busqueda" (input)="busqueda = $any($event.target).value" />
        </label>
      </header>

      <p *ngIf="cargando" class="estado"><mat-icon>hourglass_empty</mat-icon> Cargando historial…</p>

      <!-- Error de conexión: se distingue de "no hay trámites" para no confundir al usuario. -->
      <div *ngIf="!cargando && errorCarga" class="estado estado-error">
        <mat-icon>cloud_off</mat-icon>
        <p>No se pudo conectar con el servidor. Revisa que el backend esté encendido.</p>
        <button type="button" class="reintentar" mat-stroked-button (click)="cargar()"><mat-icon>refresh</mat-icon> Reintentar</button>
      </div>

      <p *ngIf="!cargando && !errorCarga && registros.length === 0" class="estado">
        <mat-icon>inbox</mat-icon> Todavía no hay trámites guardados.
      </p>
      <p *ngIf="mensajeError" class="aviso-error">{{ mensajeError }}</p>

      <div class="tabla-envoltura" *ngIf="!cargando && registros.length > 0">
        <table class="tabla-historial">
          <thead>
            <tr>
              <th>Folio</th>
              <th>Fecha</th>
              <th>Paciente</th>
              <th>Ciudad</th>
              <th>Documentos</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let registro of registrosFiltrados()">
              <td class="folio">{{ registro.folio || '—' }}</td>
              <td>{{ registro.fechaCreacion | date: 'dd/MM/yyyy HH:mm' }}</td>
              <td>{{ nombrePaciente(registro) }}</td>
              <td>{{ registro.ciudad || '—' }}</td>
              <td class="acciones-fila">
                <button type="button" class="abrir" mat-flat-button (click)="abrirRegistro(registro)" title="Abrir para editar">
                  <mat-icon>edit</mat-icon> Abrir
                </button>
                <button type="button" class="exportar-pdf" mat-icon-button (click)="exportarPdf(registro)" aria-label="Exportar PDF" title="Exportar PDF">
                  <mat-icon>picture_as_pdf</mat-icon>
                </button>
                <button type="button" class="exportar-excel" mat-icon-button (click)="exportarExcel(registro)" aria-label="Exportar Excel" title="Exportar Excel">
                  <mat-icon>grid_on</mat-icon>
                </button>
                <button type="button" class="eliminar" mat-icon-button (click)="eliminar(registro)" aria-label="Eliminar" title="Eliminar">
                  <mat-icon>delete_outline</mat-icon>
                </button>
              </td>
            </tr>
            <tr *ngIf="registrosFiltrados().length === 0">
              <td colspan="5" class="sin-resultados">Ningún trámite coincide con la búsqueda.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="solo-impresion">
      <app-pdf-vista [registro]="snapshotParaImpresion"></app-pdf-vista>
    </div>
  `,
  styles: [`
    .contenido { max-width: 1000px; margin: 0 auto; padding: 20px 16px 32px; }
    .cabecera { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
    h1 { margin: 0; font-size: 1.4rem; color: var(--umam-texto-fuerte); }
    .subtitulo { margin: 2px 0 0; color: var(--umam-texto-suave); font-size: 0.9rem; }
    .buscador { display: flex; align-items: center; gap: 6px; flex: 1; max-width: 360px; min-width: 220px; padding: 0 12px;
      background: #fff; border: 1px solid var(--umam-section-border); border-radius: 999px; box-shadow: var(--umam-sombra-suave); }
    .buscador mat-icon { color: var(--umam-texto-suave); }
    .buscador input { flex: 1; min-width: 0; border: none; outline: none; height: 42px; font: inherit; background: transparent; }
    .estado { display: flex; flex-direction: column; align-items: center; gap: 8px; color: var(--umam-texto-suave); text-align: center; padding: 48px 16px;
      margin: 0; background: #fff; border: 1px dashed var(--umam-section-border); border-radius: 16px; }
    .estado mat-icon { font-size: 40px; width: 40px; height: 40px; opacity: 0.6; }
    .estado p { margin: 0; }
    .estado-error { color: var(--umam-error); border-color: #f1b8b2; }
    .aviso-error { color: var(--umam-error); background: #fdecea; padding: 10px 14px; border-radius: 10px; margin: 0 0 12px; }
    .tabla-envoltura { overflow-x: auto; background: #fff; border: 1px solid var(--umam-section-border); border-radius: 16px; box-shadow: var(--umam-sombra-suave); }
    .tabla-historial { width: 100%; border-collapse: collapse; }
    .tabla-historial th, .tabla-historial td { padding: 10px 14px; text-align: left; white-space: nowrap; border-bottom: 1px solid #edf1f6; }
    .tabla-historial th { background: var(--umam-section-bg); color: var(--umam-header-bg); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; }
    .tabla-historial tbody tr:hover { background: #f7fafd; }
    .tabla-historial tbody tr:last-child td { border-bottom: none; }
    .folio { font-weight: 600; color: var(--umam-texto-fuerte); }
    .acciones-fila { display: flex; align-items: center; gap: 2px; }
    .abrir { min-height: 38px; margin-right: 6px; --mat-button-filled-container-color: var(--umam-azul-marino); --mat-button-filled-label-text-color: #fff; }
    .eliminar { color: var(--umam-error); }
    .sin-resultados { text-align: center !important; color: var(--umam-texto-suave); padding: 24px !important; }
    .solo-impresion { display: none; }
    @media print {
      .contenido { display: none !important; }
      .solo-impresion { display: block !important; }
    }
  `],
})
export class HistorialComponent implements OnInit {
  @Output() abrir = new EventEmitter<RegistroAtencionPrehospitalaria>();

  registros: RegistroAtencionPrehospitalaria[] = [];
  cargando = true;
  /** No se pudo leer la lista (p. ej. backend apagado). */
  errorCarga = false;
  /** Error al eliminar un trámite. */
  mensajeError = '';
  /** Texto del buscador: filtra por folio, nombre del paciente o ciudad. */
  busqueda = '';
  /** Foto tomada justo antes de imprimir — mismo patrón que FormularioComponent. */
  snapshotParaImpresion: Record<string, unknown> | undefined;

  constructor(
    private fb: FormBuilder,
    @Inject(REGISTRO_SERVICE) private registroService: RegistroService,
    private excelExportador: ExcelExportadorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): Promise<void> {
    return this.cargar();
  }

  /** Lee los trámites del servidor; también lo usa el botón "Reintentar". */
  async cargar(): Promise<void> {
    this.cargando = true;
    this.errorCarga = false;
    try {
      const todos = await this.registroService.listar();
      // Más reciente primero.
      this.registros = [...todos].sort((a, b) => b.fechaCreacion.localeCompare(a.fechaCreacion));
    } catch (error) {
      console.error('No se pudo cargar el historial de trámites.', error);
      this.registros = [];
      this.errorCarga = true;
    } finally {
      this.cargando = false;
    }
  }

  registrosFiltrados(): RegistroAtencionPrehospitalaria[] {
    const texto = this.busqueda.trim().toLowerCase();
    if (!texto) return this.registros;
    return this.registros.filter(r =>
      [r.folio, r.ciudad, this.nombrePaciente(r)].some(v => (v ?? '').toLowerCase().includes(texto)),
    );
  }

  nombrePaciente(registro: RegistroAtencionPrehospitalaria): string {
    const nombre = (registro.datosPaciente as Record<string, unknown> | undefined)?.['nombreOMediaFiliacion'];
    return typeof nombre === 'string' && nombre.trim() ? nombre : '(sin nombre)';
  }

  abrirRegistro(registro: RegistroAtencionPrehospitalaria): void {
    this.abrir.emit(registro);
  }

  /**
   * No hay un FormGroup en vivo para un trámite del historial, así que se
   * arma uno temporal solo para obtener su getRawValue() en la misma forma
   * anidada (datosGenerales.folio/estado/ciudad, etc.) que espera
   * PdfVistaComponent — igual que hace FormularioComponent.exportarPdf().
   */
  exportarPdf(registro: RegistroAtencionPrehospitalaria): void {
    const formularioTemporal = construirFormularioRegistro(this.fb, registro);
    this.snapshotParaImpresion = formularioTemporal.getRawValue();
    // Dibuja la hoja con estos datos ANTES de abrir el diálogo de impresión;
    // si no, se imprimía la hoja anterior (o en blanco la primera vez).
    this.cdr.detectChanges();
    window.print();
  }

  exportarExcel(registro: RegistroAtencionPrehospitalaria): void {
    this.excelExportador.exportar(registro);
  }

  async eliminar(registro: RegistroAtencionPrehospitalaria): Promise<void> {
    const confirmado = confirm(`¿Eliminar el trámite con folio "${registro.folio || '(sin folio)'}"? Esta acción no se puede deshacer.`);
    if (!confirmado) return;
    this.mensajeError = '';
    try {
      await this.registroService.eliminar(registro.id);
      this.registros = this.registros.filter(r => r.id !== registro.id);
    } catch (error) {
      console.error('No se pudo eliminar el trámite.', error);
      this.mensajeError = 'No se pudo eliminar el trámite. Revisa la conexión con el servidor e inténtalo de nuevo.';
    }
  }
}
