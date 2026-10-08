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
    .paso { background: #fff; border: 1px solid var(--umam-section-border); border-radius: 16px; padding: 20px; box-shadow: var(--umam-sombra-suave); }
    /* Título con la franja de color de las pestañas de la hoja física UMAM. */
    .titulo-seccion {
      margin: -20px -20px 20px; padding: 14px 20px; border-radius: 16px 16px 0 0;
      font-size: 1.1rem; font-weight: 700; letter-spacing: 0.01em;
      color: var(--umam-header-oscuro); background: var(--umam-section-bg);
      border-bottom: 1px solid var(--umam-section-border); border-left: 5px solid var(--umam-header-bg);
    }
    .grid-campos { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); column-gap: 14px; row-gap: 2px; align-items: start; }
    @media (max-width: 520px) {
      .paso { padding: 16px 14px; border-radius: 14px; }
      .titulo-seccion { margin: -16px -14px 16px; padding: 12px 14px; border-radius: 14px 14px 0 0; }
    }
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
