import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { CampoFormularioComponent } from '../campo-formulario/campo-formulario.component';
import { TablaRepetibleComponent } from '../tabla-repetible/tabla-repetible.component';
import { SeccionFormulario } from '../../core/models/campo-formulario.model';
import { FormArray } from '@angular/forms';

@Component({
  selector: 'app-seccion-acordeon',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatExpansionModule, CampoFormularioComponent, TablaRepetibleComponent],
  template: `
    <mat-expansion-panel [expanded]="expandido" [id]="'seccion-' + seccion.clave">
      <mat-expansion-panel-header>
        <mat-panel-title>{{ seccion.titulo }}</mat-panel-title>
      </mat-expansion-panel-header>

      <div class="campos-seccion" [formGroup]="grupo">
        <app-campo-formulario
          *ngFor="let campo of seccion.campos"
          [campo]="campo"
          [control]="controlDeCampo(campo.clave)"
        ></app-campo-formulario>
      </div>

      <app-tabla-repetible
        *ngFor="let tabla of seccion.tablas"
        [tabla]="tabla"
        [filas]="filasDeTabla(tabla.clave)"
      ></app-tabla-repetible>
    </mat-expansion-panel>
  `,
  styles: [`
    .campos-seccion { display: flex; flex-direction: column; gap: 8px; padding: 8px 0; }
    mat-expansion-panel { margin-bottom: 8px; }
    ::ng-deep .mat-expansion-panel-header-title { color: var(--umam-header-bg, #1892d3); font-weight: 600; }
  `],
})
export class SeccionAcordeonComponent {
  @Input() seccion!: SeccionFormulario;
  @Input() grupo!: FormGroup;
  expandido = true;

  controlDeCampo(clave: string): FormControl {
    return this.grupo.get(clave) as FormControl;
  }

  filasDeTabla(clave: string): FormArray {
    return this.grupo.parent!.get(clave) as FormArray;
  }
}
