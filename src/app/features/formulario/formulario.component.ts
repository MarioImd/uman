import { Component, EventEmitter, Inject, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { debounceTime } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { SeccionPasoComponent } from '../../shared/seccion-paso/seccion-paso.component';
import { PdfVistaComponent } from '../exportacion/pdf-vista/pdf-vista.component';
import { ExcelExportadorService } from '../exportacion/excel-exportador.service';
import { SECCIONES } from '../../core/data/secciones.data';
import { construirFormularioRegistro } from '../../core/forms/construir-formulario';
import { crearRegistroVacio, RegistroAtencionPrehospitalaria } from '../../core/models/registro.model';
import { REGISTRO_SERVICE, RegistroService } from '../../core/services/registro.service';

@Component({
  selector: 'app-formulario',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule, MatToolbarModule,
    SeccionPasoComponent, PdfVistaComponent,
  ],
  template: `
    <mat-toolbar class="encabezado">
      <span>UMAM — Registro de Atención Prehospitalaria</span>
    </mat-toolbar>

    <div class="encabezado-paso">
      <div class="progreso-texto">
        <span>Paso {{ pasoActual + 1 }} de {{ totalPasos }}</span>
        <select class="salto-seccion" [value]="pasoActual" (change)="irAPaso(+$any($event.target).value)" aria-label="Ir a sección">
          <option *ngFor="let titulo of titulosPasos; let i = index" [value]="i">{{ titulo }}</option>
        </select>
      </div>
      <div class="barra-progreso">
        <div class="barra-progreso-relleno" [style.width.%]="((pasoActual + 1) / totalPasos) * 100"></div>
      </div>
    </div>

    <div class="layout" [formGroup]="form">
      <main class="contenido">
        <app-seccion-paso
          [seccion]="secciones[pasoActual]"
          [grupo]="grupoDeSeccion(secciones[pasoActual].clave)"
        ></app-seccion-paso>
      </main>
    </div>

    <div class="barra-acciones">
      <button type="button" class="paso-anterior" mat-stroked-button [disabled]="pasoActual === 0" (click)="retroceder()">
        <mat-icon>arrow_back</mat-icon> Anterior
      </button>
      <button *ngIf="pasoActual < totalPasos - 1" type="button" class="paso-siguiente" mat-raised-button color="primary" (click)="avanzar()">
        Siguiente <mat-icon>arrow_forward</mat-icon>
      </button>
      <button *ngIf="pasoActual === totalPasos - 1" type="button" class="enviar-historial" mat-raised-button color="primary" (click)="enviarYVerHistorial()">
        Enviar al Historial <mat-icon>send</mat-icon>
      </button>
      <span class="separador"></span>
      <button type="button" class="guardar-borrador" mat-icon-button (click)="guardarBorrador()" aria-label="Guardar borrador" title="Guardar borrador">
        <mat-icon>save</mat-icon>
      </button>
      <button type="button" class="exportar-pdf" mat-icon-button (click)="exportarPdf()" aria-label="Exportar PDF" title="Exportar PDF">
        <mat-icon>picture_as_pdf</mat-icon>
      </button>
      <button type="button" class="exportar-excel" mat-icon-button (click)="exportarExcel()" aria-label="Exportar Excel" title="Exportar Excel">
        <mat-icon>grid_on</mat-icon>
      </button>
      <button type="button" class="nuevo-registro" mat-icon-button (click)="nuevoRegistro()" aria-label="Nuevo registro" title="Nuevo registro">
        <mat-icon>add</mat-icon>
      </button>
      <span class="estado-guardado" [class.error]="estadoGuardado === 'Error al guardar'">{{ estadoGuardado }}</span>
    </div>

    <div class="solo-impresion">
      <app-pdf-vista [registro]="snapshotParaImpresion"></app-pdf-vista>
    </div>
  `,
  styles: [`
    .encabezado { background: var(--umam-header-bg, #1892d3); color: var(--umam-header-fg, #fff); }
    .encabezado-paso { position: sticky; top: 0; z-index: 5; background: #fff; padding: 10px 16px 0; border-bottom: 1px solid var(--umam-section-border, #b9def2); }
    .progreso-texto { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
    .progreso-texto > span { font-weight: 600; color: var(--umam-header-bg, #1892d3); white-space: nowrap; }
    .salto-seccion { flex: 1; min-width: 0; max-width: 340px; min-height: 40px; padding: 4px 8px; border: 1px solid var(--umam-section-border, #b9def2); border-radius: 8px; font-size: 0.9rem; color: #333; background: #fff; }
    .barra-progreso { height: 4px; background: var(--umam-section-bg, #dbeef9); border-radius: 2px 2px 0 0; overflow: hidden; }
    .barra-progreso-relleno { height: 100%; background: var(--umam-header-bg, #1892d3); transition: width 0.2s; }
    .layout { padding: 16px; padding-bottom: 88px; }
    .contenido { max-width: 900px; margin: 0 auto; }
    .barra-acciones { position: fixed; bottom: 0; left: 0; right: 0; z-index: 5; display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: white; border-top: 1px solid var(--umam-section-border, #b9def2); }
    .paso-siguiente, .enviar-historial { min-width: 130px; }
    .separador { flex: 1; }
    .estado-guardado { font-size: 0.8rem; color: #555; }
    .estado-guardado.error { color: #c0392b; font-weight: 600; }
    .solo-impresion { display: none; }
    @media print {
      .encabezado, .encabezado-paso, .barra-acciones, .layout { display: none !important; }
      .solo-impresion { display: block !important; }
    }
  `],
})
export class FormularioComponent implements OnInit {
  /**
   * Cuando App abre un trámite desde el Historial, lo pasa aquí en vez de dejar
   * que ngOnInit cargue "el más reciente" de localStorage — ver ngOnInit.
   */
  @Input() registroInicial?: RegistroAtencionPrehospitalaria;

