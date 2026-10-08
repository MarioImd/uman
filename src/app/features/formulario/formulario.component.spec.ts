import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideNativeDateAdapter } from '@angular/material/core';
import { FormularioComponent } from './formulario.component';
import { REGISTRO_SERVICE, RegistroService } from '../../core/services/registro.service';
import { crearRegistroVacio } from '../../core/models/registro.model';
import { SECCIONES } from '../../core/data/secciones.data';

describe('FormularioComponent', () => {
  let fixture: ComponentFixture<FormularioComponent>;
  let servicioFalso: jasmine.SpyObj<RegistroService>;

  beforeEach(async () => {
    servicioFalso = jasmine.createSpyObj<RegistroService>('RegistroService', ['guardar', 'obtener', 'listar', 'eliminar']);
    servicioFalso.listar.and.resolveTo([]);
    servicioFalso.guardar.and.callFake(async r => r);

    await TestBed.configureTestingModule({
      imports: [FormularioComponent],
      providers: [{ provide: REGISTRO_SERVICE, useValue: servicioFalso }, provideNativeDateAdapter()],
    }).compileComponents();

    fixture = TestBed.createComponent(FormularioComponent);
    fixture.detectChanges();
  });

  it('inicia en el paso 0 mostrando solo la primera sección', () => {
    expect(fixture.componentInstance.pasoActual).toBe(0);
    const pasos = fixture.nativeElement.querySelectorAll('app-seccion-paso');
    expect(pasos.length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain(SECCIONES[0].titulo);
  });

  it('avanzar() muestra la siguiente sección y retroceder() regresa', () => {
    fixture.componentInstance.avanzar();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(SECCIONES[1].titulo);

    fixture.componentInstance.retroceder();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(SECCIONES[0].titulo);
  });

  it('el último paso sigue mostrando app-seccion-paso (la última sección del catálogo)', () => {
    fixture.componentInstance.irAPaso(fixture.componentInstance.totalPasos - 1);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('app-seccion-paso').length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain(SECCIONES[SECCIONES.length - 1].titulo);
  });

  it('el select de saltar a sección lista todas las secciones', () => {
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('select.salto-seccion');
    expect(select).toBeTruthy();
    expect(select.options.length).toBe(SECCIONES.length);
  });

  it('Anterior se deshabilita en el primer paso; en el último paso "Siguiente" se reemplaza por "Enviar al Historial"', () => {
    const anterior: HTMLButtonElement = fixture.nativeElement.querySelector('button.paso-anterior');
    expect(anterior.disabled).toBeTrue();
    expect(fixture.nativeElement.querySelector('button.paso-siguiente')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('button.enviar-historial')).toBeFalsy();

    fixture.componentInstance.irAPaso(fixture.componentInstance.totalPasos - 1);
    fixture.detectChanges();
    expect(anterior.disabled).toBeFalse();
    expect(fixture.nativeElement.querySelector('button.paso-siguiente')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('button.enviar-historial')).toBeTruthy();
  });

  it('"Enviar al Historial" guarda, exporta el PDF y emite enviarAlHistorial', fakeAsync(() => {
    spyOn(window, 'print');
    let emitido = false;
    fixture.componentInstance.enviarAlHistorial.subscribe(() => (emitido = true));

    fixture.componentInstance.irAPaso(fixture.componentInstance.totalPasos - 1);
    fixture.detectChanges();

    const boton: HTMLButtonElement = fixture.nativeElement.querySelector('button.enviar-historial');
    boton.click();
    tick();

    expect(servicioFalso.guardar).toHaveBeenCalled();
    expect(window.print).toHaveBeenCalled();
    expect(emitido).toBeTrue();
  }));

  it('un cambio en el formulario dispara guardar() (autosave) después del debounce', fakeAsync(() => {
    tick();
    fixture.componentInstance.form.get('datosGenerales')!.get('folio')!.setValue('12345');
    tick(1500);
    expect(servicioFalso.guardar).toHaveBeenCalled();
  }));

  it('el botón "Guardar borrador" también dispara guardar() de inmediato', () => {
    const boton: HTMLButtonElement = fixture.nativeElement.querySelector('button.guardar-borrador');
    boton.click();
    expect(servicioFalso.guardar).toHaveBeenCalled();
  });

  it('exportarPdf() llama a window.print()', () => {
    spyOn(window, 'print');
    fixture.componentInstance.exportarPdf();
    expect(window.print).toHaveBeenCalled();
  });

  it('exportarPdf() toma una foto (snapshot) del formulario para app-pdf-vista en vez de leer form.getRawValue() en cada ciclo', () => {
    spyOn(window, 'print');
    expect(fixture.componentInstance.snapshotParaImpresion).toBeUndefined();

    fixture.componentInstance.form.get('datosGenerales')!.get('folio')!.setValue('PDF-1');
    fixture.componentInstance.exportarPdf();

    expect((fixture.componentInstance.snapshotParaImpresion as any).datosGenerales.folio).toBe('PDF-1');
  });

  it('el botón "Exportar Excel" llama a ExcelExportadorService.exportar()', () => {
    spyOn(fixture.componentInstance['excelExportador'], 'exportar');
    const boton: HTMLButtonElement = fixture.nativeElement.querySelector('button.exportar-excel');
    boton.click();
    expect(fixture.componentInstance['excelExportador'].exportar).toHaveBeenCalled();
  });

  it('muestra un indicador de "Guardado" tras un guardado exitoso', fakeAsync(() => {
    fixture.componentInstance.guardarBorrador();
    tick();
    expect(fixture.componentInstance.estadoGuardado).toContain('Guardado');
  }));

  it('muestra "Error al guardar" cuando registroService.guardar() rechaza la promesa', fakeAsync(() => {
    servicioFalso.guardar.and.rejectWith(new Error('fallo de guardado'));
    fixture.componentInstance.guardarBorrador();
    tick();
    expect(fixture.componentInstance.estadoGuardado).toBe('Error al guardar');
  }));

  it('el botón "Nuevo registro" limpia el formulario y un guardado posterior persiste un id distinto al original', fakeAsync(() => {
    const idOriginal = fixture.componentInstance['registroActual'].id;
    fixture.componentInstance.form.get('datosGenerales')!.get('folio')!.setValue('ALGO');

    const boton: HTMLButtonElement = fixture.nativeElement.querySelector('button.nuevo-registro');
    boton.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.form.get('datosGenerales')!.get('folio')!.value).toBe('');

    fixture.componentInstance.guardarBorrador();
    tick();
    const registroGuardado = servicioFalso.guardar.calls.mostRecent().args[0];
    expect(registroGuardado.id).not.toBe(idOriginal);
  }));

  it('el botón "Nuevo registro" deja el autosave funcionando sobre el formulario nuevo', fakeAsync(() => {
    const boton: HTMLButtonElement = fixture.nativeElement.querySelector('button.nuevo-registro');
    boton.click();
    fixture.detectChanges();
    tick();

    servicioFalso.guardar.calls.reset();
    fixture.componentInstance.form.get('datosGenerales')!.get('folio')!.setValue('NUEVO');
    tick(1500);
    expect(servicioFalso.guardar).toHaveBeenCalled();
  }));

  it('el folio capturado en datosGenerales se mapea al campo plano registro.folio al guardar y al exportar a Excel', () => {
    fixture.componentInstance.form.get('datosGenerales')!.get('folio')!.setValue('F-999');

    fixture.componentInstance.guardarBorrador();
    expect(servicioFalso.guardar).toHaveBeenCalledWith(jasmine.objectContaining({ folio: 'F-999' }));

    const exportarSpy = spyOn(fixture.componentInstance['excelExportador'], 'exportar');
    fixture.componentInstance.exportarExcel();
    expect(exportarSpy).toHaveBeenCalledWith(jasmine.objectContaining({ folio: 'F-999' }));
  });
});

