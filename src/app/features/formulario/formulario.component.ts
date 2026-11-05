import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, EventEmitter, HostListener, Inject, OnDestroy, OnInit, Output, effect, inject } from '@angular/core';
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
import { SesionService } from '../../core/services/sesion.service';

/** Cuánto se espera el último registro antes de abrir uno en blanco. */
const ESPERA_ULTIMO_MS = 8000;
const ESPERA_REINTENTO_MS = 10000;
/** Se avisa antes de llegar al límite real del servidor. */
const MARGEN_LIMITE = 0.95;
const AVISO_DESCARTAR = 'Hay cambios que no se pudieron guardar y se perderán. ¿Continuar?';

/**
 * Datos de edición de un registro cargado. Un objeto por carga: un guardado en
 * cola usa los de SU registro aunque ya se haya cambiado a otro, y lee al
 * enviarse la versión que devolvió el guardado anterior.
 */
interface Edicion {
  version: number;
  edicionId: string;
}

interface Envio {
  registro: RegistroAtencionPrehospitalaria;
  edicion: Edicion;
}

@Component({
  selector: 'app-formulario',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule,
    SeccionPasoComponent, PdfVistaComponent,
  ],
  template: `
    <p class="aviso-carga" *ngIf="cargando"><mat-icon>hourglass_empty</mat-icon> Cargando…</p>

    <ng-container *ngIf="!cargando">
    <!-- Encabezado fijo del paso: número de paso, salto rápido a cualquier sección y barra de avance. -->
    <div class="encabezado-paso">
      <div class="progreso-texto">
        <span class="paso-chip">Paso {{ pasoActual + 1 }} de {{ totalPasos }}</span>
        <select class="salto-seccion" [value]="pasoActual" (change)="irAPaso(+$any($event.target).value)" aria-label="Ir a sección">
          <option *ngFor="let titulo of titulosPasos; let i = index" [value]="i">{{ titulo }}</option>
        </select>
      </div>
      <p class="registro-en-edicion" *ngIf="resumenEdicion">Editando: {{ resumenEdicion }}</p>
      <div class="barra-progreso">
        <div class="barra-progreso-relleno" [style.width.%]="((pasoActual + 1) / totalPasos) * 100"></div>
      </div>
    </div>

    <!-- Lo capturado sigue en pantalla: la persona decide qué hacer. -->
    <div class="aviso-choque" *ngIf="choque === 'conflicto'" role="alert">
      <p>Otra persona modificó este registro. Tus últimos cambios no se guardaron.</p>
      <button type="button" class="guardar-como-nuevo" mat-stroked-button (click)="guardarComoNuevo()">
        <mat-icon>save_as</mat-icon> Guardar como registro nuevo
      </button>
      <button type="button" class="recargar" mat-stroked-button (click)="recargar()">
        <mat-icon>refresh</mat-icon> Recargar
      </button>
    </div>
    <div class="aviso-choque" *ngIf="choque === 'eliminado'" role="alert">
      <p>Este registro fue eliminado. Tus últimos cambios no se guardaron.</p>
      <button type="button" class="guardar-como-nuevo" mat-stroked-button (click)="guardarComoNuevo()">
        <mat-icon>save_as</mat-icon> Guardar como registro nuevo
      </button>
    </div>
    <div class="aviso-choque" *ngIf="estadoGuardado === 'Error al guardar' && !choque" role="alert">
      <p>No se pudo guardar. Se reintentará solo; no cierres esta pantalla.</p>
    </div>
    <div class="aviso-choque" *ngIf="estadoGuardado === ESTADO_MUY_GRANDE" role="alert">
      <p>El registro es demasiado grande para el servidor. Quita o reduce algunas imágenes.</p>
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

        <span class="estado-guardado" [class.error]="hayErrorGuardado" *ngIf="estadoGuardado">
          <mat-icon>{{ hayErrorGuardado ? 'cloud_off' : (estadoGuardado === 'Guardando…' ? 'cloud_sync' : 'cloud_done') }}</mat-icon>
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
    </ng-container>
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
    .aviso-carga { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 48px 16px; margin: 0; color: var(--umam-texto-suave); }
    .registro-en-edicion { max-width: 900px; margin: 0 auto 8px; color: var(--umam-texto-suave); font-size: 0.82rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .aviso-choque {
      display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px;
      max-width: 900px; margin: 12px auto 0; padding: 10px 14px; border-radius: 10px;
      color: var(--umam-error); background: #fdecea;
    }
    .aviso-choque p { margin: 0; flex: 1; min-width: 200px; }
    .aviso-choque button { min-height: 44px; border-radius: 12px; }
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
      .encabezado-paso, .barra-acciones, .layout, .aviso-choque { display: none !important; }
      .solo-impresion { display: block !important; }
    }
  `],
})
export class FormularioComponent implements OnInit, OnDestroy {
  /** Se dispara al terminar "Enviar al Historial" — App usa esto para cambiar de vista. */
  @Output() enviarAlHistorial = new EventEmitter<void>();

