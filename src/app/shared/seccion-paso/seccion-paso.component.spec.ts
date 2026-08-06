import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, FormGroup } from '@angular/forms';
import { SeccionPasoComponent } from './seccion-paso.component';
import { SECCIONES } from '../../core/data/secciones.data';
import { construirFormularioRegistro } from '../../core/forms/construir-formulario';
import { crearRegistroVacio } from '../../core/models/registro.model';

describe('SeccionPasoComponent', () => {
  let fixture: ComponentFixture<SeccionPasoComponent>;
  let formularioCompleto: FormGroup;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeccionPasoComponent],
    }).compileComponents();
    formularioCompleto = construirFormularioRegistro(new FormBuilder(), crearRegistroVacio());
    fixture = TestBed.createComponent(SeccionPasoComponent);
  });

  it('renderiza el título de la sección y un app-campo-formulario por cada campo', () => {
    const seccion = SECCIONES.find(s => s.clave === 'control')!;
    fixture.componentInstance.seccion = seccion;
    fixture.componentInstance.grupo = formularioCompleto.get('control') as FormGroup;
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('III. Control');
    const campos = fixture.nativeElement.querySelectorAll('app-campo-formulario');
    expect(campos.length).toBe(seccion.campos.length);
  });

  it('renderiza una app-tabla-repetible por cada tabla de la sección', () => {
    const seccion = SECCIONES.find(s => s.clave === 'evaluacionSecundaria')!;
    fixture.componentInstance.seccion = seccion;
    fixture.componentInstance.grupo = formularioCompleto.get('evaluacionSecundaria') as FormGroup;
    fixture.detectChanges();

    const tablas = fixture.nativeElement.querySelectorAll('app-tabla-repetible');
    expect(tablas.length).toBe(seccion.tablas!.length);
  });
});
