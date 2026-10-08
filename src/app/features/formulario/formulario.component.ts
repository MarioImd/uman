import { ChangeDetectorRef, Component, EventEmitter, Inject, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subscription, debounceTime, tap } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
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
    CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule,
    SeccionPasoComponent, PdfVistaComponent,
  ],
  template: `
    <!-- Encabezado fijo del paso: número de paso, salto rápido a cualquier sección y barra de avance. -->
    <div class="encabezado-paso">
      <div class="progreso-texto">
        <span class="paso-chip">Paso {{ pasoActual + 1 }} de {{ totalPasos }}</span>
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

    <!-- Barra inferior fija: navegación entre pasos, acciones y estado del autoguardado. -->
    <div class="barra-acciones">
      <div class="barra-interior">
        <button type="button" class="paso-anterior" mat-stroked-button [disabled]="pasoActual === 0" (click)="retroceder()">
          <mat-icon>arrow_back</mat-icon> <span class="texto-boton">Anterior</span>
        </button>
        <button *ngIf="pasoActual < totalPasos - 1" type="button" class="paso-siguiente" mat-flat-button (click)="avanzar()">
          Siguiente <mat-icon iconPositionEnd>arrow_forward</mat-icon>
        </button>
        <button *ngIf="pasoActual === totalPasos - 1" type="button" class="enviar-historial" mat-flat-button (click)="enviarYVerHistorial()">
          Enviar al Historial <mat-icon iconPositionEnd>send</mat-icon>
        </button>

        <span class="estado-guardado" [class.error]="estadoGuardado === 'Error al guardar'" *ngIf="estadoGuardado">
          <mat-icon>{{ estadoGuardado === 'Error al guardar' ? 'cloud_off' : (estadoGuardado === 'Guardando…' ? 'cloud_sync' : 'cloud_done') }}</mat-icon>
          {{ estadoGuardado }}
        </span>
        <span class="separador"></span>

        <button type="button" class="guardar-borrador" mat-icon-button (click)="guardarBorrador()" aria-label="Guardar borrador" title="Guardar borrador">
          <mat-icon>save</mat-icon>
        </button>
        <button type="button" class="exportar-excel" mat-icon-button (click)="exportarExcel()" aria-label="Exportar Excel" title="Exportar Excel">
          <mat-icon>grid_on</mat-icon>
        </button>
        <button type="button" class="nuevo-registro" mat-icon-button (click)="nuevoRegistro()" aria-label="Nuevo registro" title="Nuevo registro">
          <mat-icon>note_add</mat-icon>
        </button>
      </div>
    </div>

    <div class="solo-impresion">
      <app-pdf-vista [registro]="snapshotParaImpresion"></app-pdf-vista>
    </div>
  `,
  styles: [`
    .encabezado-paso {
      position: sticky; top: 0; z-index: 5;
      background: rgba(255, 255, 255, 0.96); backdrop-filter: blur(6px);
      padding: 10px 16px 0; box-shadow: var(--umam-sombra-suave);
    }
    .progreso-texto { display: flex; align-items: center; gap: 12px; max-width: 900px; margin: 0 auto 10px; }
    .paso-chip {
      flex: none; padding: 6px 12px; border-radius: 999px;
      background: var(--umam-section-bg); color: var(--umam-header-oscuro);
      font-weight: 700; font-size: 0.85rem; white-space: nowrap;
    }
    .salto-seccion {
      flex: 1; min-width: 0; min-height: 40px; padding: 4px 10px;
      border: 1px solid var(--umam-section-border); border-radius: 10px;
      font: inherit; font-size: 0.92rem; color: var(--umam-texto-fuerte); background: #fff; cursor: pointer;
    }
    .barra-progreso { height: 4px; background: var(--umam-section-bg); overflow: hidden; margin: 0 -16px; }
    .barra-progreso-relleno {
      height: 100%; background: linear-gradient(90deg, var(--umam-header-bg), var(--umam-header-oscuro));
      transition: width 0.25s ease;
    }
    .layout { padding: 20px 16px 104px; }
    .contenido { max-width: 900px; margin: 0 auto; }
    .barra-acciones {
      position: fixed; bottom: 0; left: 0; right: 0; z-index: 5;
      background: #fff; box-shadow: 0 -4px 16px rgba(16, 42, 67, 0.08);
      padding: 10px 16px calc(10px + env(safe-area-inset-bottom));
    }
    .barra-interior { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; max-width: 900px; margin: 0 auto; }
    .paso-anterior, .paso-siguiente, .enviar-historial { min-height: 44px; border-radius: 12px; }
    /* Botón principal en azul marino del logo (el azul primario de Material se veía muy brillante). */
    .paso-siguiente, .enviar-historial {
      min-width: 140px;
      --mat-button-filled-container-color: var(--umam-azul-marino);
      --mat-button-filled-label-text-color: #fff;
    }
    .separador { flex: 1; }
    .estado-guardado { display: inline-flex; align-items: center; gap: 4px; font-size: 0.8rem; color: var(--umam-exito); }
    .estado-guardado mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .estado-guardado.error { color: var(--umam-error); font-weight: 600; }
    .solo-impresion { display: none; }
    /* Celular: todo en un solo renglón — "Anterior" queda solo con la flecha,
       "Siguiente" ocupa el espacio libre y el estado de guardado queda como ícono. */
    @media (max-width: 520px) {
      .barra-interior { flex-wrap: nowrap; gap: 4px; }
      .paso-anterior { min-width: 48px; padding: 0 8px; }
      .paso-anterior .texto-boton { display: none; }
      .paso-siguiente, .enviar-historial { flex: 1; min-width: 0; }
      .separador { display: none; }
      .estado-guardado { font-size: 0; } /* solo el ícono de nube (verde = guardado, rojo = error) */
    }
    @media print {
      .encabezado-paso, .barra-acciones, .layout { display: none !important; }
      .solo-impresion { display: block !important; }
    }
  `],
})
export class FormularioComponent implements OnInit, OnDestroy {
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

