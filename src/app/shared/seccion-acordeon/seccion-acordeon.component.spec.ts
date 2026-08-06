import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { SeccionAcordeonComponent } from './seccion-acordeon.component';
import { SeccionFormulario } from '../../core/models/campo-formulario.model';

describe('SeccionAcordeonComponent', () => {
  let fixture: ComponentFixture<SeccionAcordeonComponent>;
  const fb = new FormBuilder();

  const seccion: SeccionFormulario = {
    clave: 'control',
    titulo: 'III. Control',
    campos: [
      { clave: 'operador', etiqueta: 'Operador', tipo: 'texto' },
      { clave: 'ambulanciaNumero', etiqueta: 'Número de ambulancia', tipo: 'texto' },
    ],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeccionAcordeonComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(SeccionAcordeonComponent);
    fixture.componentInstance.seccion = seccion;
    fixture.componentInstance.grupo = fb.group({ operador: [''], ambulanciaNumero: [''] });
    fixture.detectChanges();
  });

  it('muestra el título de la sección', () => {
    expect(fixture.nativeElement.textContent).toContain('III. Control');
  });

  it('renderiza un app-campo-formulario por cada campo de la sección', () => {
    const campos = fixture.nativeElement.querySelectorAll('app-campo-formulario');
    expect(campos.length).toBe(2);
  });

  it('el panel empieza expandido', () => {
    expect(fixture.componentInstance.expandido).toBeTrue();
  });
});
