import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/** Controles "Anterior / Página X de N / Siguiente" para listas paginadas en el servidor. */
@Component({
  selector: 'app-paginador',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <nav class="paginador" *ngIf="totalPaginas > 1" aria-label="Paginación">
      <button type="button" class="paginador-anterior" mat-stroked-button [disabled]="pagina <= 1" (click)="cambiar.emit(pagina - 1)">
        <mat-icon>chevron_left</mat-icon> Anterior
      </button>
      <span class="paginador-texto">Página {{ pagina }} de {{ totalPaginas }}</span>
      <button type="button" class="paginador-siguiente" mat-stroked-button [disabled]="pagina >= totalPaginas" (click)="cambiar.emit(pagina + 1)">
        Siguiente <mat-icon iconPositionEnd>chevron_right</mat-icon>
      </button>
    </nav>
  `,
  styles: [`
    .paginador { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 14px 8px; }
    .paginador-texto { color: var(--umam-texto-suave); font-size: 0.9rem; white-space: nowrap; }
    button { min-height: 44px; border-radius: 12px; }
  `],
})
export class PaginadorComponent {
  @Input() pagina = 1;
  @Input() total = 0;
  @Input() porPagina = 20;
  @Output() cambiar = new EventEmitter<number>();

  get totalPaginas(): number {
    return Math.ceil(this.total / this.porPagina);
  }
}
