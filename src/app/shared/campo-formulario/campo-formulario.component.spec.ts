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

  it('"Tomar foto" activa la cámara en vivo (getUserMedia) y muestra el <video> con los botones Capturar/Cancelar', async () => {
    const pistaFalsa = jasmine.createSpyObj('MediaStreamTrack', ['stop']);
    const streamFalso = { getTracks: () => [pistaFalsa] } as unknown as MediaStream;
    spyOn(navigator.mediaDevices, 'getUserMedia').and.resolveTo(streamFalso);

    const campo: CampoFormulario = { clave: 'imagenesEkgRxLaboratorios', etiqueta: 'Imágenes', tipo: 'imagenes' };
    fixture.componentInstance.campo = campo;
    fixture.componentInstance.control = new FormControl<string[]>([]);
    fixture.detectChanges();

    const botonTomarFoto: HTMLButtonElement = fixture.nativeElement.querySelector('.acciones-imagenes button');
    botonTomarFoto.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ video: { facingMode: 'environment' } });
    expect(fixture.componentInstance.mostrandoCamara).toBeTrue();
    expect(fixture.nativeElement.querySelector('.camara video')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.acciones-imagenes')).toBeFalsy();

    const botonCancelar: HTMLButtonElement = fixture.nativeElement.querySelector('.camara-acciones button:last-child');
    botonCancelar.click();
    fixture.detectChanges();

    expect(pistaFalsa.stop).toHaveBeenCalled();
    expect(fixture.componentInstance.mostrandoCamara).toBeFalse();
  });

  it('"Capturar" agrega la foto tomada de la cámara en vivo al arreglo del control y cierra la cámara', async () => {
    const pistaFalsa = jasmine.createSpyObj('MediaStreamTrack', ['stop']);
    const streamFalso = { getTracks: () => [pistaFalsa] } as unknown as MediaStream;
    spyOn(navigator.mediaDevices, 'getUserMedia').and.resolveTo(streamFalso);

    const campo: CampoFormulario = { clave: 'imagenesEkgRxLaboratorios', etiqueta: 'Imágenes', tipo: 'imagenes' };
    const control = new FormControl<string[]>([]);
    fixture.componentInstance.campo = campo;
    fixture.componentInstance.control = control;
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.acciones-imagenes button').click();
    await fixture.whenStable();
    fixture.detectChanges();

    const botonCapturar: HTMLButtonElement = fixture.nativeElement.querySelector('.camara-acciones button:first-child');
    botonCapturar.click();
    fixture.detectChanges();

    expect(control.value!.length).toBe(1);
    expect(control.value![0]).toContain('data:image/jpeg;base64');
    expect(pistaFalsa.stop).toHaveBeenCalled();
    expect(fixture.componentInstance.mostrandoCamara).toBeFalse();
  });

  it('si getUserMedia rechaza (permiso denegado), muestra un mensaje de error en vez de la vista previa', async () => {
    spyOn(navigator.mediaDevices, 'getUserMedia').and.rejectWith(new Error('Permiso denegado'));

    const campo: CampoFormulario = { clave: 'imagenesEkgRxLaboratorios', etiqueta: 'Imágenes', tipo: 'imagenes' };
    fixture.componentInstance.campo = campo;
    fixture.componentInstance.control = new FormControl<string[]>([]);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.acciones-imagenes button').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.mostrandoCamara).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain('No se pudo activar la cámara');
  });

  it('si el navegador no soporta getUserMedia, "Tomar foto" recae en el input nativo con "capture"', async () => {
    spyOnProperty(navigator, 'mediaDevices').and.returnValue(undefined as unknown as MediaDevices);

    const campo: CampoFormulario = { clave: 'imagenesEkgRxLaboratorios', etiqueta: 'Imágenes', tipo: 'imagenes' };
    fixture.componentInstance.campo = campo;
    fixture.componentInstance.control = new FormControl<string[]>([]);
    fixture.detectChanges();

    const entradaFallback: HTMLInputElement = fixture.nativeElement.querySelector('input[capture="environment"]');
    const espia = spyOn(entradaFallback, 'click');

    fixture.nativeElement.querySelector('.acciones-imagenes button').click();
    await fixture.whenStable();

    expect(espia).toHaveBeenCalled();
    expect(fixture.componentInstance.mostrandoCamara).toBeFalse();
  });

  it('un campo "fecha"/"hora" sin valor guardado arranca con el datepicker/timepicker interno en null', () => {
    const campo: CampoFormulario = { clave: 'fecha', etiqueta: 'Fecha', tipo: 'fecha' };
    const control = new FormControl('');
    fixture.componentInstance.campo = campo;
    fixture.componentInstance.control = control;
    fixture.detectChanges();

    expect(fixture.componentInstance.controlFechaHora.value).toBeNull();
  });

  it('tipo "firma" permite dibujar con el dedo/mouse/lápiz óptico (Pointer Events) y guarda el trazo como PNG al soltar', () => {
    const campo: CampoFormulario = { clave: 'firmaQuienEntrega', etiqueta: 'Firma de quien entrega al paciente', tipo: 'firma' };
    const control = new FormControl('');
    fixture.componentInstance.campo = campo;
    fixture.componentInstance.control = control;
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Firma de quien entrega al paciente');
    const lienzo: HTMLCanvasElement = fixture.nativeElement.querySelector('.lienzo-firma');
    expect(lienzo).toBeTruthy();
    expect(control.value).toBe('');

    const rect = lienzo.getBoundingClientRect();
    lienzo.dispatchEvent(new PointerEvent('pointerdown', { clientX: rect.left + 10, clientY: rect.top + 10 }));
    lienzo.dispatchEvent(new PointerEvent('pointermove', { clientX: rect.left + 50, clientY: rect.top + 50 }));
    lienzo.dispatchEvent(new PointerEvent('pointerup'));

    expect(control.value).toContain('data:image/png;base64');
  });

  it('detecta el tipo de puntero (lápiz óptico de tableta, dedo o mouse) y lo muestra en pantalla', () => {
    const campo: CampoFormulario = { clave: 'firmaQuienEntrega', etiqueta: 'Firma', tipo: 'firma' };
    const control = new FormControl('');
    fixture.componentInstance.campo = campo;
    fixture.componentInstance.control = control;
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.detector-puntero')).toBeFalsy();

    const lienzo: HTMLCanvasElement = fixture.nativeElement.querySelector('.lienzo-firma');
    const rect = lienzo.getBoundingClientRect();
    lienzo.dispatchEvent(new PointerEvent('pointerdown', { clientX: rect.left + 10, clientY: rect.top + 10, pointerType: 'pen', pressure: 0.8 }));
    fixture.detectChanges();

    expect(fixture.componentInstance.tipoPuntero).toBe('pen');
    expect(fixture.nativeElement.querySelector('.detector-puntero').textContent).toContain('Lápiz óptico / tableta detectada');

    lienzo.dispatchEvent(new PointerEvent('pointerup'));
  });

  it('"Borrar firma" limpia el lienzo y vacía el control', () => {
    const campo: CampoFormulario = { clave: 'firmaQuienEntrega', etiqueta: 'Firma', tipo: 'firma' };
    const control = new FormControl('data:image/png;base64,ALGOYAFIRMADO');
    fixture.componentInstance.campo = campo;
    fixture.componentInstance.control = control;
    fixture.detectChanges();

    const boton: HTMLButtonElement = fixture.nativeElement.querySelector('.acciones-firma button');
    expect(boton.textContent).toContain('Borrar firma');
    boton.click();

    expect(control.value).toBe('');
  });

  it('si el control ya trae una firma guardada, no la borra ni la modifica al inicializar el lienzo', () => {
    const campo: CampoFormulario = { clave: 'firmaQuienEntrega', etiqueta: 'Firma', tipo: 'firma' };
    const firmaGuardada = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    const control = new FormControl(firmaGuardada);
    fixture.componentInstance.campo = campo;
    fixture.componentInstance.control = control;

    expect(() => fixture.detectChanges()).not.toThrow();
    expect(control.value).toBe(firmaGuardada);
  });
});