  /** Se dispara al terminar "Enviar al Historial" — App usa esto para cambiar de vista. */
  @Output() enviarAlHistorial = new EventEmitter<void>();

  secciones = SECCIONES;
  form: FormGroup;
  estadoGuardado = '';
  pasoActual = 0;
  totalPasos = SECCIONES.length;
  titulosPasos = SECCIONES.map(s => s.titulo);
  /**
   * Foto del formulario tomada justo antes de imprimir. La vista de impresión
   * solo importa en el instante de exportar/imprimir, así que evitamos leer
   * form.getRawValue() (recorre las ~600 controles del formulario) en cada
   * ciclo de detección de cambios vía binding directo en la plantilla —
   * costoso y constante en una app cuya prioridad #1 es la velocidad de
   * captura en celular.
   */
  snapshotParaImpresion: Record<string, unknown> | undefined;
  private registroActual: RegistroAtencionPrehospitalaria;

  constructor(
    private fb: FormBuilder,
    @Inject(REGISTRO_SERVICE) private registroService: RegistroService,
    private excelExportador: ExcelExportadorService,
  ) {
    this.registroActual = crearRegistroVacio();
    this.form = construirFormularioRegistro(this.fb, this.registroActual);
  }

  async ngOnInit(): Promise<void> {
    // Se abrió un trámite puntual desde el Historial: se usa ese registro tal
    // cual, sin dejar que la carga de "el más reciente" de abajo lo pise.
    if (this.registroInicial) {
      this.cargarRegistro(this.registroInicial);
      return;
    }
    try {
      const existentes = await this.registroService.listar();
      // Solo reemplazamos this.form por el registro cargado si el usuario no ha
      // empezado a editar el formulario inicial (vacío) durante esta espera asíncrona.
      // Si ya está "dirty", el usuario ya escribió algo mientras listar() resolvía;
      // sobrescribir this.form aquí perdería esa edición en curso, así que la
      // conservamos y omitimos la recarga en vez de arriesgar pérdida de datos.
      if (existentes.length > 0 && !this.form.dirty) {
        this.registroActual = existentes[existentes.length - 1];
        this.form = construirFormularioRegistro(this.fb, this.registroActual);
      }
    } catch (error) {
      // Si listar() rechaza (p. ej. localStorage corrupto), seguimos con el
      // borrador vacío en vez de dejar que el error se propague — lo importante
      // es que el autosave de abajo (finally) siempre termine suscrito, sin
      // importar si la carga del borrador existente tuvo éxito o no.
      console.error('No se pudieron cargar los registros guardados; se continúa con un borrador nuevo.', error);
    } finally {
      this.suscribirAutosave();
    }
  }