describe('FormularioComponent con un registro existente', () => {
  let fixture: ComponentFixture<FormularioComponent>;
  let servicioFalso: jasmine.SpyObj<RegistroService>;
  const registroGuardado = { ...crearRegistroVacio(), folio: 'FOLIO-EXISTENTE' };

  beforeEach(async () => {
    servicioFalso = jasmine.createSpyObj<RegistroService>('RegistroService', ['guardar', 'obtener', 'listar', 'eliminar']);
    servicioFalso.listar.and.resolveTo([registroGuardado]);
    servicioFalso.guardar.and.callFake(async r => r);

    await TestBed.configureTestingModule({
      imports: [FormularioComponent],
      providers: [{ provide: REGISTRO_SERVICE, useValue: servicioFalso }, provideNativeDateAdapter()],
    }).compileComponents();

    fixture = TestBed.createComponent(FormularioComponent);
  });

  it('reconstruye el formulario con los valores del registro cargado en listar()', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    expect(fixture.componentInstance.form.get('datosGenerales')!.get('folio')!.value).toBe('FOLIO-EXISTENTE');
  }));

  it('omite la recarga si el usuario ya editó el formulario mientras listar() estaba pendiente', fakeAsync(() => {
    fixture.detectChanges();
    // Simula que el usuario empezó a escribir durante la espera asíncrona de listar(),
    // antes de que la promesa se resuelva (todavía no hay tick()).
    fixture.componentInstance.form.markAsDirty();
    tick();
    expect(fixture.componentInstance.form.get('datosGenerales')!.get('folio')!.value).toBe('');
  }));
});