describe('CampoFormularioComponent — validación de lo que se escribe', () => {
  let fixture: ComponentFixture<CampoFormularioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CampoFormularioComponent],
      providers: [provideNativeDateAdapter()],
    }).compileComponents();
    fixture = TestBed.createComponent(CampoFormularioComponent);
  });

  function escribir(campo: CampoFormulario, texto: string): { input: HTMLInputElement; control: FormControl } {
    const control = new FormControl('');
    fixture.componentInstance.campo = campo;
    fixture.componentInstance.control = control;
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    input.value = texto;
    input.dispatchEvent(new Event('input'));
    return { input, control };
  }

  it('formato "letras" quita números y símbolos, pero conserva acentos, ñ, espacios, punto y guion', () => {
    const { input, control } = escribir(
      { clave: 'nombrePaciente', etiqueta: 'Nombre', tipo: 'texto', formato: 'letras' },
      'Ma. José Núñez-López 123 #@',
    );
    expect(control.value).toBe('Ma. José Núñez-López  ');
    expect(input.value).toBe('Ma. José Núñez-López  ');
  });

  it('formato "digitos" deja solo números y respeta el máximo de caracteres', () => {
    const { input, control } = escribir(
      { clave: 'telefono', etiqueta: 'Teléfono', tipo: 'texto', formato: 'digitos', maxLongitud: 10 },
      '(656) 412-1593',
    );
    expect(control.value).toBe('6564121593');
    expect(input.getAttribute('maxlength')).toBe('10');
    expect(input.getAttribute('inputmode')).toBe('numeric');
  });

  it('un texto sin formato acepta cualquier carácter', () => {
    const { control } = escribir({ clave: 'colonia', etiqueta: 'Colonia', tipo: 'texto' }, 'Col. 2 de Octubre #5');
    expect(control.value).toBe('Col. 2 de Octubre #5');
  });

  it('un número bloquea "e", "+" y "-", y además "." si el campo es entero', () => {
    fixture.componentInstance.campo = { clave: 'edadAnios', etiqueta: 'Edad', tipo: 'numero', min: 0, max: 120, entero: true };
    fixture.componentInstance.control = new FormControl('');
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[type="number"]');

    for (const tecla of ['e', '+', '-', '.']) {
      const evento = new KeyboardEvent('keydown', { key: tecla, cancelable: true });
      input.dispatchEvent(evento);
      expect(evento.defaultPrevented).withContext(tecla).toBeTrue();
    }
    const digito = new KeyboardEvent('keydown', { key: '7', cancelable: true });
    input.dispatchEvent(digito);
    expect(digito.defaultPrevented).toBeFalse();
  });

  it('un número decimal (sin "entero") sí permite el punto', () => {
    fixture.componentInstance.campo = { clave: 'temp', etiqueta: 'Temp', tipo: 'numero', min: 25, max: 45 };
    fixture.componentInstance.control = new FormControl('');
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[type="number"]');
    const punto = new KeyboardEvent('keydown', { key: '.', cancelable: true });
    input.dispatchEvent(punto);
    expect(punto.defaultPrevented).toBeFalse();
  });
});
