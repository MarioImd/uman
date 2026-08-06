import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CampoFormularioComponent } from '../campo-formulario/campo-formulario.component';
import { TablaRepetible } from '../../core/models/campo-formulario.model';
import { nuevaFilaTabla } from '../../core/forms/construir-formulario';

@Component({
  selector: 'app-tabla-repetible',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule, CampoFormularioComponent],
  template: `
    <div class="tabla-repetible">
      <h4>{{ tabla.titulo }}</h4>
      <div class="fila" *ngFor="let fila of filas.controls; let i = index" [formGroup]="asFormGroup(fila)">
        <app-campo-formulario
          *ngFor="let columna of tabla.columnas"
          [campo]="columna"
          [control]="controlDeColumna(fila, columna.clave)"
        ></app-campo-formulario>
        <button type="button" class="quitar-fila" mat-icon-button (click)="quitarFila(i)" aria-label="Quitar fila">
          <mat-icon>delete</mat-icon>
        </button>
      </div>
      <button type="button" class="agregar-fila" mat-stroked-button (click)="agregarFila()">
        <mat-icon>add</mat-icon> Agregar fila
      </button>
    </div>
  `,
  styles: [`
    .tabla-repetible { margin: 16px 0; }
    .fila { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 8px; }
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
