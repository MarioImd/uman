import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HistorialComponent } from './historial.component';
import { REGISTRO_SERVICE, RegistroService } from '../../core/services/registro.service';
import { ExcelExportadorService } from '../exportacion/excel-exportador.service';
import { crearRegistroVacio, Pagina, RegistroAtencionPrehospitalaria, RegistroResumen } from '../../core/models/registro.model';

function resumen(datos: Partial<RegistroResumen> = {}): RegistroResumen {
  return { id: crypto.randomUUID(), folio: '', ciudad: '', paciente: '', fechaCreacion: '2026-01-01T10:00:00.000Z', ...datos };
}

function pagina(items: RegistroResumen[], total = items.length, numero = 1): Pagina<RegistroResumen> {
  return { items, total, pagina: numero, porPagina: 20 };
}

function completo(datos: Partial<RegistroAtencionPrehospitalaria> = {}): RegistroAtencionPrehospitalaria {
  return { ...crearRegistroVacio(), ...datos };
}

describe('HistorialComponent', () => {
  let fixture: ComponentFixture<HistorialComponent>;
  let servicioFalso: jasmine.SpyObj<RegistroService>;
  let excelExportadorFalso: jasmine.SpyObj<ExcelExportadorService>;

  const iniciar = () => {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
  };
  const texto = () => fixture.nativeElement.textContent as string;
  const boton = (selector: string): HTMLButtonElement => fixture.nativeElement.querySelector(selector);
  const escribir = (valor: string) => {
    const entrada: HTMLInputElement = fixture.nativeElement.querySelector('.buscador input');
    entrada.value = valor;
    entrada.dispatchEvent(new Event('input'));
  };

  beforeEach(async () => {
    servicioFalso = jasmine.createSpyObj<RegistroService>('RegistroService', ['guardar', 'obtener', 'ultimo', 'listar', 'eliminar']);
    excelExportadorFalso = jasmine.createSpyObj<ExcelExportadorService>('ExcelExportadorService', ['exportar']);

    await TestBed.configureTestingModule({
      imports: [HistorialComponent],
      providers: [
        { provide: REGISTRO_SERVICE, useValue: servicioFalso },
        { provide: ExcelExportadorService, useValue: excelExportadorFalso },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HistorialComponent);
  });

  it('muestra "Todavía no hay trámites guardados." cuando el historial está vacío', fakeAsync(() => {
    servicioFalso.listar.and.resolveTo(pagina([]));
    iniciar();
    expect(texto()).toContain('Todavía no hay trámites guardados.');
    expect(fixture.nativeElement.querySelector('.tabla-historial')).toBeFalsy();
  }));

  it('carga la página 1 y muestra el total real', fakeAsync(() => {
    servicioFalso.listar.and.resolveTo(pagina([resumen({ folio: 'F-2', paciente: 'Ana López', ciudad: 'Chihuahua' })], 45));
    iniciar();
    expect(servicioFalso.listar).toHaveBeenCalledOnceWith(1, '');
    expect(texto()).toContain('45 trámites guardados');
    const fila = fixture.nativeElement.querySelector('.tabla-historial tbody tr');
    expect(fila.textContent).toContain('F-2');
    expect(fila.textContent).toContain('Ana López');
    expect(fila.textContent).toContain('Chihuahua');
  }));

  it('muestra "(sin nombre)" cuando el trámite no tiene nombre de paciente', fakeAsync(() => {
    servicioFalso.listar.and.resolveTo(pagina([resumen({ folio: 'F-3' })]));
    iniciar();
    expect(fixture.nativeElement.querySelector('.tabla-historial tbody tr').textContent).toContain('(sin nombre)');
  }));

  it('cambiar de página pide esa página', fakeAsync(() => {
    servicioFalso.listar.and.resolveTo(pagina([resumen()], 45));
    iniciar();
    expect(texto()).toContain('Página 1 de 3');
    boton('.paginador-siguiente').click();
    tick();
    fixture.detectChanges();
    expect(servicioFalso.listar).toHaveBeenCalledWith(2, '');
    expect(texto()).toContain('Página 2 de 3');
  }));

  it('buscar espera 300 ms y vuelve a la página 1', fakeAsync(() => {
    servicioFalso.listar.and.resolveTo(pagina([resumen()], 45));
    iniciar();
    boton('.paginador-siguiente').click();
    tick();
    fixture.detectChanges();
    servicioFalso.listar.calls.reset();

    escribir('per');
    tick(299);
    expect(servicioFalso.listar).not.toHaveBeenCalled();
    tick(1);
    expect(servicioFalso.listar).toHaveBeenCalledOnceWith(1, 'per');
  }));

  it('una respuesta vieja no reemplaza a la nueva', fakeAsync(() => {
    servicioFalso.listar.and.resolveTo(pagina([resumen({ folio: 'INICIAL' })]));
    iniciar();

    let responderVieja!: (p: Pagina<RegistroResumen>) => void;
    servicioFalso.listar.and.returnValue(new Promise(r => (responderVieja = r)));
    escribir('vieja');
    tick(300);

    servicioFalso.listar.and.resolveTo(pagina([resumen({ folio: 'NUEVA' })]));
    escribir('nueva');
    tick(300);
    fixture.detectChanges();

    responderVieja(pagina([resumen({ folio: 'VIEJA' })]));
    tick();
    fixture.detectChanges();
    expect(texto()).toContain('NUEVA');
    expect(texto()).not.toContain('VIEJA');
  }));

  it('sin resultados de búsqueda lo dice y conserva el buscador', fakeAsync(() => {
    servicioFalso.listar.and.resolveTo(pagina([resumen()]));
    iniciar();
    servicioFalso.listar.and.resolveTo(pagina([]));
    escribir('nada');
    tick(300);
    fixture.detectChanges();
    expect(texto()).toContain('Ningún trámite coincide con la búsqueda.');
    expect(texto()).not.toContain('Todavía no hay trámites');
    expect(fixture.nativeElement.querySelector('.buscador input')).toBeTruthy();
  }));

  it('Abrir pide el registro completo y lo emite', fakeAsync(() => {
    const fila = resumen({ folio: 'F-4' });
    const registro = completo({ id: fila.id, folio: 'F-4' });
    servicioFalso.listar.and.resolveTo(pagina([fila]));
    servicioFalso.obtener.and.resolveTo(registro);
    iniciar();

    let emitido: RegistroAtencionPrehospitalaria | undefined;
    fixture.componentInstance.abrir.subscribe(r => (emitido = r));
    boton('button.abrir').click();
    tick();

    expect(servicioFalso.obtener).toHaveBeenCalledOnceWith(fila.id);
    expect(emitido).toBe(registro);
  }));

  it('si falla obtener muestra error y no emite abrir', fakeAsync(() => {
    servicioFalso.listar.and.resolveTo(pagina([resumen()]));
    servicioFalso.obtener.and.rejectWith(new Error('sin conexión'));
    iniciar();

    let emitido = false;
    fixture.componentInstance.abrir.subscribe(() => (emitido = true));
    boton('button.abrir').click();
    tick();
    fixture.detectChanges();

    expect(emitido).toBeFalse();
    expect(texto()).toContain('No se pudo cargar el trámite');
  }));

  it('si el trámite ya no existe lo avisa y actualiza la lista', fakeAsync(() => {
    servicioFalso.listar.and.resolveTo(pagina([resumen()]));
    servicioFalso.obtener.and.resolveTo(undefined);
    iniciar();
    servicioFalso.listar.calls.reset();
    boton('button.abrir').click();
    tick();
    fixture.detectChanges();
    expect(texto()).toContain('Ese trámite ya no existe');
    expect(servicioFalso.listar).toHaveBeenCalled();
  }));

  it('Exportar PDF pide el registro completo, arma el snapshot y llama a window.print()', fakeAsync(() => {
    const fila = resumen();
    servicioFalso.listar.and.resolveTo(pagina([fila]));
    servicioFalso.obtener.and.resolveTo(completo({ id: fila.id, folio: 'F-5', estado: 'Chihuahua' }));
    iniciar();

    spyOn(window, 'print');
    boton('button.exportar-pdf').click();
    tick();

    expect(servicioFalso.obtener).toHaveBeenCalledOnceWith(fila.id);
    expect(window.print).toHaveBeenCalled();
    expect((fixture.componentInstance.snapshotParaImpresion as any).datosGenerales.folio).toBe('F-5');
  }));

  it('Exportar Excel pide el registro completo y lo pasa al exportador', fakeAsync(() => {
    const fila = resumen();
    const registro = completo({ id: fila.id });
    servicioFalso.listar.and.resolveTo(pagina([fila]));
    servicioFalso.obtener.and.resolveTo(registro);
    iniciar();

    boton('button.exportar-excel').click();
    tick();

    expect(excelExportadorFalso.exportar).toHaveBeenCalledWith(registro);
  }));

  it('Eliminar pide confirmación, borra y recarga la página', fakeAsync(() => {
    const fila = resumen({ folio: 'F-7' });
    servicioFalso.listar.and.resolveTo(pagina([fila]));
    servicioFalso.eliminar.and.resolveTo();
    iniciar();

    spyOn(window, 'confirm').and.returnValue(true);
    servicioFalso.listar.and.resolveTo(pagina([]));
    boton('button.eliminar').click();
    tick();
    fixture.detectChanges();

    expect(window.confirm).toHaveBeenCalled();
    expect(servicioFalso.eliminar).toHaveBeenCalledWith(fila.id);
    expect(texto()).toContain('Todavía no hay trámites guardados.');
  }));

  it('eliminar la última fila de la última página carga la anterior', fakeAsync(() => {
    servicioFalso.listar.and.callFake(async n => pagina([resumen({ folio: 'P' + n })], 41, n));
    servicioFalso.eliminar.and.resolveTo();
    iniciar();
    boton('.paginador-siguiente').click();
    tick();
    fixture.detectChanges();
    boton('.paginador-siguiente').click();
    tick();
    fixture.detectChanges();
    expect(texto()).toContain('Página 3 de 3');

    // Tras eliminar, la página 3 ya no tiene filas.
    servicioFalso.listar.and.callFake(async n => (n === 3 ? pagina([], 40, 3) : pagina([resumen({ folio: 'P2' })], 40, n)));
    spyOn(window, 'confirm').and.returnValue(true);
    boton('button.eliminar').click();
    tick();
    fixture.detectChanges();

    expect(servicioFalso.listar.calls.mostRecent().args[0]).toBe(2);
    expect(texto()).toContain('Página 2 de 2');
    expect(texto()).toContain('P2');
  }));

  it('Eliminar no borra nada si el usuario cancela', fakeAsync(() => {
    servicioFalso.listar.and.resolveTo(pagina([resumen()]));
    iniciar();
    spyOn(window, 'confirm').and.returnValue(false);
    boton('button.eliminar').click();
    tick();
    expect(servicioFalso.eliminar).not.toHaveBeenCalled();
  }));

  it('si eliminar falla, conserva el trámite y muestra un aviso', fakeAsync(() => {
    servicioFalso.listar.and.resolveTo(pagina([resumen({ folio: 'F-9' })]));
    servicioFalso.eliminar.and.rejectWith(new Error('sin conexión'));
    iniciar();
    spyOn(window, 'confirm').and.returnValue(true);
    boton('button.eliminar').click();
    tick();
    fixture.detectChanges();
    expect(texto()).toContain('F-9');
    expect(texto()).toContain('No se pudo eliminar el trámite');
  }));

  it('si listar falla muestra error de conexión con "Reintentar"', fakeAsync(() => {
    servicioFalso.listar.and.rejectWith(new Error('servidor apagado'));
    iniciar();
    expect(texto()).toContain('No se pudo conectar con el servidor');
    expect(texto()).not.toContain('Todavía no hay trámites guardados.');

    servicioFalso.listar.and.resolveTo(pagina([resumen({ folio: 'F-REINTENTO' })]));
    boton('button.reintentar').click();
    tick();
    fixture.detectChanges();
    expect(texto()).toContain('F-REINTENTO');
  }));
});
