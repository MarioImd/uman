import { Component, ElementRef, Input, OnDestroy, ViewChild } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatTimepickerModule } from '@angular/material/timepicker';
import { CampoFormulario } from '../../core/models/campo-formulario.model';

/** 'YYYY-MM-DD' (el mismo formato que ya guardaba <input type="date">) -> Date local, o null. */
function textoAFecha(valor: unknown): Date | null {
  if (typeof valor !== 'string' || !valor) return null;
  const [anio, mes, dia] = valor.split('-').map(Number);
  if (!anio || !mes || !dia) return null;
  return new Date(anio, mes - 1, dia);
}

/** Date -> 'YYYY-MM-DD' local (evita el corrimiento de día de toISOString() en huso horario negativo). */
function fechaATexto(fecha: Date | null): string {
  if (!fecha) return '';
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

/** 'HH:mm' (el mismo formato que ya guardaba <input type="time">) -> Date de referencia, o null. */
function textoAHora(valor: unknown): Date | null {
  if (typeof valor !== 'string' || !valor) return null;
  const [horas, minutos] = valor.split(':').map(Number);
  if (Number.isNaN(horas) || Number.isNaN(minutos)) return null;
  const fecha = new Date(2000, 0, 1);
  fecha.setHours(horas, minutos, 0, 0);
  return fecha;
}

/** Date -> 'HH:mm'. */
function horaATexto(fecha: Date | null): string {
  if (!fecha) return '';
  const horas = String(fecha.getHours()).padStart(2, '0');
  const minutos = String(fecha.getMinutes()).padStart(2, '0');
  return `${horas}:${minutos}`;
}

@Component({
  selector: 'app-campo-formulario',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatDatepickerModule, MatTimepickerModule,
  ],
  template: `
    <div class="campo" [ngSwitch]="campo.tipo">

      <mat-form-field *ngSwitchCase="'texto'" appearance="outline" class="campo-ancho-completo">
        <mat-label>{{ campo.etiqueta }}</mat-label>
        <input matInput type="text" [formControl]="control" />
      </mat-form-field>

      <mat-form-field *ngSwitchCase="'numero'" appearance="outline" class="campo-ancho-medio">
        <mat-label>{{ campo.etiqueta }}</mat-label>
        <input matInput type="number" inputmode="decimal" [formControl]="control" />
        <span matTextSuffix *ngIf="campo.sufijo">{{ campo.sufijo }}</span>
      </mat-form-field>

      <mat-form-field *ngSwitchCase="'fecha'" appearance="outline" class="campo-ancho-medio">
        <mat-label>{{ campo.etiqueta }}</mat-label>
        <input matInput [matDatepicker]="selectorFecha" [formControl]="controlFechaHora" />
        <mat-datepicker-toggle matIconSuffix [for]="selectorFecha"></mat-datepicker-toggle>
        <mat-datepicker #selectorFecha></mat-datepicker>
      </mat-form-field>

      <mat-form-field *ngSwitchCase="'hora'" appearance="outline" class="campo-ancho-medio">
        <mat-label>{{ campo.etiqueta }}</mat-label>
        <input matInput [matTimepicker]="selectorHora" [formControl]="controlFechaHora" />
        <mat-timepicker-toggle matIconSuffix [for]="selectorHora"></mat-timepicker-toggle>
        <mat-timepicker #selectorHora interval="5m"></mat-timepicker>
      </mat-form-field>

      <mat-form-field *ngSwitchCase="'textarea'" appearance="outline" class="campo-ancho-completo">
        <mat-label>{{ campo.etiqueta }}</mat-label>
        <textarea matInput rows="3" [formControl]="control"></textarea>
      </mat-form-field>

      <button
        *ngSwitchCase="'checkbox'"
        type="button"
        class="chip"
        [class.chip-activo]="control.value === true"
        (click)="alternarBooleano()">
        {{ campo.etiqueta }}
      </button>

      <div *ngSwitchCase="'checkbox-grupo'" class="grupo-opciones">
        <span class="grupo-titulo">{{ campo.etiqueta }}</span>
        <div class="chips">
          <button
            *ngFor="let opcion of campo.opciones"
            type="button"
            class="chip"
            [class.chip-activo]="estaMarcada(opcion)"
            (click)="alternarOpcion(opcion)">
            {{ opcion }}
          </button>
        </div>
      </div>

      <div *ngSwitchCase="'radio-grupo'" class="grupo-opciones">
        <span class="grupo-titulo">{{ campo.etiqueta }}</span>
        <div class="chips">
          <button
            *ngFor="let opcion of campo.opciones"
            type="button"
            class="chip"
            [class.chip-activo]="control.value === opcion"
            (click)="seleccionarRadio(opcion)">
            {{ opcion }}
          </button>
        </div>
      </div>

      <mat-form-field *ngSwitchCase="'select'" appearance="outline" class="campo-ancho-medio">
        <mat-label>{{ campo.etiqueta }}</mat-label>
        <mat-select [formControl]="control">
          <mat-option *ngFor="let opcion of campo.opciones" [value]="opcion">{{ opcion }}</mat-option>
        </mat-select>
      </mat-form-field>

      <div *ngSwitchCase="'imagenes'" class="grupo-imagenes">
        <span class="grupo-titulo">{{ campo.etiqueta }}</span>
        <div class="miniaturas" *ngIf="imagenes().length > 0">
          <div class="miniatura" *ngFor="let imagen of imagenes(); let i = index">
            <img [src]="imagen" alt="" />
            <button type="button" class="quitar-imagen" (click)="quitarImagen(i)" aria-label="Quitar imagen">✕</button>
          </div>
        </div>
        <!-- Vista previa en vivo de la cámara mientras está activa. -->
        <div class="camara" *ngIf="mostrandoCamara">
          <video #videoCamara autoplay playsinline muted></video>
          <div class="camara-acciones">
            <button type="button" class="chip chip-activo" (click)="capturarFoto()">📸 Capturar</button>
            <button type="button" class="chip" (click)="cerrarCamara()">Cancelar</button>
          </div>
        </div>

        <p class="error-camara" *ngIf="errorCamara">{{ errorCamara }}</p>

        <div class="acciones-imagenes" *ngIf="!mostrandoCamara">
          <button type="button" class="chip" (click)="abrirCamara()">📷 Tomar foto</button>
          <button type="button" class="chip" (click)="entradaArchivo.click()">🖼️ Subir imagen</button>
        </div>
        <!--
          "Tomar foto" activa la cámara del dispositivo en vivo (getUserMedia)
          en vez de delegar al selector nativo del sistema operativo — así el
          usuario ve la vista previa y decide cuándo capturar sin salir de la
          app. Si el navegador no soporta getUserMedia (o el contexto no es
          seguro: ni HTTPS ni localhost), abrirCamara() recae en este input
          oculto con "capture", que en celular sigue abriendo la cámara nativa.
          El de subir archivo es independiente (galería/archivos, admite
          varias imágenes a la vez).
        -->
        <input #entradaCamaraFallback type="file" accept="image/*" capture="environment" hidden (change)="agregarImagenes($event)" />
        <input #entradaArchivo type="file" accept="image/*" multiple hidden (change)="agregarImagenes($event)" />
      </div>

    </div>
  `,
  styles: [`
    .campo { margin-bottom: 4px; }
    .campo-ancho-completo, .campo-ancho-medio { width: 100%; }
    .grupo-opciones { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }
    .grupo-titulo { font-weight: 600; font-size: 0.85rem; color: var(--umam-header-bg, #1892d3); text-transform: uppercase; letter-spacing: 0.02em; }
    .chips { display: flex; flex-wrap: wrap; gap: 8px; }
    .chip {
      min-height: 44px;
      padding: 8px 16px;
      border: 1.5px solid var(--umam-section-border, #b9def2);
      border-radius: 999px;
      background: #fff;
      color: #333;
      font-size: 0.9rem;
      font-family: inherit;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
      -webkit-tap-highlight-color: transparent;
    }
    .chip:active { background: var(--umam-section-bg, #dbeef9); }
    .chip-activo {
      background: var(--umam-header-bg, #1892d3);
      border-color: var(--umam-header-bg, #1892d3);
      color: #fff;
      font-weight: 600;
    }
    .grupo-imagenes { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }
    .acciones-imagenes { display: flex; flex-wrap: wrap; gap: 8px; }
    .camara { display: flex; flex-direction: column; gap: 6px; }
    .camara video { width: 100%; max-width: 360px; max-height: 280px; border-radius: 8px; background: #000; object-fit: cover; }
    .camara-acciones { display: flex; flex-wrap: wrap; gap: 8px; }
    .error-camara { color: #c0392b; font-size: 0.85rem; margin: 0; }
    .miniaturas { display: flex; flex-wrap: wrap; gap: 8px; }
    .miniatura { position: relative; width: 72px; height: 72px; }
    .miniatura img { width: 100%; height: 100%; object-fit: cover; border-radius: 6px; border: 1px solid var(--umam-section-border, #b9def2); }
    .quitar-imagen {
      position: absolute; top: -6px; right: -6px; width: 20px; height: 20px;
      border-radius: 50%; border: none; background: #c0392b; color: #fff;
      font-size: 11px; line-height: 1; cursor: pointer;
    }
  `],
})
export class CampoFormularioComponent implements OnDestroy {
  private _campo!: CampoFormulario;
  private _control!: FormControl;

