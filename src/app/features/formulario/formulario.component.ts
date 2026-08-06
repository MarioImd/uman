import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { debounceTime } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { SeccionAcordeonComponent } from '../../shared/seccion-acordeon/seccion-acordeon.component';
import { MaterialUtilizadoComponent } from '../material-utilizado/material-utilizado.component';
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
    SeccionAcordeonComponent, MaterialUtilizadoComponent, PdfVistaComponent,
  ],
  template: `
    <mat-toolbar class="encabezado">
      <span>UMAM — Registro de Atención Prehospitalaria</span>
    </mat-toolbar>

    <div class="layout" [formGroup]="form">
      <nav class="nav-lateral">
        <a *ngFor="let seccion of secciones" [href]="'#seccion-' + seccion.clave">{{ seccion.titulo }}</a>
        <a href="#seccion-materialUtilizado">Material Utilizado</a>
      </nav>

      <main class="contenido">
        <app-seccion-acordeon
          *ngFor="let seccion of secciones"
          [seccion]="seccion"
          [grupo]="grupoDeSeccion(seccion.clave)"
        ></app-seccion-acordeon>

        <div id="seccion-materialUtilizado" class="panel-material">
          <h3>Material Utilizado</h3>
          <app-material-utilizado [grupo]="grupoMaterialUtilizado()"></app-material-utilizado>
        </div>
      </main>
    </div>

    <div class="barra-acciones">
      <button type="button" class="guardar-borrador" mat-raised-button color="primary" (click)="guardarBorrador()">
        <mat-icon>save</mat-icon> Guardar borrador
      </button>
      <button type="button" class="exportar-pdf" mat-stroked-button (click)="exportarPdf()">
        <mat-icon>picture_as_pdf</mat-icon> Exportar PDF
      </button>
      <button type="button" class="exportar-excel" mat-stroked-button (click)="exportarExcel()">
        <mat-icon>grid_on</mat-icon> Exportar Excel
      </button>
      <button type="button" class="nuevo-registro" mat-stroked-button (click)="nuevoRegistro()">
        <mat-icon>add</mat-icon> Nuevo registro
      </button>
      <span class="estado-guardado" [class.error]="estadoGuardado === 'Error al guardar'">{{ estadoGuardado }}</span>
    </div>

    <div class="solo-impresion">
      <app-pdf-vista [registro]="snapshotParaImpresion"></app-pdf-vista>
    </div>
  `,
  styles: [`
    .encabezado { background: var(--umam-header-bg, #1892d3); color: var(--umam-header-fg, #fff); }
    .layout { display: flex; gap: 16px; padding: 16px; }
    .nav-lateral { position: sticky; top: 16px; align-self: flex-start; display: flex; flex-direction: column; gap: 4px; min-width: 220px; max-height: 90vh; overflow-y: auto; }
    .nav-lateral a { color: var(--umam-header-bg, #1892d3); text-decoration: none; font-size: 0.9rem; }
    .contenido { flex: 1; min-width: 0; }
    .barra-acciones { position: sticky; bottom: 0; display: flex; align-items: center; gap: 8px; padding: 12px 16px; background: white; border-top: 1px solid var(--umam-section-border, #b9def2); }
    .estado-guardado { margin-left: auto; font-size: 0.85rem; color: #555; }
    .estado-guardado.error { color: #c0392b; font-weight: 600; }
    @media (max-width: 720px) {
      .layout { flex-direction: column; }
      .nav-lateral { position: static; flex-direction: row; flex-wrap: wrap; max-height: none; }
    }
    .solo-impresion { display: none; }
    @media print {
      .encabezado, .nav-lateral, .barra-acciones, .contenido { display: none !important; }
      .solo-impresion { display: block !important; }
    }
  `],
})
export class FormularioComponent implements OnInit {
  secciones = SECCIONES;
  form: FormGroup;
  estadoGuardado = '';
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
    this.registroActual = crearRegistroVacio();
    this.form = construirFormularioRegistro(this.fb, this.registroActual);
    this.estadoGuardado = '';
    this.suscribirAutosave();
  }

  private suscribirAutosave(): void {
    this.form.valueChanges.pipe(debounceTime(1000)).subscribe(() => this.guardarBorrador());
  }

  guardarBorrador(): void {
    const registro = this.construirRegistroDesdeFormulario();
    this.registroService.guardar(registro)
      .then(() => {
        this.estadoGuardado = `Guardado ${new Date().toLocaleTimeString()}`;
      })
      .catch((error) => {
        console.error('Error al guardar el borrador', error);
        this.estadoGuardado = 'Error al guardar';
      });
  }

  exportarPdf(): void {
    this.snapshotParaImpresion = this.form.getRawValue();
    window.print();
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

  grupoMaterialUtilizado(): FormGroup {
    return this.form.get('materialUtilizado') as FormGroup;
  }
}
