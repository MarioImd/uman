import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CampoFormularioComponent } from '../campo-formulario/campo-formulario.component';
import { TablaRepetible } from '../../core/models/campo-formulario.model';
import { nuevaFilaTabla } from '../../core/forms/construir-formulario';

/**
 * Tabla de filas que se agregan y quitan (signos vitales, manejo
 * farmacológico, vehículos). Cada fila se muestra como una tarjeta numerada
 * con sus columnas en cuadrícula, para que en celular no quede una tira
 * interminable de campos.
 */
@Component({
  selector: 'app-tabla-repetible',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule, CampoFormularioComponent],
  template: `
    <div class="tabla-repetible">
      <h4>
        {{ tabla.titulo }}
        <span class="contador">{{ filas.length }}</span>
      </h4>
      <p class="sin-filas" *ngIf="filas.length === 0">Sin registros. Usa "Agregar fila" para capturar uno.</p>
      <div class="fila" *ngFor="let fila of filas.controls; let i = index" [formGroup]="asFormGroup(fila)">
        <div class="fila-encabezado">
          <span class="numero-fila">#{{ i + 1 }}</span>
          <button type="button" class="quitar-fila" mat-icon-button (click)="quitarFila(i)" aria-label="Quitar fila" title="Quitar fila">
            <mat-icon>delete_outline</mat-icon>
          </button>
        </div>
        <div class="fila-campos">
          <app-campo-formulario
            *ngFor="let columna of tabla.columnas"
            [campo]="columna"
            [control]="controlDeColumna(fila, columna.clave)"
          ></app-campo-formulario>
        </div>
      </div>
      <button type="button" class="agregar-fila" mat-stroked-button (click)="agregarFila()">
        <mat-icon>add</mat-icon> Agregar fila
      </button>
    </div>
  `,
  styles: [`
    .tabla-repetible { margin: 20px 0 4px; padding-top: 16px; border-top: 1px dashed var(--umam-section-border); }
    h4 { display: flex; align-items: center; gap: 8px; margin: 0 0 12px; font-size: 0.95rem; color: var(--umam-header-oscuro); text-transform: uppercase; letter-spacing: 0.03em; }
    .contador { min-width: 22px; padding: 1px 7px; border-radius: 999px; background: var(--umam-section-bg); font-size: 0.8rem; text-align: center; }
    .sin-filas { margin: 0 0 12px; color: var(--umam-texto-suave); font-size: 0.9rem; }
    .fila { border: 1px solid var(--umam-section-border); border-radius: 12px; padding: 8px 12px 0; margin-bottom: 12px; background: #fbfdff; }
    .fila-encabezado { display: flex; align-items: center; justify-content: space-between; }
    .numero-fila { font-weight: 700; color: var(--umam-header-bg); font-size: 0.9rem; }
    .quitar-fila { color: var(--umam-error); }
    .fila-campos { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); column-gap: 10px; }
    .agregar-fila { min-height: 42px; border-radius: 12px; }
  `],
})
export class TablaRepetibleComponent {
  @Input() tabla!: TablaRepetible;
  @Input() filas!: FormArray;

  private fb = new FormBuilder();

  agregarFila(): void {
    this.filas.push(nuevaFilaTabla(this.fb, this.tabla.columnas));
  }

  quitarFila(indice: number): void {
    this.filas.removeAt(indice);
  }

  asFormGroup(control: unknown): FormGroup {
    return control as FormGroup;
  }

  controlDeColumna(fila: AbstractControl, clave: string): FormControl {
    return (fila as FormGroup).get(clave) as FormControl;
  }
}