  /**
   * Control interno tipo Date que alimenta mat-datepicker / mat-timepicker.
   * El control externo (this.control) sigue guardando 'YYYY-MM-DD' / 'HH:mm'
   * como texto plano — igual que antes de agregar los selectores de
   * Material — para no tocar el modelo, el autosave a localStorage ni la
   * exportación a PDF/Excel, que siguen leyendo/escribiendo esos strings tal
   * cual. Se sincroniza en los setters (no en ngOnChanges) para que también
   * funcione cuando las specs asignan `campo`/`control` directo a la
   * instancia, sin pasar por un binding de plantilla.
   */
  controlFechaHora = new FormControl<Date | null>(null);
  private suscripcionFechaHora?: Subscription;

  /** Vista previa de cámara en vivo para el tipo 'imagenes' (ver abrirCamara()). */
  mostrandoCamara = false;
  errorCamara = '';
  @ViewChild('videoCamara') private videoCamaraRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('entradaCamaraFallback') private entradaCamaraFallbackRef!: ElementRef<HTMLInputElement>;
  private streamCamara?: MediaStream;

  @Input() set campo(valor: CampoFormulario) {
    this._campo = valor;
    this.sincronizarFechaHora();
  }
  get campo(): CampoFormulario {
    return this._campo;
  }

