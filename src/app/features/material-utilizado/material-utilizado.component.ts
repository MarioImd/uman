import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CATALOGO_MATERIAL, CategoriaMaterial } from '../../core/data/material-utilizado.data';

@Component({
  selector: 'app-material-utilizado',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatCheckboxModule, MatFormFieldModule, MatInputModule],
  template: `
    <div class="material-utilizado" [formGroup]="grupo">
      <mat-form-field appearance="outline" class="buscador">
        <mat-label>Buscar material</mat-label>
        <input matInput type="text" [(ngModel)]="filtro" [ngModelOptions]="{standalone: true}" />
      </mat-form-field>

      <div class="categorias">
        <div class="categoria-material" *ngFor="let categoria of categorias">
          <h4>{{ categoria.nombre }}</h4>
          <div
            class="item-material"
            *ngFor="let item of categoria.items"
            [class.oculto]="!coincideFiltro(item.nombre)"
            [formGroupName]="item.clave">
            <mat-checkbox formControlName="marcado">{{ item.nombre }}</mat-checkbox>
            <mat-form-field *ngIf="item.tieneMedida" appearance="outline" class="campo-cantidad">
              <mat-label>{{ item.unidadMedida ?? 'medida' }}</mat-label>
              <input matInput type="text" formControlName="cantidad" />
            </mat-form-field>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .buscador { width: 100%; max-width: 320px; }
    .categorias { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }
    .categoria-material h4 { color: var(--umam-header-bg, #1892d3); border-bottom: 1px solid var(--umam-section-border, #b9def2); padding-bottom: 4px; }
    .item-material { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    .item-material.oculto { display: none; }
    .campo-cantidad { width: 100px; }
  `],
})
export class MaterialUtilizadoComponent {
  @Input() grupo!: FormGroup;
  categorias: CategoriaMaterial[] = CATALOGO_MATERIAL;
  filtro = '';

  coincideFiltro(nombre: string): boolean {
    if (!this.filtro.trim()) return true;
    return nombre.toLowerCase().includes(this.filtro.trim().toLowerCase());
  }
}
