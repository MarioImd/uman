import { Component, Input } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { CampoFormulario } from '../../core/models/campo-formulario.model';

@Component({
  selector: 'app-campo-formulario',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatCheckboxModule, MatRadioModule, MatSelectModule,
  ],
  template: `
    <div class="campo" [ngSwitch]="campo.tipo">

      <mat-form-field *ngSwitchCase="'texto'" appearance="outline" class="campo-ancho-completo">
        <mat-label>{{ campo.etiqueta }}</mat-label>
        <input matInput type="text" [formControl]="control" />
      </mat-form-field>

      <mat-form-field *ngSwitchCase="'numero'" appearance="outline" class="campo-ancho-medio">
        <mat-label>{{ campo.etiqueta }}</mat-label>
        <input matInput type="number" [formControl]="control" />
        <span matTextSuffix *ngIf="campo.sufijo">{{ campo.sufijo }}</span>
      </mat-form-field>

      <mat-form-field *ngSwitchCase="'fecha'" appearance="outline" class="campo-ancho-medio">
        <mat-label>{{ campo.etiqueta }}</mat-label>
        <input matInput type="date" [formControl]="control" />
      </mat-form-field>

      <mat-form-field *ngSwitchCase="'hora'" appearance="outline" class="campo-ancho-medio">
        <mat-label>{{ campo.etiqueta }}</mat-label>
        <input matInput type="time" [formControl]="control" />
      </mat-form-field>

      <mat-form-field *ngSwitchCase="'textarea'" appearance="outline" class="campo-ancho-completo">
        <mat-label>{{ campo.etiqueta }}</mat-label>
        <textarea matInput rows="3" [formControl]="control"></textarea>
      </mat-form-field>

      <mat-checkbox *ngSwitchCase="'checkbox'" [formControl]="control">
        {{ campo.etiqueta }}
      </mat-checkbox>

      <div *ngSwitchCase="'checkbox-grupo'" class="grupo-opciones">
        <span class="grupo-titulo">{{ campo.etiqueta }}</span>
        <mat-checkbox
          *ngFor="let opcion of campo.opciones"
          [checked]="estaMarcada(opcion)"
          (change)="alternarOpcion(opcion)">
          {{ opcion }}
        </mat-checkbox>
      </div>

      <div *ngSwitchCase="'radio-grupo'" class="grupo-opciones">
        <span class="grupo-titulo">{{ campo.etiqueta }}</span>
        <mat-radio-group [formControl]="control">
          <mat-radio-button *ngFor="let opcion of campo.opciones" [value]="opcion">
            {{ opcion }}
          </mat-radio-button>
        </mat-radio-group>
      </div>

      <mat-form-field *ngSwitchCase="'select'" appearance="outline" class="campo-ancho-medio">
        <mat-label>{{ campo.etiqueta }}</mat-label>
        <mat-select [formControl]="control">
          <mat-option *ngFor="let opcion of campo.opciones" [value]="opcion">{{ opcion }}</mat-option>
        </mat-select>
      </mat-form-field>

    </div>
  `,
  styles: [`
    .campo { margin-bottom: 12px; }
    .campo-ancho-completo, .campo-ancho-medio { width: 100%; }
    .grupo-opciones { display: flex; flex-direction: column; gap: 8px; }
    .grupo-titulo { font-weight: 500; color: var(--umam-header-bg, #1892d3); }
    mat-radio-group { display: flex; flex-wrap: wrap; gap: 12px; }
  `],
})
export class CampoFormularioComponent {
  @Input() campo!: CampoFormulario;
  @Input() control!: FormControl;

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
}
