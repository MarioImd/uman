import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatSelectHarness } from '@angular/material/select/testing';
import { FormControl } from '@angular/forms';
import { CampoFormularioComponent } from './campo-formulario.component';
import { CampoFormulario } from '../../core/models/campo-formulario.model';

describe('CampoFormularioComponent', () => {
  let fixture: ComponentFixture<CampoFormularioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CampoFormularioComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(CampoFormularioComponent);
  });

  it('renderiza un input de texto para tipo "texto" y refleja cambios en el FormControl', () => {
    const campo: CampoFormulario = { clave: 'operador', etiqueta: 'Operador', tipo: 'texto' };
    const control = new FormControl('');
    fixture.componentInstance.campo = campo;
    fixture.componentInstance.control = control;
    fixture.detectChanges();

    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[type="text"]');
    expect(input).toBeTruthy();

    input.value = 'Juan Pérez';
    input.dispatchEvent(new Event('input'));
    expect(control.value).toBe('Juan Pérez');
  });

  it('renderiza un checkbox por cada opción para tipo "checkbox-grupo" y agrega/quita del arreglo', () => {
    const campo: CampoFormulario = { clave: 'lugarOcurrencia', etiqueta: 'Lugar', tipo: 'checkbox-grupo', opciones: ['Hogar', 'Vía pública'] };
    const control = new FormControl<string[]>([]);
    fixture.componentInstance.campo = campo;
    fixture.componentInstance.control = control;
    fixture.detectChanges();

    const checkboxes: HTMLInputElement[] = Array.from(fixture.nativeElement.querySelectorAll('input[type="checkbox"]'));
    expect(checkboxes.length).toBe(2);

    checkboxes[0].click();
    fixture.detectChanges();
    expect(control.value).toEqual(['Hogar']);

    checkboxes[0].click();
    fixture.detectChanges();
    expect(control.value).toEqual([]);
  });

  it('renderiza un <select> para tipo "select" con las opciones dadas', async () => {
    const campo: CampoFormulario = { clave: 'sexo', etiqueta: 'Sexo', tipo: 'select', opciones: ['Masculino', 'Femenino'] };
    const control = new FormControl('');
    fixture.componentInstance.campo = campo;
    fixture.componentInstance.control = control;
    fixture.detectChanges();

    // mat-select no renderiza un <select> nativo; usamos el harness de Material
    // para abrir el panel (proyectado en un overlay del CDK) y verificar las opciones.
    const select = fixture.nativeElement.querySelector('mat-select');
    expect(select).toBeTruthy();

    const loader: HarnessLoader = TestbedHarnessEnvironment.loader(fixture);
    const selectHarness = await loader.getHarness(MatSelectHarness);
    await selectHarness.open();
    const opciones = await selectHarness.getOptions();
    expect(opciones.length).toBe(2);
    expect(await opciones[0].getText()).toBe('Masculino');
    expect(await opciones[1].getText()).toBe('Femenino');
  });
});
