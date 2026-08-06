import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CampoFormularioComponent } from '../campo-formulario/campo-formulario.component';
import { TablaRepetibleComponent } from '../tabla-repetible/tabla-repetible.component';
import { SeccionFormulario } from '../../core/models/campo-formulario.model';

@Component({
  selector: 'app-seccion-paso',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CampoFormularioComponent, TablaRepetibleComponent],
  template: `
    <section class="paso" [formGroup]="grupo">
      <h2 class="titulo-seccion">{{ seccion.titulo }}</h2>

      <div class="grid-campos">
        <div
          *ngFor="let campo of seccion.campos"
          class="celda"
          [class.celda-completa]="esAnchoCompleto(campo.tipo)">
          <app-campo-formulario [campo]="campo" [control]="controlDeCampo(campo.clave)"></app-campo-formulario>
        </div>
      </div>

      <app-tabla-repetible
        *ngFor="let tabla of seccion.tablas"
        [tabla]="tabla"
        [filas]="filasDeTabla(tabla.clave)"
      ></app-tabla-repetible>
    </section>
  `,
  styles: [`
    .paso { background: #fff; border: 1px solid var(--umam-section-border, #b9def2); border-radius: 12px; padding: 16px; }
    .titulo-seccion { margin: 0 0 16px; font-size: 1.15rem; color: var(--umam-header-bg, #1892d3); border-bottom: 2px solid var(--umam-section-border, #b9def2); padding-bottom: 8px; }
    .grid-campos { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); column-gap: 12px; align-items: start; }
    .celda-completa { grid-column: 1 / -1; }
  `],
})
export class SeccionPasoComponent {
  @Input() seccion!: SeccionFormulario;
  @Input() grupo!: FormGroup;

  esAnchoCompleto(tipo: string): boolean {
    // Los campos cortos (horas, números, fechas, selects) comparten renglón en la
    // cuadrícula; texto libre y grupos de chips necesitan el ancho completo.
    return !['hora', 'numero', 'fecha', 'select'].includes(tipo);
  }

  controlDeCampo(clave: string): FormControl {
    return this.grupo.get(clave) as FormControl;
  }

  filasDeTabla(clave: string): FormArray {
    return this.grupo.parent!.get(clave) as FormArray;
  }
}