  readonly ESTADO_MUY_GRANDE = 'Registro demasiado grande';

  /** Aún no se sabe qué registro mostrar; capturar ahora se perdería al cargarlo. */
  cargando = true;
  /** El servidor rechazó guardar porque el registro cambió o se eliminó. Detiene el autosave. */
  choque: '' | 'conflicto' | 'eliminado' = '';

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
  private edicion: Edicion = { version: 0, edicionId: crypto.randomUUID() };

  /** Suscripción del autosave sobre el FormGroup actual (se cancela al cambiar de registro). */
  private autosave?: Subscription;
  /** Hay cambios que todavía no se mandaron a guardar (el debounce de 1 s no ha disparado). */
  private cambiosPendientes = false;
  /**
   * Cola de guardados: se envían de uno en uno para que uno lento no termine
   * después de otro más nuevo. Cada registro ocupa un solo lugar: una foto nueva
   * reemplaza a la que no ha salido, así con mala señal no se suben fotos viejas.
   */
  private cola: Envio[] = [];
  private enviando?: Promise<boolean>;
  /** Último guardado que falló. Se conserva hasta reenviarlo o hasta que la persona lo descarte. */
  private fallido?: Envio;
  private esperaSesion = false;
  private reintento?: ReturnType<typeof setTimeout>;
  private sesion = inject(SesionService);

  constructor(
    private fb: FormBuilder,
    @Inject(REGISTRO_SERVICE) private registroService: RegistroService,
    private excelExportador: ExcelExportadorService,
    private cdr: ChangeDetectorRef,
  ) {
    this.registroActual = crearRegistroVacio();
    this.form = construirFormularioRegistro(this.fb, this.registroActual);
    effect(() => {
      if (!this.sesion.sesionVencida() && this.esperaSesion) this.reintentar();
    });
  }

  async ngOnInit(): Promise<void> {
    let temporizador: ReturnType<typeof setTimeout> | undefined;
    const limite = new Promise<undefined>(resolve => (temporizador = setTimeout(() => resolve(undefined), ESPERA_ULTIMO_MS)));
    let ultimo: RegistroAtencionPrehospitalaria | undefined;
    try {
      ultimo = await Promise.race([this.registroService.ultimo(), limite]);
    } catch (error) {
      // Sin conexión se sigue con un borrador nuevo.
      console.error('No se pudo cargar el último registro; se continúa con uno nuevo.', error);
    }
    clearTimeout(temporizador);
    if (ultimo) {
      this.cargarRegistro(ultimo);
    } else {
      this.suscribirAutosave();
    }
    this.cargando = false;
  }

  get idActual(): string {
    return this.registroActual.id;
  }

  /** Para que quede claro sobre qué paciente se está capturando. */
  get resumenEdicion(): string {
    const folio = this.form.get('datosGenerales.folio')?.value;
    const paciente = this.form.get('datosPaciente.nombreOMediaFiliacion')?.value;
    return [folio, paciente].filter(valor => typeof valor === 'string' && valor.trim()).join(' · ');
  }

