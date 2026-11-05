import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { provideNativeDateAdapter } from '@angular/material/core';
import { FormularioComponent } from './formulario.component';
import { REGISTRO_SERVICE, RegistroService } from '../../core/services/registro.service';
import { crearRegistroVacio } from '../../core/models/registro.model';
import { SECCIONES } from '../../core/data/secciones.data';
import { SesionService } from '../../core/services/sesion.service';

const sesionFalsa = () => ({ sesionVencida: signal(false), usuario: signal<{ limiteBytes?: number } | null>(null) });
const tamanoEnviado = (registro: unknown) => new Blob([JSON.stringify(registro)]).size;

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
    await fixture.whenStable();
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
    fixture.destroy();
  }));

  it('el botón "Nuevo registro" limpia el formulario y un guardado posterior persiste un id distinto al original', fakeAsync(() => {
    const idOriginal = fixture.componentInstance['registroActual'].id;
    fixture.componentInstance.form.get('datosGenerales')!.get('folio')!.setValue('ALGO');

    const boton: HTMLButtonElement = fixture.nativeElement.querySelector('button.nuevo-registro');
    boton.click();
    tick();
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

  it('no muestra el formulario hasta saber qué registro cargar', fakeAsync(() => {
    let responder!: (r: typeof registroGuardado) => void;
    servicioFalso.ultimo.and.returnValue(new Promise(r => (responder = r)));
    fixture.detectChanges();
    tick(100);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-seccion-paso')).toBeFalsy();
    expect(fixture.nativeElement.textContent).toContain('Cargando');
    responder(registroGuardado);
    tick();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-seccion-paso')).toBeTruthy();
  }));

  it('si ultimo tarda demasiado abre en blanco e ignora la respuesta tardía', fakeAsync(() => {
    let responder!: (r: typeof registroGuardado) => void;
    servicioFalso.ultimo.and.returnValue(new Promise(r => (responder = r)));
    fixture.detectChanges();
    tick(8000);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-seccion-paso')).toBeTruthy();
    responder(registroGuardado);
    tick();
    expect(fixture.componentInstance.form.get('datosGenerales')!.get('folio')!.value).toBe('');
  }));

  it('muestra qué registro se está editando', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.registro-en-edicion').textContent).toContain('FOLIO-EXISTENTE');
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
    spyOn(window, 'confirm').and.returnValue(true);
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
    fixture.componentInstance.cargarRegistro(crearRegistroVacio());
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

  it('guardarPendientes guarda lo escrito y espera a que termine', fakeAsync(() => {
    iniciar();
    let terminar!: () => void;
    servicioFalso.guardar.and.returnValue(new Promise(res => (terminar = () => res({ version: 1 }))));
    folio().setValue('PENDIENTE');
    let listo = false;
    fixture.componentInstance.guardarPendientes().then(() => (listo = true));
    tick();
    expect(servicioFalso.guardar.calls.mostRecent().args[0].folio).toBe('PENDIENTE');
    expect(listo).toBeFalse();
    terminar();
    tick();
    expect(listo).toBeTrue();
    tick(1500);
  }));

  it('un guardado fallido se reintenta solo y avisa mientras tanto', fakeAsync(() => {
    iniciar();
    servicioFalso.guardar.and.rejectWith(error(0));
    folio().setValue('SIN-SENAL');
    fixture.componentInstance.guardarBorrador();
    tick();
    fixture.detectChanges();
    expect(texto()).toContain('No se pudo guardar');

    servicioFalso.guardar.and.callFake(async r => ({ version: (r.version ?? 0) + 1 }));
    tick(10000);
    fixture.detectChanges();
    expect(servicioFalso.guardar.calls.mostRecent().args[0].folio).toBe('SIN-SENAL');
    expect(fixture.componentInstance.estadoGuardado).toContain('Guardado');
    expect(texto()).not.toContain('No se pudo guardar');
    tick(1500);
  }));

  it('Nuevo registro con un guardado fallido pide confirmación y cancelar conserva lo capturado', fakeAsync(() => {
    iniciar();
    servicioFalso.guardar.and.rejectWith(error(500));
    folio().setValue('IMPORTANTE');
    fixture.componentInstance.guardarBorrador();
    tick();
    spyOn(window, 'confirm').and.returnValue(false);
    fixture.componentInstance.nuevoRegistro();
    tick();
    expect(window.confirm).toHaveBeenCalled();
    expect(folio().value).toBe('IMPORTANTE');
    fixture.destroy();
  }));

  it('Nuevo registro con un guardado fallido descarta solo si la persona confirma', fakeAsync(() => {
    iniciar();
    servicioFalso.guardar.and.rejectWith(error(500));
    folio().setValue('DESCARTABLE');
    fixture.componentInstance.guardarBorrador();
    tick();
    spyOn(window, 'confirm').and.returnValue(true);
    fixture.componentInstance.nuevoRegistro();
    tick();
    expect(folio().value).toBe('');
    servicioFalso.guardar.calls.reset();
    tick(10000);
    expect(servicioFalso.guardar).not.toHaveBeenCalled();
  }));

  it('Enviar al Historial no continúa si el guardado falla', fakeAsync(() => {
    iniciar();
    spyOn(window, 'print');
    servicioFalso.guardar.and.rejectWith(error(0));
    let emitido = false;
    fixture.componentInstance.enviarAlHistorial.subscribe(() => (emitido = true));
    fixture.componentInstance.enviarYVerHistorial();
    tick();
    expect(emitido).toBeFalse();
    expect(window.print).not.toHaveBeenCalled();
    fixture.destroy();
  }));

  it('Enviar al Historial marca el registro como finalizado y deja uno nuevo', fakeAsync(() => {
    iniciar();
    spyOn(window, 'print');
    folio().setValue('TERMINADO');
    const id = fixture.componentInstance.idActual;
    fixture.componentInstance.enviarYVerHistorial();
    tick();
    const enviado = servicioFalso.guardar.calls.mostRecent().args[0];
    expect(enviado.finalizado).toBeTrue();
    expect(enviado.id).toBe(id);
    expect(fixture.componentInstance.idActual).not.toBe(id);
    expect(folio().value).toBe('');
  }));

  it('una foto nueva reemplaza a la que no ha salido', fakeAsync(() => {
    iniciar();
    const enviados: string[] = [];
    let terminar!: () => void;
    servicioFalso.guardar.and.callFake(r => {
      enviados.push(r.folio);
      return enviados.length === 1 ? new Promise(res => (terminar = () => res({ version: 1 }))) : Promise.resolve({ version: 2 });
    });
    for (const valor of ['V1', 'V2', 'V3']) {
      folio().setValue(valor);
      fixture.componentInstance.guardarBorrador();
    }
    terminar();
    tick();
    expect(enviados).toEqual(['V1', 'V3']);
    tick(1500);
  }));

  it('cada guardado lleva el id de esta edición, distinto por registro', fakeAsync(() => {
    iniciar();
    fixture.componentInstance.guardarBorrador();
    fixture.componentInstance.guardarBorrador();
    tick();
    const [primero, segundo] = servicioFalso.guardar.calls.allArgs().map(([r]) => r.edicionId);
    expect(primero).toBeTruthy();
    expect(segundo).toBe(primero);
    fixture.componentInstance.cargarRegistro(crearRegistroVacio());
    fixture.componentInstance.guardarBorrador();
    tick();
    expect(servicioFalso.guardar.calls.mostRecent().args[0].edicionId).not.toBe(primero);
  }));

  it('tras un conflicto, "Guardar como registro nuevo" conserva lo capturado con otro id', fakeAsync(() => {
    iniciar();
    const idOriginal = fixture.componentInstance.idActual;
    servicioFalso.guardar.and.rejectWith(error(409, 'conflicto'));
    folio().setValue('MIO');
    fixture.componentInstance.guardarBorrador();
    tick();
    fixture.detectChanges();

    servicioFalso.guardar.and.callFake(async r => ({ version: (r.version ?? 0) + 1 }));
    fixture.nativeElement.querySelector('button.guardar-como-nuevo').click();
    tick();
    fixture.detectChanges();
    const enviado = servicioFalso.guardar.calls.mostRecent().args[0];
    expect(enviado.id).not.toBe(idOriginal);
    expect(enviado.version).toBe(0);
    expect(enviado.folio).toBe('MIO');
    expect(texto()).not.toContain('Otra persona modificó este registro');
    servicioFalso.guardar.calls.reset();
    folio().setValue('SIGO');
    tick(1500);
    expect(servicioFalso.guardar).toHaveBeenCalled();
  }));

  it('Recargar tras un conflicto no descarta sin confirmación', fakeAsync(() => {
    iniciar();
    servicioFalso.guardar.and.rejectWith(error(409, 'conflicto'));
    folio().setValue('MIO');
    fixture.componentInstance.guardarBorrador();
    tick();
    spyOn(window, 'confirm').and.returnValue(false);
    fixture.componentInstance.recargar();
    tick();
    expect(servicioFalso.obtener).not.toHaveBeenCalled();
    expect(folio().value).toBe('MIO');
  }));

  it('avisa antes de cerrar la pestaña si hay algo sin guardar', fakeAsync(() => {
    iniciar();
    const limpio = new Event('beforeunload', { cancelable: true });
    fixture.componentInstance.avisarAntesDeCerrar(limpio);
    expect(limpio.defaultPrevented).toBeFalse();

    folio().setValue('PENDIENTE');
    const sucio = new Event('beforeunload', { cancelable: true });
    fixture.componentInstance.avisarAntesDeCerrar(sucio);
    expect(sucio.defaultPrevented).toBeTrue();
    tick(1500);
  }));

  describe('límite de tamaño', () => {
    /** Mide lo que realmente se envía con el formulario tal como está. */
    function medir(): number {
      fixture.componentInstance.guardarBorrador();
      tick();
      const tamano = tamanoEnviado(servicioFalso.guardar.calls.mostRecent().args[0]);
      servicioFalso.guardar.calls.reset();
      return tamano;
    }

    it('no envía un registro que rebasa el límite y avisa', fakeAsync(() => {
      iniciar();
      const tamano = medir();
      sesion.usuario.set({ limiteBytes: tamano - 1 });
      fixture.componentInstance.guardarBorrador();
      tick();
      fixture.detectChanges();
      expect(servicioFalso.guardar).not.toHaveBeenCalled();
      expect(texto()).toContain('demasiado grande');
    }));

    it('deja un margen: tampoco envía si queda justo debajo del límite', fakeAsync(() => {
      iniciar();
      const tamano = medir();
      sesion.usuario.set({ limiteBytes: Math.ceil(tamano * 1.02) });
      fixture.componentInstance.guardarBorrador();
      tick();
      expect(servicioFalso.guardar).not.toHaveBeenCalled();
    }));

    it('envía si queda por debajo del margen', fakeAsync(() => {
      iniciar();
      const tamano = medir();
      sesion.usuario.set({ limiteBytes: Math.ceil(tamano * 1.2) });
      fixture.componentInstance.guardarBorrador();
      tick();
      expect(servicioFalso.guardar).toHaveBeenCalled();
    }));

    it('mide bytes del JSON serializado, no caracteres', fakeAsync(() => {
      iniciar();
      folio().setValue('a'.repeat(1000));
      const tamano = medir();
      sesion.usuario.set({ limiteBytes: Math.ceil((tamano + 500) / 0.95) });
      folio().setValue('ñ'.repeat(1000)); // Mismos caracteres, 1000 bytes más: rebasa.
      fixture.componentInstance.guardarBorrador();
      tick();
      expect(servicioFalso.guardar).not.toHaveBeenCalled();
    }));

    it('cuenta las imágenes en base64 tal como viajan', fakeAsync(() => {
      iniciar();
      const tamano = medir();
      sesion.usuario.set({ limiteBytes: tamano + 1000 });
      const base64 = 'data:image/jpeg;base64,' + 'A'.repeat(2000);
      fixture.componentInstance.cargarRegistro({ ...crearRegistroVacio(), id: fixture.componentInstance.idActual, observaciones: { foto: base64 } });
      fixture.componentInstance.guardarBorrador();
      tick();
      expect(servicioFalso.guardar).not.toHaveBeenCalled();
    }));

    it('al quitar lo que sobra vuelve a guardar', fakeAsync(() => {
      iniciar();
      const tamano = medir();
      sesion.usuario.set({ limiteBytes: Math.ceil((tamano + 100) / 0.95) });
      folio().setValue('x'.repeat(500));
      fixture.componentInstance.guardarBorrador();
      tick();
      expect(servicioFalso.guardar).not.toHaveBeenCalled();
      folio().setValue('');
      fixture.componentInstance.guardarBorrador();
      tick();
      expect(servicioFalso.guardar).toHaveBeenCalled();
      tick(1500);
    }));

    it('sin límite informado envía normalmente', fakeAsync(() => {
      iniciar();
      fixture.componentInstance.guardarBorrador();
      tick();
      expect(servicioFalso.guardar).toHaveBeenCalled();
    }));
  });

  it('si falla el Excel muestra un mensaje', fakeAsync(() => {
    iniciar();
    spyOn(fixture.componentInstance['excelExportador'], 'exportar').and.rejectWith(new Error('no cargó'));
    fixture.nativeElement.querySelector('button.exportar-excel').click();
    tick();
    fixture.detectChanges();
    expect(texto()).toContain('No se pudo generar el Excel');
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

