import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
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
      providers: [{ provide: REGISTRO_SERVICE, useValue: servicioFalso }],
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

  it('Anterior se deshabilita en el primer paso y Siguiente en el último', () => {
    const anterior: HTMLButtonElement = fixture.nativeElement.querySelector('button.paso-anterior');
    const siguiente: HTMLButtonElement = fixture.nativeElement.querySelector('button.paso-siguiente');
    expect(anterior.disabled).toBeTrue();
    expect(siguiente.disabled).toBeFalse();

    fixture.componentInstance.irAPaso(fixture.componentInstance.totalPasos - 1);
    fixture.detectChanges();
    expect(anterior.disabled).toBeFalse();
    expect(siguiente.disabled).toBeTrue();
  });

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

  it('el botón "Exportar PDF" llama a window.print()', () => {
    spyOn(window, 'print');
    const boton: HTMLButtonElement = fixture.nativeElement.querySelector('button.exportar-pdf');
    boton.click();
    expect(window.print).toHaveBeenCalled();
  });

  it('el botón "Exportar PDF" toma una foto (snapshot) del formulario para app-pdf-vista en vez de leer form.getRawValue() en cada ciclo', () => {
    spyOn(window, 'print');
    expect(fixture.componentInstance.snapshotParaImpresion).toBeUndefined();

    fixture.componentInstance.form.get('datosGenerales')!.get('folio')!.setValue('PDF-1');
    const boton: HTMLButtonElement = fixture.nativeElement.querySelector('button.exportar-pdf');
    boton.click();

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
      providers: [{ provide: REGISTRO_SERVICE, useValue: servicioFalso }],
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

describe('FormularioComponent cuando listar() rechaza la promesa (localStorage corrupto)', () => {
  let fixture: ComponentFixture<FormularioComponent>;
  let servicioFalso: jasmine.SpyObj<RegistroService>;

  beforeEach(async () => {
    servicioFalso = jasmine.createSpyObj<RegistroService>('RegistroService', ['guardar', 'obtener', 'listar', 'eliminar']);
    servicioFalso.listar.and.rejectWith(new Error('localStorage corrupto'));
    servicioFalso.guardar.and.callFake(async r => r);

    await TestBed.configureTestingModule({
      imports: [FormularioComponent],
      providers: [{ provide: REGISTRO_SERVICE, useValue: servicioFalso }],
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