  get hayErrorGuardado(): boolean {
    return ['Error al guardar', 'Sesión vencida', this.ESTADO_MUY_GRANDE].includes(this.estadoGuardado);
  }

  private get hayCambiosSinGuardar(): boolean {
    return this.cambiosPendientes || !!this.fallido || !!this.enviando || !!this.choque;
  }

  /** Al cerrar la pestaña con algo sin guardar, el navegador pide confirmación. */
  @HostListener('window:beforeunload', ['$event'])
  avisarAntesDeCerrar(evento: Event): void {
    if (this.hayCambiosSinGuardar) evento.preventDefault();
  }

  /** Empieza un registro en blanco para otro paciente. */
  async nuevoRegistro(): Promise<void> {
    if (await this.prepararCambio()) this.cargarRegistro(crearRegistroVacio());
  }

  /**
   * Antes de reemplazar lo que hay en pantalla: guarda lo pendiente y, si no se
   * pudo, pregunta. Devuelve si se puede continuar.
   */
  async prepararCambio(): Promise<boolean> {
    if (await this.guardarPendientes()) return true;
    if (!confirm(AVISO_DESCARTAR)) return false;
    this.olvidarFallido();
    return true;
  }

  /** Reemplaza el formulario por el registro dado; quien llama ya protegió lo anterior. */
  cargarRegistro(registro: RegistroAtencionPrehospitalaria): void {
    this.cambiosPendientes = false;
    this.registroActual = registro;
    this.edicion = { version: registro.version ?? 0, edicionId: crypto.randomUUID() };
    this.form = construirFormularioRegistro(this.fb, this.registroActual);
    this.estadoGuardado = '';
    this.choque = '';
    this.pasoActual = 0;
    this.suscribirAutosave();
  }

  /** Tras un choque, descarta lo de esta pantalla y trae lo que hay en el servidor. */
  async recargar(): Promise<void> {
    if (!(await this.prepararCambio())) return;
    try {
      const actualizado = await this.registroService.obtener(this.registroActual.id);
      if (actualizado) {
        this.cargarRegistro(actualizado);
      } else {
        this.choque = 'eliminado';
      }
    } catch (error) {
      console.error('No se pudo recargar el registro.', error);
      this.estadoGuardado = 'Error al guardar';
    }
  }

