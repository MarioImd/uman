import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { provideNativeDateAdapter } from '@angular/material/core';
import { FormularioComponent } from './formulario.component';
import { REGISTRO_SERVICE, RegistroService } from '../../core/services/registro.service';
import { crearRegistroVacio } from '../../core/models/registro.model';
import { SECCIONES } from '../../core/data/secciones.data';
import { SesionService } from '../../core/services/sesion.service';

const sesionFalsa = () => ({ sesionVencida: signal(false) });

describe('FormularioComponent', () => {
  let fixture: ComponentFixture<FormularioComponent>;
  let servicioFalso: jasmine.SpyObj<RegistroService>;

  beforeEach(async () => {
    servicioFalso = jasmine.createSpyObj<RegistroService>('RegistroService', ['guardar', 'obtener', 'ultimo', 'listar', 'eliminar']);
    servicioFalso.ultimo.and.resolveTo(undefined);
    servicioFalso.guardar.and.callFake(async r => ({ version: (r.version ?? 0) + 1 }));

    await TestBed.configureTestingModule({
      imports: [FormularioComponent],
      providers: [{ provide: REGISTRO_SERVICE, useValue: servicioFalso }, { provide: SesionService, useValue: sesionFalsa() }, provideNativeDateAdapter()],
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
    servicioFalso = jasmine.createSpyObj<RegistroService>('RegistroService', ['guardar', 'obtener', 'ultimo', 'listar', 'eliminar']);
    servicioFalso.ultimo.and.resolveTo(registroGuardado);
    servicioFalso.guardar.and.callFake(async r => ({ version: (r.version ?? 0) + 1 }));

    await TestBed.configureTestingModule({
      imports: [FormularioComponent],
      providers: [{ provide: REGISTRO_SERVICE, useValue: servicioFalso }, { provide: SesionService, useValue: sesionFalsa() }, provideNativeDateAdapter()],
    }).compileComponents();

    fixture = TestBed.createComponent(FormularioComponent);
  });

  it('reconstruye el formulario con los valores del registro devuelto por ultimo()', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    expect(fixture.componentInstance.form.get('datosGenerales')!.get('folio')!.value).toBe('FOLIO-EXISTENTE');
  }));

  it('omite la recarga si el usuario ya editó el formulario mientras ultimo() estaba pendiente', fakeAsync(() => {
    fixture.detectChanges();
    // Simula que el usuario empezó a escribir durante la espera asíncrona de ultimo(),
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
    servicioFalso = jasmine.createSpyObj<RegistroService>('RegistroService', ['guardar', 'obtener', 'ultimo', 'listar', 'eliminar']);
    // ultimo() sí tiene registro: si registroInicial no lo bloqueara, este se
    // cargaría por encima del que se pidió abrir desde el Historial.
    servicioFalso.ultimo.and.resolveTo(masReciente);
    servicioFalso.obtener.and.resolveTo(registroDelHistorial);
    servicioFalso.guardar.and.callFake(async r => ({ version: (r.version ?? 0) + 1 }));

    await TestBed.configureTestingModule({
      imports: [FormularioComponent],
      providers: [{ provide: REGISTRO_SERVICE, useValue: servicioFalso }, { provide: SesionService, useValue: sesionFalsa() }, provideNativeDateAdapter()],
    }).compileComponents();

    fixture = TestBed.createComponent(FormularioComponent);
    fixture.componentInstance.registroInicial = registroDelHistorial;
  });

  it('usa el registro pasado por @Input en vez de cargar el último propio', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    expect(fixture.componentInstance.form.get('datosGenerales')!.get('folio')!.value).toBe('FOLIO-HISTORIAL');
    expect(servicioFalso.ultimo).not.toHaveBeenCalled();
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

describe('FormularioComponent cuando ultimo() rechaza la promesa', () => {
  let fixture: ComponentFixture<FormularioComponent>;
  let servicioFalso: jasmine.SpyObj<RegistroService>;

  beforeEach(async () => {
    servicioFalso = jasmine.createSpyObj<RegistroService>('RegistroService', ['guardar', 'obtener', 'ultimo', 'listar', 'eliminar']);
    servicioFalso.ultimo.and.rejectWith(new Error('sin conexión'));
    servicioFalso.guardar.and.callFake(async r => ({ version: (r.version ?? 0) + 1 }));

    await TestBed.configureTestingModule({
      imports: [FormularioComponent],
      providers: [{ provide: REGISTRO_SERVICE, useValue: servicioFalso }, { provide: SesionService, useValue: sesionFalsa() }, provideNativeDateAdapter()],
    }).compileComponents();

    fixture = TestBed.createComponent(FormularioComponent);
  });

  it('el autosave sigue quedando suscrito y llama a guardar() aunque ultimo() rechace', fakeAsync(() => {
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
    servicioFalso = jasmine.createSpyObj<RegistroService>('RegistroService', ['guardar', 'obtener', 'ultimo', 'listar', 'eliminar']);
    servicioFalso.ultimo.and.resolveTo(undefined);

    await TestBed.configureTestingModule({
      imports: [FormularioComponent],
      providers: [{ provide: REGISTRO_SERVICE, useValue: servicioFalso }, { provide: SesionService, useValue: sesionFalsa() }, provideNativeDateAdapter()],
    }).compileComponents();
    fixture = TestBed.createComponent(FormularioComponent);
  });

  it('los guardados salen en orden: el segundo no se envía hasta que termina el primero', fakeAsync(() => {
    const enviados: string[] = [];
    let terminarPrimero!: () => void;
    servicioFalso.guardar.and.callFake(r => {
      enviados.push(r.folio);
      if (enviados.length === 1) return new Promise(res => (terminarPrimero = () => res({ version: 1 })));
      return Promise.resolve({ version: 2 });
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
    servicioFalso.guardar.and.callFake(async r => ({ version: (r.version ?? 0) + 1 }));
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
    servicioFalso.guardar.and.callFake(async r => ({ version: (r.version ?? 0) + 1 }));
    fixture.detectChanges();
    tick();
    fixture.componentInstance.form.get('datosGenerales')!.get('folio')!.setValue('AL-SALIR');
    tick(200);
    fixture.destroy();
    tick(1500);
    expect(servicioFalso.guardar.calls.mostRecent().args[0].folio).toBe('AL-SALIR');
  }));
});

describe('FormularioComponent — versiones y errores del servidor', () => {
  let fixture: ComponentFixture<FormularioComponent>;
  let servicioFalso: jasmine.SpyObj<RegistroService>;
  let sesion: ReturnType<typeof sesionFalsa>;
  const error = (status: number, codigo?: string) => new HttpErrorResponse({ status, error: { codigo } });
  const folio = () => fixture.componentInstance.form.get('datosGenerales')!.get('folio')!;
  const texto = () => fixture.nativeElement.textContent as string;

  beforeEach(async () => {
    servicioFalso = jasmine.createSpyObj<RegistroService>('RegistroService', ['guardar', 'obtener', 'ultimo', 'listar', 'eliminar']);
    servicioFalso.ultimo.and.resolveTo(undefined);
    servicioFalso.guardar.and.callFake(async r => ({ version: (r.version ?? 0) + 1 }));
    sesion = sesionFalsa();

    await TestBed.configureTestingModule({
      imports: [FormularioComponent],
      providers: [{ provide: REGISTRO_SERVICE, useValue: servicioFalso }, { provide: SesionService, useValue: sesion }, provideNativeDateAdapter()],
    }).compileComponents();
    fixture = TestBed.createComponent(FormularioComponent);
  });

  const iniciar = () => {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
  };

  it('al iniciar llama ultimo y nunca listar', fakeAsync(() => {
    iniciar();
    expect(servicioFalso.ultimo).toHaveBeenCalledTimes(1);
    expect(servicioFalso.listar).not.toHaveBeenCalled();
  }));

  it('sin registros propios queda en blanco y con autosave', fakeAsync(() => {
    iniciar();
    expect(folio().value).toBe('');
    folio().setValue('NUEVO');
    tick(1500);
    expect(servicioFalso.guardar).toHaveBeenCalled();
  }));

  it('usa la version del registro cargado', fakeAsync(() => {
    servicioFalso.ultimo.and.resolveTo({ ...crearRegistroVacio(), version: 7 });
    iniciar();
    fixture.componentInstance.guardarBorrador();
    tick();
    expect(servicioFalso.guardar.calls.mostRecent().args[0].version).toBe(7);
  }));

  it('dos guardados seguidos usan la version devuelta por el anterior', fakeAsync(() => {
    iniciar();
    fixture.componentInstance.guardarBorrador();
    fixture.componentInstance.guardarBorrador();
    tick();
    expect(servicioFalso.guardar.calls.allArgs().map(([r]) => r.version)).toEqual([0, 1]);
  }));

  it('un guardado encolado del registro anterior usa la version de ese registro', fakeAsync(() => {
    iniciar();
    let terminar!: () => void;
    servicioFalso.guardar.and.callFake(r => {
      if (r.folio === 'A1') return new Promise(res => (terminar = () => res({ version: 1 })));
      return Promise.resolve({ version: (r.version ?? 0) + 1 });
    });
    const idAnterior = fixture.componentInstance['registroActual'].id;
    folio().setValue('A1');
    fixture.componentInstance.guardarBorrador();
    folio().setValue('A2');
    fixture.componentInstance.guardarBorrador();
    fixture.componentInstance.cargarRegistro({ ...crearRegistroVacio(), folio: 'B', version: 50 });
    fixture.componentInstance.guardarBorrador();
    terminar();
    tick();
    const llamadas = servicioFalso.guardar.calls.allArgs().map(([r]) => r);
    expect(llamadas.find(r => r.folio === 'A2' && r.id === idAnterior)?.version).toBe(1);
    expect(llamadas.find(r => r.folio === 'B')?.version).toBe(50);
    tick(1500);
  }));

  it('con 409 conflicto deja de autoguardar, avisa y conserva el formulario', fakeAsync(() => {
    iniciar();
    servicioFalso.guardar.and.rejectWith(error(409, 'conflicto'));
    folio().setValue('MI-CAMBIO');
    fixture.componentInstance.guardarBorrador();
    tick();
    fixture.detectChanges();
    expect(texto()).toContain('Otra persona modificó este registro');
    expect(folio().value).toBe('MI-CAMBIO');

    servicioFalso.guardar.calls.reset();
    folio().setValue('OTRO-CAMBIO');
    tick(1500);
    fixture.componentInstance.guardarBorrador();
    tick();
    expect(servicioFalso.guardar).not.toHaveBeenCalled();
  }));

  it('Recargar trae la versión del servidor y reactiva el autosave', fakeAsync(() => {
    iniciar();
    servicioFalso.guardar.and.rejectWith(error(409, 'conflicto'));
    fixture.componentInstance.guardarBorrador();
    tick();
    fixture.detectChanges();

    const id = fixture.componentInstance['registroActual'].id;
    servicioFalso.obtener.and.resolveTo({ ...crearRegistroVacio(), id, folio: 'DEL-OTRO', version: 9 });
    servicioFalso.guardar.and.callFake(async r => ({ version: (r.version ?? 0) + 1 }));
    fixture.nativeElement.querySelector('button.recargar').click();
    tick();
    fixture.detectChanges();

    expect(folio().value).toBe('DEL-OTRO');
    expect(texto()).not.toContain('Otra persona modificó este registro');
    servicioFalso.guardar.calls.reset();
    folio().setValue('SIGO');
    tick(1500);
    expect(servicioFalso.guardar.calls.mostRecent().args[0].version).toBe(9);
  }));

  it('con 409 eliminado avisa y deja de autoguardar', fakeAsync(() => {
    iniciar();
    servicioFalso.guardar.and.rejectWith(error(409, 'eliminado'));
    fixture.componentInstance.guardarBorrador();
    tick();
    fixture.detectChanges();
    expect(texto()).toContain('Este registro fue eliminado');

    servicioFalso.guardar.calls.reset();
    folio().setValue('X');
    tick(1500);
    expect(servicioFalso.guardar).not.toHaveBeenCalled();
  }));

  it('un 409 de un guardado del registro anterior no bloquea el registro actual', fakeAsync(() => {
    iniciar();
    let rechazar!: () => void;
    servicioFalso.guardar.and.returnValue(new Promise((_, rej) => (rechazar = () => rej(error(409, 'conflicto')))));
    fixture.componentInstance.guardarBorrador();
    fixture.componentInstance.nuevoRegistro();
    rechazar();
    tick();
    fixture.detectChanges();
    expect(texto()).not.toContain('Otra persona modificó este registro');
    tick(1500);
  }));

  it('"Enviar al Historial" no continúa si el registro quedó bloqueado por un choque', fakeAsync(() => {
    iniciar();
    spyOn(window, 'print');
    servicioFalso.guardar.and.rejectWith(error(409, 'conflicto'));
    let emitido = false;
    fixture.componentInstance.enviarAlHistorial.subscribe(() => (emitido = true));
    fixture.componentInstance.enviarYVerHistorial();
    tick();
    expect(emitido).toBeFalse();
    expect(window.print).not.toHaveBeenCalled();
  }));

  it('con 401 conserva lo pendiente y lo reenvía al volver la sesión', fakeAsync(() => {
    iniciar();
    servicioFalso.guardar.and.rejectWith(error(401));
    folio().setValue('CAPTURA');
    sesion.sesionVencida.set(true);
    fixture.componentInstance.guardarBorrador();
    tick();
    fixture.detectChanges();
    expect(fixture.componentInstance.estadoGuardado).toBe('Sesión vencida');

    servicioFalso.guardar.calls.reset();
    servicioFalso.guardar.and.callFake(async r => ({ version: (r.version ?? 0) + 1 }));
    sesion.sesionVencida.set(false);
    fixture.detectChanges();
    tick();
    expect(servicioFalso.guardar.calls.mostRecent().args[0].folio).toBe('CAPTURA');
    expect(fixture.componentInstance.estadoGuardado).toContain('Guardado');
  }));

  it('con 413 muestra que el registro es demasiado grande', fakeAsync(() => {
    iniciar();
    servicioFalso.guardar.and.rejectWith(error(413));
    fixture.componentInstance.guardarBorrador();
    tick();
    fixture.detectChanges();
    expect(texto()).toContain('demasiado grande');
  }));
});

describe('FormularioComponent — al abrir desde el Historial falla la carga', () => {
  let fixture: ComponentFixture<FormularioComponent>;
  let servicioFalso: jasmine.SpyObj<RegistroService>;
  const registro = { ...crearRegistroVacio(), folio: 'ABIERTO' };

  beforeEach(async () => {
    servicioFalso = jasmine.createSpyObj<RegistroService>('RegistroService', ['guardar', 'obtener', 'ultimo', 'listar', 'eliminar']);
    servicioFalso.guardar.and.callFake(async r => ({ version: (r.version ?? 0) + 1 }));
    await TestBed.configureTestingModule({
      imports: [FormularioComponent],
      providers: [{ provide: REGISTRO_SERVICE, useValue: servicioFalso }, { provide: SesionService, useValue: sesionFalsa() }, provideNativeDateAdapter()],
    }).compileComponents();
    fixture = TestBed.createComponent(FormularioComponent);
    fixture.componentInstance.registroInicial = registro;
  });

  it('si falla obtener al abrir, no se autoguarda sobre ese registro', fakeAsync(() => {
    servicioFalso.obtener.and.rejectWith(new Error('sin conexión'));
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No se pudo abrir el trámite');
    expect(fixture.nativeElement.querySelector('app-seccion-paso')).toBeFalsy();
    fixture.componentInstance.form.get('datosGenerales')!.get('folio')!.setValue('X');
    tick(1500);
    expect(servicioFalso.guardar).not.toHaveBeenCalled();
  }));

  it('Reintentar abre el trámite si el servidor ya responde', fakeAsync(() => {
    servicioFalso.obtener.and.rejectWith(new Error('sin conexión'));
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    servicioFalso.obtener.and.resolveTo(registro);
    fixture.nativeElement.querySelector('button.reintentar').click();
    tick();
    fixture.detectChanges();
    expect(fixture.componentInstance.form.get('datosGenerales')!.get('folio')!.value).toBe('ABIERTO');
    expect(fixture.nativeElement.querySelector('app-seccion-paso')).toBeTruthy();
  }));

  it('si el trámite ya no existe lo dice y permite empezar uno nuevo', fakeAsync(() => {
    servicioFalso.obtener.and.resolveTo(undefined);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Ese trámite ya no existe');

    fixture.nativeElement.querySelector('button.empezar-nuevo').click();
    tick();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-seccion-paso')).toBeTruthy();
    expect(fixture.componentInstance.form.get('datosGenerales')!.get('folio')!.value).toBe('');
  }));
});
