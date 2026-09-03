import { Component, EventEmitter, Inject, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
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
  imports: [CommonModule, MatButtonModule, MatIconModule, MatToolbarModule, PdfVistaComponent],
  template: `
    <mat-toolbar class="encabezado">
      <span>UMAM — Historial de Trámites</span>
    </mat-toolbar>

    <div class="contenido">
      <p *ngIf="cargando" class="estado">Cargando historial…</p>
      <p *ngIf="!cargando && registros.length === 0" class="estado">Todavía no hay trámites guardados.</p>

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
            <tr *ngFor="let registro of registros">
              <td>{{ registro.folio || '—' }}</td>
              <td>{{ registro.fechaCreacion | date: 'dd/MM/yyyy HH:mm' }}</td>
              <td>{{ nombrePaciente(registro) }}</td>
              <td>{{ registro.ciudad || '—' }}</td>
              <td class="acciones-fila">
                <button type="button" class="abrir" mat-stroked-button (click)="abrirRegistro(registro)" title="Abrir para editar">
                  <mat-icon>edit</mat-icon> Abrir
                </button>
                <button type="button" class="exportar-pdf" mat-icon-button (click)="exportarPdf(registro)" aria-label="Exportar PDF" title="Exportar PDF">
                  <mat-icon>picture_as_pdf</mat-icon>
                </button>
                <button type="button" class="exportar-excel" mat-icon-button (click)="exportarExcel(registro)" aria-label="Exportar Excel" title="Exportar Excel">
                  <mat-icon>grid_on</mat-icon>
                </button>
                <button type="button" class="eliminar" mat-icon-button (click)="eliminar(registro)" aria-label="Eliminar" title="Eliminar">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
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
    .encabezado { background: var(--umam-header-bg, #1892d3); color: var(--umam-header-fg, #fff); }
    .contenido { max-width: 900px; margin: 0 auto; padding: 16px; }
    .estado { color: #555; text-align: center; padding: 32px 0; }
    .tabla-envoltura { overflow-x: auto; border: 1px solid var(--umam-section-border, #b9def2); border-radius: 12px; }
    .tabla-historial { width: 100%; border-collapse: collapse; background: #fff; }
    .tabla-historial th, .tabla-historial td { padding: 10px 12px; text-align: left; white-space: nowrap; border-bottom: 1px solid var(--umam-section-border, #b9def2); }
    .tabla-historial th { background: var(--umam-section-bg, #dbeef9); color: var(--umam-header-bg, #1892d3); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.03em; }
    .tabla-historial tbody tr:last-child td { border-bottom: none; }
    .acciones-fila { display: flex; align-items: center; gap: 4px; }
    .abrir { min-height: 40px; }
    .solo-impresion { display: none; }
    @media print {
      .encabezado, .contenido { display: none !important; }
      .solo-impresion { display: block !important; }
    }
  `],
})
export class HistorialComponent implements OnInit {
  @Output() abrir = new EventEmitter<RegistroAtencionPrehospitalaria>();

  registros: RegistroAtencionPrehospitalaria[] = [];
  cargando = true;
  /** Foto tomada justo antes de imprimir — mismo patrón que FormularioComponent. */
  snapshotParaImpresion: Record<string, unknown> | undefined;

  constructor(
    private fb: FormBuilder,
    @Inject(REGISTRO_SERVICE) private registroService: RegistroService,
    private excelExportador: ExcelExportadorService,
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      const todos = await this.registroService.listar();
      // Más reciente primero.
      this.registros = [...todos].sort((a, b) => b.fechaCreacion.localeCompare(a.fechaCreacion));
    } catch (error) {
      console.error('No se pudo cargar el historial de trámites.', error);
      this.registros = [];
    } finally {
      this.cargando = false;
    }
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
    window.print();
  }

  exportarExcel(registro: RegistroAtencionPrehospitalaria): void {
    this.excelExportador.exportar(registro);
  }

  async eliminar(registro: RegistroAtencionPrehospitalaria): Promise<void> {
    const confirmado = confirm(`¿Eliminar el trámite con folio "${registro.folio || '(sin folio)'}"? Esta acción no se puede deshacer.`);
    if (!confirmado) return;
    await this.registroService.eliminar(registro.id);
    this.registros = this.registros.filter(r => r.id !== registro.id);
  }
}