  /** Tras un choque, conserva lo capturado como un registro aparte. */
  guardarComoNuevo(): void {
    const nuevo = crearRegistroVacio();
    this.registroActual = { ...this.registroActual, id: nuevo.id, fechaCreacion: nuevo.fechaCreacion, version: 0, finalizado: false };
    this.edicion = { version: 0, edicionId: crypto.randomUUID() };
    this.choque = '';
    this.suscribirAutosave();
    this.guardar();
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

  /** Solo ocurre al cerrar sesión: al cambiar de pestaña el formulario sigue vivo. */
  ngOnDestroy(): void {
    this.autosave?.unsubscribe();
    clearTimeout(this.reintento);
    if (this.cambiosPendientes) this.guardar();
  }

  guardarBorrador(): void {
    this.guardar();
  }

  /** Guarda lo que falte y espera a que termine. Devuelve si todo quedó guardado. */
  async guardarPendientes(): Promise<boolean> {
    if (this.choque) return false;
    if (this.fallido) {
      this.reintentar();
    } else if (this.cambiosPendientes) {
      this.guardar();
    }
    await this.enviando;
    return !this.fallido && !this.choque;
  }

  /** Toma la foto del formulario en este momento y la pone en la cola. Devuelve si se guardó. */
  private guardar(): Promise<boolean> {
    if (this.choque) return Promise.resolve(false);
    if (this.fallido?.edicion === this.edicion) this.olvidarFallido();
    this.cambiosPendientes = false;
    this.estadoGuardado = 'Guardando…';
    this.encolar({ registro: this.construirRegistroDesdeFormulario(), edicion: this.edicion });
    return this.procesarCola();
  }

  private encolar(envio: Envio): void {
    this.cola = this.cola.filter(otro => otro.edicion !== envio.edicion);
    this.cola.push(envio);
  }

  private procesarCola(): Promise<boolean> {
    this.enviando ??= (async () => {
      let guardado = true;
      while (this.cola.length > 0) {
        guardado = await this.enviar(this.cola.shift()!);
      }
      this.enviando = undefined;
      return guardado;
    })();
    return this.enviando;
  }

  private async enviar(envio: Envio): Promise<boolean> {
    const { registro, edicion } = envio;
    const cuerpo = { ...registro, version: edicion.version, edicionId: edicion.edicionId };
    if (this.rebasaLimite(cuerpo)) {
      this.atenderErrorDeGuardado(new HttpErrorResponse({ status: 413 }), envio);
      return false;
    }
    try {
      const { version } = await this.registroService.guardar(cuerpo);
      edicion.version = version;
      if (edicion === this.edicion) {
        this.estadoGuardado = `Guardado ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      }
      return true;
    } catch (error) {
      console.error('Error al guardar el borrador', error);
      this.atenderErrorDeGuardado(error, envio);
      return false;
    }
  }

  /**
   * Mide lo que realmente viajaría: el JSON ya serializado en bytes, con las
   * imágenes en base64. Solo sirve para avisar sin gastar datos; quien decide
   * es el servidor. También evita el aviso que PHP imprime antes de nuestro
   * código cuando se rebasa post_max_size, que dañaría la respuesta.
   */
  private rebasaLimite(cuerpo: RegistroAtencionPrehospitalaria): boolean {
    const limite = this.sesion.usuario()?.limiteBytes;
    return !!limite && new Blob([JSON.stringify(cuerpo)]).size > limite * MARGEN_LIMITE;
  }

  private atenderErrorDeGuardado(error: unknown, envio: Envio): void {
    const estado = error instanceof HttpErrorResponse ? error.status : 0;
    const esActual = envio.edicion === this.edicion;
    if (estado === 409) {
      // Un choque de un guardado del registro anterior no afecta al que está en pantalla.
      if (esActual) {
        this.choque = (error as HttpErrorResponse).error?.codigo === 'eliminado' ? 'eliminado' : 'conflicto';
        this.autosave?.unsubscribe();
        this.cambiosPendientes = false;
        this.estadoGuardado = 'Error al guardar';
      }
      return;
    }
    // Si ya hay una foto más nueva de este registro en la cola, esta sobra.
    if (this.cola.some(otro => otro.edicion === envio.edicion)) return;
    this.fallido = envio;
    if (estado === 401) {
      this.esperaSesion = true;
      this.estadoGuardado = 'Sesión vencida';
    } else if (estado === 413) {
      this.estadoGuardado = this.ESTADO_MUY_GRANDE;
    } else {
      this.estadoGuardado = 'Error al guardar';
      this.reintento = setTimeout(() => this.reintentar(), ESPERA_REINTENTO_MS);
    }
  }

  private olvidarFallido(): Envio | undefined {
    const envio = this.fallido;
    this.fallido = undefined;
    this.esperaSesion = false;
    clearTimeout(this.reintento);
    return envio;
  }

  private reintentar(): void {
    const envio = this.olvidarFallido();
    if (!envio) return;
    this.estadoGuardado = 'Guardando…';
    this.encolar(envio);
    this.procesarCola();
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
    this.registroActual = { ...this.registroActual, finalizado: true };
    if (!(await this.guardar())) {
      this.registroActual = { ...this.registroActual, finalizado: false };
      return;
    }
    this.exportarPdf();
    // Este paciente terminó: lo siguiente que se capture no debe caer sobre él.
    this.cargarRegistro(crearRegistroVacio());
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