  /** Suscripción del autosave sobre el FormGroup actual (se cancela al cambiar de registro). */
  private autosave?: Subscription;
  /** Hay cambios que todavía no se mandaron a guardar (el debounce de 1 s no ha disparado). */
  private cambiosPendientes = false;
  /**
   * Cola de guardados: cada PUT espera a que termine el anterior. Sin esto, un
   * guardado lento (p. ej. con fotos) podía terminar DESPUÉS de uno más nuevo y
   * dejar en el servidor una versión vieja del registro.
   */
  private colaGuardado: Promise<void> = Promise.resolve();
  private guardadosEnCurso = 0;

  constructor(
    private fb: FormBuilder,
    @Inject(REGISTRO_SERVICE) private registroService: RegistroService,
    private excelExportador: ExcelExportadorService,
    private cdr: ChangeDetectorRef,
  ) {
    this.registroActual = crearRegistroVacio();
    this.form = construirFormularioRegistro(this.fb, this.registroActual);
  }

  async ngOnInit(): Promise<void> {
    // Se abrió un trámite puntual desde el Historial: se usa ese registro tal
    // cual, sin dejar que la carga de "el más reciente" de abajo lo pise.
    // Se pide la versión más reciente al servidor: el objeto que trae el
    // Historial puede ser una copia vieja (p. ej. si se editó, se fue al
    // Historial y se volvió con la pestaña "Formulario").
    if (this.registroInicial) {
      let actualizado: RegistroAtencionPrehospitalaria | undefined;
      try {
        actualizado = await this.registroService.obtener(this.registroInicial.id);
      } catch {
        // Sin conexión: se usa la copia que trajo el Historial.
      }
      this.cargarRegistro(actualizado ?? this.registroInicial);
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
    // Si el registro anterior tenía cambios esperando el autosave (escritos en
    // el último segundo), se guardan antes de reemplazar el formulario; antes
    // se perdían al tocar "Nuevo registro" justo después de escribir.
    if (this.cambiosPendientes) this.guardar();
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

  /**
   * Autoguardado: marca que hay cambios en cuanto se escribe y guarda 1 s
   * después del último cambio. Cancela la suscripción del formulario anterior
   * para que un debounce viejo no dispare sobre el registro nuevo.
   */
  private suscribirAutosave(): void {
    this.autosave?.unsubscribe();
    this.autosave = this.form.valueChanges
      .pipe(tap(() => (this.cambiosPendientes = true)), debounceTime(1000))
      .subscribe(() => this.guardarBorrador());
  }

  /** Al salir del formulario (cambio a Historial) se guarda lo que esté pendiente. */
  ngOnDestroy(): void {
    this.autosave?.unsubscribe();
    if (this.cambiosPendientes) this.guardar();
  }

  guardarBorrador(): void {
    this.guardar();
  }

  /**
   * Toma la foto del formulario EN ESTE MOMENTO (sincrónico, antes de
   * cualquier cambio de registro) y la encola para enviarse al servidor.
   */
  private guardar(): Promise<void> {
    const registro = this.construirRegistroDesdeFormulario();
    this.cambiosPendientes = false;
    this.estadoGuardado = 'Guardando…';
    const enviar = async () => {
      try {
        await this.registroService.guardar(registro);
        this.estadoGuardado = `Guardado ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      } catch (error) {
        console.error('Error al guardar el borrador', error);
        this.estadoGuardado = 'Error al guardar';
      } finally {
        this.guardadosEnCurso--;
      }
    };
    // Si no hay nada guardándose se envía ya mismo; si no, espera su turno.
    this.colaGuardado = this.guardadosEnCurso === 0 ? enviar() : this.colaGuardado.then(enviar);
    this.guardadosEnCurso++;
    return this.colaGuardado;
  }

  exportarPdf(): void {
    this.snapshotParaImpresion = this.form.getRawValue();
    // Dibuja la hoja con estos datos ANTES de abrir el diálogo de impresión;
    // si no, se imprimía la hoja anterior (o en blanco la primera vez).
    this.cdr.detectChanges();
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