  /**
   * Empieza un registro nuevo desde cero: formulario en blanco, un id nuevo,
   * y el autosave vuelto a suscribir sobre el formulario nuevo (la suscripción
   * anterior queda apuntando al FormGroup viejo, que ya no recibe entradas del
   * usuario una vez que [formGroup] en la plantilla pasa a apuntar aquí).
   * Así la app puede usarse para un segundo paciente sin tener que limpiar
   * localStorage a mano.
   */
  nuevoRegistro(): void {
    this.cargarRegistro(crearRegistroVacio());
  }

  /**
   * Reemplaza el formulario en edición por el registro dado — mismo mecanismo
   * que "Nuevo registro" (id nuevo o no, formulario reconstruido desde cero,
   * autosave vuelto a suscribir sobre el FormGroup nuevo), usado también para
   * abrir un trámite puntual desde el Historial.
   */
  cargarRegistro(registro: RegistroAtencionPrehospitalaria): void {
    this.registroActual = registro;
    this.form = construirFormularioRegistro(this.fb, this.registroActual);
    this.estadoGuardado = '';
    this.pasoActual = 0;
    this.suscribirAutosave();
  }

  avanzar(): void {
    this.irAPaso(this.pasoActual + 1);
  }

  retroceder(): void {
    this.irAPaso(this.pasoActual - 1);
  }

  irAPaso(paso: number): void {
    if (paso < 0 || paso > this.totalPasos - 1) return;
    this.pasoActual = paso;
    window.scrollTo(0, 0);
  }

  private suscribirAutosave(): void {
    this.form.valueChanges.pipe(debounceTime(1000)).subscribe(() => this.guardarBorrador());
  }

  guardarBorrador(): void {
    this.guardar();
  }

  private async guardar(): Promise<void> {
    const registro = this.construirRegistroDesdeFormulario();
    try {
      await this.registroService.guardar(registro);
      this.estadoGuardado = `Guardado ${new Date().toLocaleTimeString()}`;
    } catch (error) {
      console.error('Error al guardar el borrador', error);
      this.estadoGuardado = 'Error al guardar';
    }
  }

  exportarPdf(): void {
    this.snapshotParaImpresion = this.form.getRawValue();
    window.print();
  }

  /**
   * Botón del último paso del wizard: guarda el trámite, dispara la descarga
   * del PDF (mismo window.print() de "Exportar PDF" — el usuario elige
   * "Guardar como PDF" en el diálogo del navegador, igual que en el resto de
   * la app) y le avisa a App que muestre el Historial, donde el trámite
   * recién guardado ya va a aparecer.
   */
  async enviarYVerHistorial(): Promise<void> {
    await this.guardar();
    this.exportarPdf();
    this.enviarAlHistorial.emit();
  }

  exportarExcel(): void {
    const registro = this.construirRegistroDesdeFormulario();
    this.excelExportador.exportar(registro);
  }

  /**
   * Combina el valor crudo del formulario con el registro base para persistir/exportar.
   * folio/estado/ciudad viven como campos planos en la raíz de RegistroAtencionPrehospitalaria
   * (para mantener simple la forma almacenada por RegistroService), pero en el formulario/UI
   * están anidados bajo la sección 'datosGenerales' (para que el acordeón y los exportadores
   * los traten como una sección más) — así que los mapeamos de vuelta explícitamente aquí.
   */
  private construirRegistroDesdeFormulario(): RegistroAtencionPrehospitalaria {
    const valor = this.form.getRawValue();
    const datosGenerales = valor.datosGenerales ?? {};
    return {
      ...this.registroActual,
      ...valor,
      folio: datosGenerales.folio ?? '',
      estado: datosGenerales.estado ?? '',
      ciudad: datosGenerales.ciudad ?? '',
    };
  }

  grupoDeSeccion(clave: string): FormGroup {
    return this.form.get(clave) as FormGroup;
  }
}
