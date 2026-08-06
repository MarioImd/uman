import { Component, Input } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { CampoFormulario } from '../../core/models/campo-formulario.model';

@Component({
  selector: 'app-campo-formulario',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
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

  seleccionarRadio(opcion: string): void {
    // Tocar el chip ya activo lo deselecciona: en el papel muchas casillas
    // pueden quedar sin marcar, así que el radio necesita poder vaciarse.
    this.control.setValue(this.control.value === opcion ? '' : opcion);
  }

  alternarBooleano(): void {
    this.control.setValue(this.control.value !== true);
  }
}
