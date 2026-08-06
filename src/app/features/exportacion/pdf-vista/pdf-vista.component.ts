import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SECCIONES } from '../../../core/data/secciones.data';
import { CATALOGO_MATERIAL } from '../../../core/data/material-utilizado.data';
import { SeccionFormulario } from '../../../core/models/campo-formulario.model';

@Component({
  selector: 'app-pdf-vista',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pagina-pdf">
      <header class="encabezado-pdf">
        <h1>UMAM — Registro de Atención Prehospitalaria</h1>
        <div class="folio">Folio: {{ valorCampo('datosGenerales', 'folio') }}</div>
      </header>

      <section class="seccion-pdf" *ngFor="let seccion of secciones">
        <h2>{{ seccion.titulo }}</h2>
        <table>
          <tr *ngFor="let campo of seccion.campos">
            <th>{{ campo.etiqueta }}</th>
            <td>{{ valorCampo(seccion.clave, campo.clave) }}</td>
          </tr>
        </table>
        <table class="tabla-repetible-pdf" *ngFor="let tabla of seccion.tablas ?? []">
          <caption>{{ tabla.titulo }}</caption>
          <tr>
            <th *ngFor="let columna of tabla.columnas">{{ columna.etiqueta }}</th>
          </tr>
          <tr *ngFor="let fila of (registro?.[tabla.clave] ?? [])">
            <td *ngFor="let columna of tabla.columnas">{{ fila[columna.clave] }}</td>
          </tr>
        </table>
      </section>

      <section class="seccion-pdf">
        <h2>Material Utilizado</h2>
        <div class="categoria-pdf" *ngFor="let categoria of categorias">
          <h3>{{ categoria.nombre }}</h3>
          <ul>
            <li *ngFor="let item of categoria.items" [class.marcado]="registro?.['materialUtilizado']?.[item.clave]?.marcado">
              {{ item.nombre }}
              <span *ngIf="registro?.['materialUtilizado']?.[item.clave]?.cantidad as cantidad">— {{ cantidad }}</span>
            </li>
          </ul>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .encabezado-pdf {
      background: #1892d3;
      color: white;
      padding: 8px 12px;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }
    .seccion-pdf h2 { color: #1892d3; border-bottom: 2px solid #1892d3; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    th, td { border: 1px solid #b9def2; padding: 4px 6px; text-align: left; font-size: 12px; }
    li.marcado { font-weight: 600; }
    li:not(.marcado) { color: #999; text-decoration: line-through; }
    @media print {
      .seccion-pdf { break-inside: avoid; }
    }
  `],
})
export class PdfVistaComponent {
  @Input() registro: Record<string, any> | undefined;
  secciones: SeccionFormulario[] = SECCIONES;
  categorias = CATALOGO_MATERIAL;

  valorCampo(seccionClave: string, campoClave: string): string {
    const seccionValor = this.registro?.[seccionClave];
    const valor = seccionValor?.[campoClave];
    if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
    if (Array.isArray(valor)) return valor.join(', ');
    return valor ?? '';
  }
}
