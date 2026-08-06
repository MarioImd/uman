import { Component } from '@angular/core';
import { FormularioComponent } from './features/formulario/formulario.component';

@Component({
  selector: 'app-root',
  imports: [FormularioComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {}