describe('FormularioComponent con registroInicial (abierto desde el Historial)', () => {
  let fixture: ComponentFixture<FormularioComponent>;
  let servicioFalso: jasmine.SpyObj<RegistroService>;
  const registroDelHistorial = { ...crearRegistroVacio(), folio: 'FOLIO-HISTORIAL' };
  const masReciente = { ...crearRegistroVacio(), folio: 'FOLIO-MAS-RECIENTE' };

  beforeEach(async () => {
    servicioFalso = jasmine.createSpyObj<RegistroService>('RegistroService', ['guardar', 'obtener', 'listar', 'eliminar']);
    // listar() sí tiene registros — si registroInicial no lo bloqueara, este
    // se cargaría por encima del que se pidió abrir desde el Historial.
    servicioFalso.listar.and.resolveTo([masReciente]);
    servicioFalso.guardar.and.callFake(async r => r);

    await TestBed.configureTestingModule({
      imports: [FormularioComponent],
      providers: [{ provide: REGISTRO_SERVICE, useValue: servicioFalso }, provideNativeDateAdapter()],
    }).compileComponents();

    fixture = TestBed.createComponent(FormularioComponent);
    fixture.componentInstance.registroInicial = registroDelHistorial;
  });

  it('usa el registro pasado por @Input en vez de cargar "el más reciente" de listar()', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    expect(fixture.componentInstance.form.get('datosGenerales')!.get('folio')!.value).toBe('FOLIO-HISTORIAL');
    expect(servicioFalso.listar).not.toHaveBeenCalled();
  }));

  it('arranca en el paso 0 y con el autosave suscrito', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    expect(fixture.componentInstance.pasoActual).toBe(0);

    fixture.componentInstance.form.get('datosGenerales')!.get('folio')!.setValue('EDITADO');
    tick(1500);
    expect(servicioFalso.guardar).toHaveBeenCalled();
  }));
});

describe('FormularioComponent cuando listar() rechaza la promesa (localStorage corrupto)', () => {
  let fixture: ComponentFixture<FormularioComponent>;
  let servicioFalso: jasmine.SpyObj<RegistroService>;

  beforeEach(async () => {
    servicioFalso = jasmine.createSpyObj<RegistroService>('RegistroService', ['guardar', 'obtener', 'listar', 'eliminar']);
    servicioFalso.listar.and.rejectWith(new Error('localStorage corrupto'));
    servicioFalso.guardar.and.callFake(async r => r);

    await TestBed.configureTestingModule({
      imports: [FormularioComponent],
      providers: [{ provide: REGISTRO_SERVICE, useValue: servicioFalso }, provideNativeDateAdapter()],
    }).compileComponents();

    fixture = TestBed.createComponent(FormularioComponent);
  });

  it('el autosave sigue quedando suscrito y llama a guardar() aunque listar() rechace', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    fixture.componentInstance.form.get('datosGenerales')!.get('folio')!.setValue('X');
    tick(1500);
    expect(servicioFalso.guardar).toHaveBeenCalled();
  }));
});

describe('FormularioComponent — autoguardado', () => {
  let fixture: ComponentFixture<FormularioComponent>;
  let servicioFalso: jasmine.SpyObj<RegistroService>;

  beforeEach(async () => {
    servicioFalso = jasmine.createSpyObj<RegistroService>('RegistroService', ['guardar', 'obtener', 'listar', 'eliminar']);
    servicioFalso.listar.and.resolveTo([]);

    await TestBed.configureTestingModule({
      imports: [FormularioComponent],
      providers: [{ provide: REGISTRO_SERVICE, useValue: servicioFalso }, provideNativeDateAdapter()],
    }).compileComponents();
    fixture = TestBed.createComponent(FormularioComponent);
  });

  it('los guardados salen en orden: el segundo no se envía hasta que termina el primero', fakeAsync(() => {
    const enviados: string[] = [];
    let terminarPrimero!: () => void;
    servicioFalso.guardar.and.callFake(r => {
      enviados.push(r.folio);
      if (enviados.length === 1) return new Promise(res => (terminarPrimero = () => res(r)));
      return Promise.resolve(r);
    });
    fixture.detectChanges();
    tick();

    const folio = fixture.componentInstance.form.get('datosGenerales')!.get('folio')!;
    folio.setValue('V1');
    fixture.componentInstance.guardarBorrador();
    folio.setValue('V2');
    fixture.componentInstance.guardarBorrador();
    tick();
    expect(enviados).toEqual(['V1']);

    terminarPrimero();
    tick();
    expect(enviados).toEqual(['V1', 'V2']);
    tick(1500);
  }));

  it('"Nuevo registro" justo después de escribir guarda primero lo pendiente del registro anterior', fakeAsync(() => {
    servicioFalso.guardar.and.callFake(async r => r);
    fixture.detectChanges();
    tick();
    const idAnterior = fixture.componentInstance['registroActual'].id;

    fixture.componentInstance.form.get('datosGenerales')!.get('folio')!.setValue('SIN-GUARDAR');
    tick(300); // menos que el debounce de 1 s
    fixture.componentInstance.nuevoRegistro();
    tick(1500);

    const guardado = servicioFalso.guardar.calls.all().map(c => c.args[0]).find(r => r.id === idAnterior);
    expect(guardado?.folio).toBe('SIN-GUARDAR');
  }));

  it('al salir del formulario (ngOnDestroy) guarda los cambios pendientes', fakeAsync(() => {
    servicioFalso.guardar.and.callFake(async r => r);
    fixture.detectChanges();
    tick();
    fixture.componentInstance.form.get('datosGenerales')!.get('folio')!.setValue('AL-SALIR');
    tick(200);
    fixture.destroy();
    tick(1500);
    expect(servicioFalso.guardar.calls.mostRecent().args[0].folio).toBe('AL-SALIR');
  }));
});
