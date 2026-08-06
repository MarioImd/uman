import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormArray, FormBuilder } from '@angular/forms';
import { TablaRepetibleComponent } from './tabla-repetible.component';
import { TablaRepetible } from '../../core/models/campo-formulario.model';

describe('TablaRepetibleComponent', () => {
  let fixture: ComponentFixture<TablaRepetibleComponent>;
  const fb = new FormBuilder();
  const tabla: TablaRepetible = {
    clave: 'vehiculosInvolucrados',
    titulo: 'Vehículos involucrados',
    columnas: [
      { clave: 'tipoMarca', etiqueta: 'Tipo y marca', tipo: 'texto' },
      { clave: 'placas', etiqueta: 'Placas', tipo: 'texto' },
    ],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TablaRepetibleComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(TablaRepetibleComponent);
    fixture.componentInstance.tabla = tabla;
    fixture.componentInstance.filas = fb.array([]);
  });

  it('empieza sin filas y el botón "agregar fila" agrega una fila con las columnas de la tabla', () => {
    fixture.detectChanges();
    expect(fixture.componentInstance.filas.length).toBe(0);

    const boton: HTMLButtonElement = fixture.nativeElement.querySelector('button.agregar-fila');
    boton.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.filas.length).toBe(1);
    const primeraFila = fixture.componentInstance.filas.at(0);
    expect(primeraFila.get('tipoMarca')).toBeTruthy();
    expect(primeraFila.get('placas')).toBeTruthy();
  });

  it('el botón "quitar" elimina la fila correspondiente', () => {
    fixture.componentInstance.filas.push(fixture.componentInstance['fb'].group({ tipoMarca: [''], placas: [''] }));
    fixture.detectChanges();
    expect(fixture.componentInstance.filas.length).toBe(1);

    const botonQuitar: HTMLButtonElement = fixture.nativeElement.querySelector('button.quitar-fila');
    botonQuitar.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.filas.length).toBe(0);
  });
});
