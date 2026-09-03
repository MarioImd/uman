import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatSelectHarness } from '@angular/material/select/testing';
import { provideNativeDateAdapter } from '@angular/material/core';
import { FormControl } from '@angular/forms';
import { CampoFormularioComponent } from './campo-formulario.component';
import { CampoFormulario } from '../../core/models/campo-formulario.model';

describe('CampoFormularioComponent', () => {
  let fixture: ComponentFixture<CampoFormularioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CampoFormularioComponent],
      providers: [provideNativeDateAdapter()],
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

  it('renderiza un chip por cada opción para tipo "checkbox-grupo" y agrega/quita del arreglo', () => {
    const campo: CampoFormulario = { clave: 'lugarOcurrencia', etiqueta: 'Lugar', tipo: 'checkbox-grupo', opciones: ['Hogar', 'Vía pública'] };
    const control = new FormControl<string[]>([]);
    fixture.componentInstance.campo = campo;
    fixture.componentInstance.control = control;
    fixture.detectChanges();

    const chips: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button.chip'));
    expect(chips.length).toBe(2);

    chips[0].click();
    fixture.detectChanges();
    expect(control.value).toEqual(['Hogar']);
    expect(chips[0].classList).toContain('chip-activo');

    chips[0].click();
    fixture.detectChanges();
    expect(control.value).toEqual([]);
    expect(chips[0].classList).not.toContain('chip-activo');
  });

  it('renderiza chips para tipo "radio-grupo": un toque selecciona y otro deselecciona', () => {
    const campo: CampoFormulario = { clave: 'viaAerea', etiqueta: 'Vía aérea', tipo: 'radio-grupo', opciones: ['Permeable', 'Comprometida'] };
    const control = new FormControl('');
    fixture.componentInstance.campo = campo;
    fixture.componentInstance.control = control;
    fixture.detectChanges();

    const chips: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button.chip'));
    expect(chips.length).toBe(2);

    chips[1].click();
    fixture.detectChanges();
    expect(control.value).toBe('Comprometida');
    expect(chips[1].classList).toContain('chip-activo');
    expect(chips[0].classList).not.toContain('chip-activo');

    // seleccionar la otra opción reemplaza el valor
    chips[0].click();
    fixture.detectChanges();
    expect(control.value).toBe('Permeable');

    // tocar el chip activo lo deselecciona (regresa a '')
    chips[0].click();
    fixture.detectChanges();
    expect(control.value).toBe('');
  });

  it('renderiza el checkbox simple como chip individual', () => {
    const campo: CampoFormulario = { clave: 'eyectado', etiqueta: 'Eyectado', tipo: 'checkbox' };
    const control = new FormControl(false);
    fixture.componentInstance.campo = campo;
    fixture.componentInstance.control = control;
    fixture.detectChanges();

    const chip: HTMLButtonElement = fixture.nativeElement.querySelector('button.chip');
    expect(chip).toBeTruthy();
    expect(chip.textContent).toContain('Eyectado');

    chip.click();
    fixture.detectChanges();
    expect(control.value).toBe(true);

    chip.click();
    fixture.detectChanges();
    expect(control.value).toBe(false);
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

  it('tipo "imagenes" ofrece botones separados de "Tomar foto" (cámara) y "Subir imagen" (archivo/galería)', () => {
    const campo: CampoFormulario = { clave: 'imagenesEkgRxLaboratorios', etiqueta: 'Imágenes', tipo: 'imagenes' };
    fixture.componentInstance.campo = campo;
    fixture.componentInstance.control = new FormControl<string[]>([]);
    fixture.detectChanges();

    const botones: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('.acciones-imagenes button'));
    expect(botones.map(b => b.textContent!.trim())).toEqual(['📷 Tomar foto', '🖼️ Subir imagen']);

    const inputs: HTMLInputElement[] = Array.from(fixture.nativeElement.querySelectorAll('input[type="file"]'));
    expect(inputs.length).toBe(2);
    // El de cámara pide "capture" para que el celular abra la cámara directo en vez
    // de la galería; el de subir archivo no lo lleva y sí acepta varios a la vez.
    expect(inputs[0].getAttribute('capture')).toBe('environment');
    expect(inputs[0].multiple).toBeFalse();
    expect(inputs[1].hasAttribute('capture')).toBeFalse();
    expect(inputs[1].multiple).toBeTrue();
  });

  it('renderiza miniaturas al agregar una imagen (desde cualquiera de los dos inputs) y permite quitarlas', (done) => {
    const campo: CampoFormulario = { clave: 'imagenesEkgRxLaboratorios', etiqueta: 'Imágenes', tipo: 'imagenes' };
    const control = new FormControl<string[]>([]);
    fixture.componentInstance.campo = campo;
    fixture.componentInstance.control = control;
    fixture.detectChanges();

    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[type="file"]');
    expect(input).toBeTruthy();

    const archivo = new File(['contenido'], 'ekg.png', { type: 'image/png' });
    Object.defineProperty(input, 'files', { value: [archivo] });
    input.dispatchEvent(new Event('change'));

    // FileReader es asíncrono incluso en jsdom/karma; esperamos a que el control se actualice.
    const esperar = setInterval(() => {
      if (control.value!.length === 1) {
        clearInterval(esperar);
        expect(control.value![0]).toContain('data:image/png;base64');
        fixture.detectChanges();

        const miniaturas = fixture.nativeElement.querySelectorAll('.miniatura');
        expect(miniaturas.length).toBe(1);

        const quitar: HTMLButtonElement = fixture.nativeElement.querySelector('.quitar-imagen');
        quitar.click();
        expect(control.value).toEqual([]);
        done();
      }
    }, 10);
  });

  it('renderiza un mat-datepicker para tipo "fecha": arranca desde el string guardado y al elegir una fecha vuelve a escribir un string "YYYY-MM-DD" en el FormControl externo', () => {
    const campo: CampoFormulario = { clave: 'fecha', etiqueta: 'Fecha', tipo: 'fecha' };
    const control = new FormControl('2026-03-05');
    fixture.componentInstance.campo = campo;
    fixture.componentInstance.control = control;
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('mat-datepicker-toggle')).toBeTruthy();
    const interno = fixture.componentInstance.controlFechaHora.value!;
    expect(interno.getFullYear()).toBe(2026);
    expect(interno.getMonth()).toBe(2); // marzo = índice 2
    expect(interno.getDate()).toBe(5);

    // Simula al usuario eligiendo una fecha en el calendario.
    fixture.componentInstance.controlFechaHora.setValue(new Date(2026, 8, 20));
    expect(control.value).toBe('2026-09-20');
  });

  it('renderiza un mat-timepicker para tipo "hora": arranca desde el string guardado y al elegir una hora vuelve a escribir un string "HH:mm" en el FormControl externo', () => {
    const campo: CampoFormulario = { clave: 'horaSalida', etiqueta: 'Hora de salida', tipo: 'hora' };
    const control = new FormControl('08:05');
    fixture.componentInstance.campo = campo;
    fixture.componentInstance.control = control;
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('mat-timepicker-toggle')).toBeTruthy();
    const interno = fixture.componentInstance.controlFechaHora.value!;
    expect(interno.getHours()).toBe(8);
    expect(interno.getMinutes()).toBe(5);

    // Simula al usuario eligiendo una hora en el selector.
    const elegida = new Date(2000, 0, 1);
    elegida.setHours(23, 45, 0, 0);
    fixture.componentInstance.controlFechaHora.setValue(elegida);
    expect(control.value).toBe('23:45');
  });

  it('un campo "fecha"/"hora" sin valor guardado arranca con el datepicker/timepicker interno en null', () => {
    const campo: CampoFormulario = { clave: 'fecha', etiqueta: 'Fecha', tipo: 'fecha' };
    const control = new FormControl('');
    fixture.componentInstance.campo = campo;
    fixture.componentInstance.control = control;
    fixture.detectChanges();

    expect(fixture.componentInstance.controlFechaHora.value).toBeNull();
  });
});
