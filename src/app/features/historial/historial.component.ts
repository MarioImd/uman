import { ChangeDetectorRef, Component, ElementRef, EventEmitter, Inject, OnDestroy, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CargandoComponent } from '../../shared/cargando/cargando.component';
import { PaginadorComponent } from '../../shared/paginador/paginador.component';
import { PdfVistaComponent } from '../exportacion/pdf-vista/pdf-vista.component';
import { esperarImagenes } from '../exportacion/esperar-imagenes';
import { ExcelExportadorService } from '../exportacion/excel-exportador.service';
import { construirFormularioRegistro } from '../../core/forms/construir-formulario';
import { RegistroAtencionPrehospitalaria, RegistroResumen } from '../../core/models/registro.model';
import { REGISTRO_SERVICE, RegistroService } from '../../core/services/registro.service';

/**
 * Historial de trámites guardados. La lista llega paginada y sin imágenes; cada
 * fila descarga el trámite completo solo cuando se abre o se exporta.
 */
@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, CargandoComponent, PaginadorComponent, PdfVistaComponent],
  template: `
    <div class="contenido">
      <header class="cabecera">
        <div>
          <h1>Historial de trámites</h1>
          <p class="subtitulo" *ngIf="!errorCarga && (total > 0 || !cargando)">
            {{ total }} {{ total === 1 ? 'trámite' : 'trámites' }} {{ busqueda.trim() ? 'encontrados' : (total === 1 ? 'guardado' : 'guardados') }}
          </p>
        </div>
        <label class="buscador" *ngIf="total > 0 || busqueda">
          <mat-icon>search</mat-icon>
          <input type="search" placeholder="Buscar por folio, paciente o ciudad" [value]="busqueda" (input)="alEscribir($any($event.target).value)" />
        </label>
      </header>

      <app-cargando *ngIf="cargando && registros.length === 0" texto="Cargando historial…"></app-cargando>

      <!-- Error de conexión: se distingue de "no hay trámites" para no confundir al usuario. -->
      <div *ngIf="!cargando && errorCarga" class="estado estado-error">
        <mat-icon>cloud_off</mat-icon>
        <p>No se pudo conectar con el servidor. Revisa tu conexión a internet.</p>
        <button type="button" class="reintentar" mat-stroked-button (click)="cargar()"><mat-icon>refresh</mat-icon> Reintentar</button>
      </div>

      <p *ngIf="!cargando && !errorCarga && registros.length === 0" class="estado">
        <mat-icon>{{ busqueda.trim() ? 'search_off' : 'inbox' }}</mat-icon>
        {{ busqueda.trim() ? 'Ningún trámite coincide con la búsqueda.' : 'Todavía no hay trámites guardados.' }}
      </p>
      <p *ngIf="mensajeError" class="aviso-error">{{ mensajeError }}</p>
      <app-cargando *ngIf="procesandoId" cubrir texto="Cargando trámite…"></app-cargando>

      <div class="tabla-envoltura" *ngIf="registros.length > 0">
        <table class="tabla-historial">
          <thead>
            <tr>
              <th>Folio</th>
              <th>Fecha</th>
              <th>Paciente</th>
              <th>Ciudad</th>
              <th>Creado por</th>
              <th>Documentos</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let registro of registros; trackBy: porId">
              <td class="folio">{{ registro.folio || '—' }}</td>
              <td data-etiqueta="Fecha">{{ registro.fechaCreacion | date: 'dd/MM/yyyy HH:mm' }}</td>
              <td data-etiqueta="Paciente">{{ registro.paciente || '(sin nombre)' }}</td>
              <td data-etiqueta="Ciudad">{{ registro.ciudad || '—' }}</td>
              <td data-etiqueta="Creado por">{{ registro.creadoPor || '—' }}</td>
              <td class="acciones-fila">
                <button type="button" class="abrir" mat-flat-button [disabled]="!!procesandoId" (click)="abrirRegistro(registro)" title="Abrir para editar">
                  <mat-icon>edit</mat-icon> Abrir
                </button>
                <button type="button" class="exportar-pdf" mat-icon-button [disabled]="!!procesandoId" (click)="exportarPdf(registro)" aria-label="Exportar PDF" title="Exportar PDF">
                  <mat-icon>picture_as_pdf</mat-icon>
                </button>
                <button type="button" class="exportar-excel" mat-icon-button [disabled]="!!procesandoId" (click)="exportarExcel(registro)" aria-label="Exportar Excel" title="Exportar Excel">
                  <mat-icon>grid_on</mat-icon>
                </button>
                <button type="button" class="eliminar" mat-icon-button (click)="eliminar(registro)" aria-label="Eliminar" title="Eliminar">
                  <mat-icon>delete_outline</mat-icon>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <app-paginador [pagina]="pagina" [total]="total" [porPagina]="porPagina" (cambiar)="irAPagina($event)"></app-paginador>
      </div>
    </div>

    <div class="solo-impresion">
      <app-pdf-vista [registro]="snapshotParaImpresion"></app-pdf-vista>
    </div>
  `,
  styles: [`
    .contenido { max-width: 1200px; margin: 0 auto; padding: 20px 16px 32px; }
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
    .solo-impresion { display: none; }
    /* Celular y tableta: cada trámite es una tarjeta, con sus botones a la vista. */
    @media (max-width: 900px) {
      .tabla-envoltura { overflow: visible; background: none; border: none; box-shadow: none; }
      .tabla-historial, .tabla-historial tbody, .tabla-historial tr, .tabla-historial td { display: block; }
      .tabla-historial thead { display: none; }
      .tabla-historial tbody tr {
        margin-bottom: 10px; padding: 12px 14px; background: #fff; border: 1px solid var(--umam-section-border);
        border-radius: 16px; box-shadow: var(--umam-sombra-suave);
      }
      .tabla-historial tbody tr:hover { background: #fff; }
      .tabla-historial td { padding: 2px 0; white-space: normal; border: none; overflow-wrap: anywhere; }
      .tabla-historial td[data-etiqueta]::before { content: attr(data-etiqueta) ': '; color: var(--umam-texto-suave); font-size: 0.85rem; }
      .folio { margin-bottom: 4px; font-size: 1.05rem; }
      .tabla-historial .acciones-fila { display: flex; gap: 4px; margin-top: 8px; }
      .abrir { flex: 1; min-height: 44px; margin-right: 2px; }
    }
    @media print {
      .contenido { display: none !important; }
      .solo-impresion { display: block !important; }
    }
  `],
})
export class HistorialComponent implements OnInit, OnDestroy {
  @Output() abrir = new EventEmitter<RegistroAtencionPrehospitalaria>();

