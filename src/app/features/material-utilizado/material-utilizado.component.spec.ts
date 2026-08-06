import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { MaterialUtilizadoComponent } from './material-utilizado.component';
import { CATALOGO_MATERIAL } from '../../core/data/material-utilizado.data';

describe('MaterialUtilizadoComponent', () => {
  let fixture: ComponentFixture<MaterialUtilizadoComponent>;
  const fb = new FormBuilder();

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MaterialUtilizadoComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(MaterialUtilizadoComponent);

    const controles: Record<string, unknown> = {};
    for (const categoria of CATALOGO_MATERIAL) {
      for (const item of categoria.items) {
        controles[item.clave] = fb.group({ marcado: [false], cantidad: [''] });
      }
    }
    fixture.componentInstance.grupo = fb.group(controles);
  });

  it('renderiza un checkbox por cada ítem del catálogo, agrupados por categoría', () => {
    fixture.detectChanges();
    const totalItems = CATALOGO_MATERIAL.reduce((n, c) => n + c.items.length, 0);
    const checkboxes = fixture.nativeElement.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes.length).toBe(totalItems);

    const categorias = fixture.nativeElement.querySelectorAll('.categoria-material h4');
    expect(categorias.length).toBe(CATALOGO_MATERIAL.length);
  });

  it('el filtro de texto oculta ítems que no coinciden con la búsqueda', () => {
    fixture.detectChanges();
    fixture.componentInstance.filtro = 'guantes';
    fixture.detectChanges();

    const visibles = fixture.nativeElement.querySelectorAll('.item-material:not(.oculto)');
    // "Guantes" y "Guantes estériles" contienen "guantes"
    expect(visibles.length).toBe(2);
  });
});