  @Input() set control(valor: FormControl) {
    this._control = valor;
    this.sincronizarFechaHora();
  }
  get control(): FormControl {
    return this._control;
  }

  ngOnDestroy(): void {
    this.suscripcionFechaHora?.unsubscribe();
    this.cerrarCamara();
  }

  private sincronizarFechaHora(): void {
    if (!this._campo || !this._control) return;
    if (this._campo.tipo !== 'fecha' && this._campo.tipo !== 'hora') return;

    this.suscripcionFechaHora?.unsubscribe();
    const aFecha = this._campo.tipo === 'fecha' ? textoAFecha : textoAHora;
    const aTexto = this._campo.tipo === 'fecha' ? fechaATexto : horaATexto;

    this.controlFechaHora.setValue(aFecha(this._control.value), { emitEvent: false });
    this.suscripcionFechaHora = this.controlFechaHora.valueChanges.subscribe(valor => {
      this._control.setValue(aTexto(valor));
    });
  }

  estaMarcada(opcion: string): boolean {
    const valor = (this.control.value ?? []) as string[];
    return valor.includes(opcion);
  }

  alternarOpcion(opcion: string): void {
    const valor = [...((this.control.value ?? []) as string[])];
    const indice = valor.indexOf(opcion);
    if (indice >= 0) {
      valor.splice(indice, 1);
    } else {
      valor.push(opcion);
    }
    this.control.setValue(valor);
  }

  seleccionarRadio(opcion: string): void {
    // Tocar el chip ya activo lo deselecciona: en el papel muchas casillas
    // pueden quedar sin marcar, así que el radio necesita poder vaciarse.
    this.control.setValue(this.control.value === opcion ? '' : opcion);
  }

  alternarBooleano(): void {
    this.control.setValue(this.control.value !== true);
  }

  imagenes(): string[] {
    return (this.control.value ?? []) as string[];
  }

  /**
   * Convierte cada archivo elegido a un data URI base64 y lo agrega al arreglo
   * del control. Se guarda como base64 (no como File) porque todo el registro
   * viaja tal cual a localStorage vía JSON.stringify — un File no sobrevive
   * esa serialización.
   */
  agregarImagenes(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const archivos = Array.from(input.files ?? []);
    for (const archivo of archivos) {
      const lector = new FileReader();
      lector.onload = () => {
        this.control.setValue([...this.imagenes(), String(lector.result)]);
      };
      lector.readAsDataURL(archivo);
    }
    input.value = '';
  }

  quitarImagen(indice: number): void {
    const valor = [...this.imagenes()];
    valor.splice(indice, 1);
    this.control.setValue(valor);
  }

  /**
   * Activa la cámara del dispositivo en vivo y la muestra en un <video> dentro
   * del propio campo. Si el navegador no soporta getUserMedia (o el contexto
   * no es seguro — ni HTTPS ni localhost), o si el usuario niega el permiso,
   * recae en el input con "capture", que en celular sigue abriendo la cámara
   * nativa del sistema.
   */
  async abrirCamara(): Promise<void> {
    this.errorCamara = '';
    if (!navigator.mediaDevices?.getUserMedia) {
      this.entradaCamaraFallbackRef?.nativeElement.click();
      return;
    }
    try {
      this.streamCamara = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      this.mostrandoCamara = true;
      // El <video> recién aparece en el DOM al activar mostrandoCamara (*ngIf);
      // se espera al siguiente tick para que @ViewChild ya lo haya capturado.
      setTimeout(() => {
        if (this.videoCamaraRef) {
          this.videoCamaraRef.nativeElement.srcObject = this.streamCamara!;
        }
      });
    } catch (error) {
      console.error('No se pudo activar la cámara', error);
      this.errorCamara = 'No se pudo activar la cámara. Revisa los permisos del navegador o usa "Subir imagen".';
    }
  }

  /** Toma la imagen actual del <video> en vivo y la agrega como una imagen más. */
  capturarFoto(): void {
    const video = this.videoCamaraRef?.nativeElement;
    if (!video) return;
    const lienzo = document.createElement('canvas');
    lienzo.width = video.videoWidth || 1;
    lienzo.height = video.videoHeight || 1;
    lienzo.getContext('2d')?.drawImage(video, 0, 0, lienzo.width, lienzo.height);
    this.control.setValue([...this.imagenes(), lienzo.toDataURL('image/jpeg', 0.85)]);
    this.cerrarCamara();
  }

  cerrarCamara(): void {
    this.streamCamara?.getTracks().forEach(pista => pista.stop());
    this.streamCamara = undefined;
    this.mostrandoCamara = false;
  }
}