  registros: RegistroResumen[] = [];
  total = 0;
  pagina = 1;
  porPagina = 20;
  cargando = true;
  /** No se pudo leer la lista (p. ej. sin conexión). */
  errorCarga = false;
  /** Error al eliminar o al cargar un trámite. */
  mensajeError = '';
  /** Texto del buscador: el servidor filtra por folio, paciente o ciudad. */
  busqueda = '';
  /** Trámite que se está descargando completo para abrirlo o exportarlo. */
  procesandoId = '';
  /** Foto tomada justo antes de imprimir — mismo patrón que FormularioComponent. */
  snapshotParaImpresion: Record<string, unknown> | undefined;

  private elemento = inject<ElementRef<HTMLElement>>(ElementRef);
  private esperaBusqueda?: ReturnType<typeof setTimeout>;
  /** Identifica la petición más reciente, para descartar respuestas que lleguen tarde. */
  private ultimaPeticion = 0;

  constructor(
    private fb: FormBuilder,
    @Inject(REGISTRO_SERVICE) private registroService: RegistroService,
    private excelExportador: ExcelExportadorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): Promise<void> {
    return this.cargar();
  }

  ngOnDestroy(): void {
    clearTimeout(this.esperaBusqueda);
  }

  /** Lee la página actual del servidor; también lo usa el botón "Reintentar". */
  async cargar(): Promise<void> {
    const peticion = ++this.ultimaPeticion;
    this.cargando = true;
    this.errorCarga = false;
    try {
      const resultado = await this.registroService.listar(this.pagina, this.busqueda.trim());
      if (peticion !== this.ultimaPeticion) return;
      // La página pedida ya no existe (p. ej. se eliminó su última fila): ir a la última.
      if (resultado.items.length === 0 && this.pagina > 1) {
        this.pagina = Math.max(1, Math.ceil(resultado.total / resultado.porPagina));
        return this.cargar();
      }
      this.registros = resultado.items;
      this.total = resultado.total;
      this.porPagina = resultado.porPagina;
      this.cargando = false;
    } catch (error) {
      if (peticion !== this.ultimaPeticion) return;
      console.error('No se pudo cargar el historial de trámites.', error);
      this.registros = [];
      this.total = 0;
      this.errorCarga = true;
      this.cargando = false;
    }
  }

