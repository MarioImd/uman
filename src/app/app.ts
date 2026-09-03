import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormularioComponent } from './features/formulario/formulario.component';
import { HistorialComponent } from './features/historial/historial.component';
import { RegistroAtencionPrehospitalaria } from './core/models/registro.model';

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormularioComponent, HistorialComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  vista: 'formulario' | 'historial' = 'formulario';
  registroACargar?: RegistroAtencionPrehospitalaria;

  irAFormulario(): void {
    this.vista = 'formulario';
  }

  irAHistorial(): void {
    this.vista = 'historial';
  }

  /** El Historial pide abrir un trámite puntual: se lo pasamos al formulario y volvemos a esa vista. */
  abrirDesdeHistorial(registro: RegistroAtencionPrehospitalaria): void {
    this.registroACargar = registro;
    this.vista = 'formulario';
  }
}