  irAPagina(pagina: number): void {
    this.pagina = pagina;
    this.cargar();
  }

  /** Espera a que se deje de escribir para no consultar al servidor en cada tecla. */
  alEscribir(texto: string): void {
    this.busqueda = texto;
    clearTimeout(this.esperaBusqueda);
    this.esperaBusqueda = setTimeout(() => {
      this.pagina = 1;
      this.cargar();
    }, 300);
  }

  porId(_indice: number, registro: RegistroResumen): string {
    return registro.id;
  }

  /** La lista solo trae el resumen: el registro completo se descarga al necesitarlo. */
  private async registroCompleto(resumen: RegistroResumen): Promise<RegistroAtencionPrehospitalaria | undefined> {
    this.mensajeError = '';
    this.procesandoId = resumen.id;
    try {
      const registro = await this.registroService.obtener(resumen.id);
      if (!registro) {
        this.mensajeError = 'Ese trámite ya no existe. Se actualizó la lista.';
        await this.cargar();
      }
      return registro;
    } catch (error) {
      console.error('No se pudo cargar el trámite.', error);
      this.mensajeError = 'No se pudo cargar el trámite. Revisa tu conexión e inténtalo de nuevo.';
      return undefined;
    } finally {
      this.procesandoId = '';
    }
  }

  async abrirRegistro(resumen: RegistroResumen): Promise<void> {
    const registro = await this.registroCompleto(resumen);
    if (registro) this.abrir.emit(registro);
  }

  /**
   * No hay un FormGroup en vivo para un trámite del historial, así que se
   * arma uno temporal solo para obtener su getRawValue() en la misma forma
   * anidada (datosGenerales.folio/estado/ciudad, etc.) que espera
   * PdfVistaComponent — igual que hace FormularioComponent.exportarPdf().
   */
  async exportarPdf(resumen: RegistroResumen): Promise<void> {
    const registro = await this.registroCompleto(resumen);
    if (!registro) return;
    const formularioTemporal = construirFormularioRegistro(this.fb, registro);
    this.snapshotParaImpresion = formularioTemporal.getRawValue();
    // Dibuja la hoja con estos datos ANTES de abrir el diálogo de impresión;
    // si no, se imprimía la hoja anterior (o en blanco la primera vez).
    this.cdr.detectChanges();
    await esperarImagenes(this.elemento.nativeElement);
    window.print();
  }

  async exportarExcel(resumen: RegistroResumen): Promise<void> {
    const registro = await this.registroCompleto(resumen);
    if (!registro) return;
    try {
      await this.excelExportador.exportar(registro);
    } catch (error) {
      console.error('No se pudo generar el Excel.', error);
      this.mensajeError = 'No se pudo generar el Excel. Recarga la página e inténtalo de nuevo.';
    }
  }

  async eliminar(registro: RegistroResumen): Promise<void> {
    const confirmado = confirm(`¿Eliminar el trámite con folio "${registro.folio || '(sin folio)'}"?`);
    if (!confirmado) return;
    this.mensajeError = '';
    try {
      await this.registroService.eliminar(registro.id);
      await this.cargar();
    } catch (error) {
      console.error('No se pudo eliminar el trámite.', error);
      this.mensajeError = 'No se pudo eliminar el trámite. Revisa tu conexión e inténtalo de nuevo.';
    }
  }
}
