import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HistorialComponent } from './historial.component';
import { REGISTRO_SERVICE, RegistroService } from '../../core/services/registro.service';
import { ExcelExportadorService } from '../exportacion/excel-exportador.service';
import { crearRegistroVacio, RegistroAtencionPrehospitalaria } from '../../core/models/registro.model';

function registroDePrueba(datos: Partial<RegistroAtencionPrehospitalaria> = {}): RegistroAtencionPrehospitalaria {
  return { ...crearRegistroVacio(), ...datos };
}

describe('HistorialComponent', () => {
  let fixture: ComponentFixture<HistorialComponent>;
  let servicioFalso: jasmine.SpyObj<RegistroService>;
  let excelExportadorFalso: jasmine.SpyObj<ExcelExportadorService>;

  beforeEach(async () => {
    servicioFalso = jasmine.createSpyObj<RegistroService>('RegistroService', ['guardar', 'obtener', 'listar', 'eliminar']);
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
    servicioFalso.listar.and.resolveTo([]);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Todavía no hay trámites guardados.');
    expect(fixture.nativeElement.querySelector('.tabla-historial')).toBeFalsy();
  }));

  it('lista los trámites guardados del más reciente al más antiguo, con folio/fecha/paciente/ciudad', fakeAsync(() => {
    const viejo = registroDePrueba({
      folio: 'F-1', ciudad: 'Cd. Juárez', fechaCreacion: '2026-01-01T10:00:00.000Z',
      datosPaciente: { nombreOMediaFiliacion: 'Juan Pérez' },
    });
    const nuevo = registroDePrueba({
      folio: 'F-2', ciudad: 'Chihuahua', fechaCreacion: '2026-02-01T10:00:00.000Z',
      datosPaciente: { nombreOMediaFiliacion: 'Ana López' },
    });
    servicioFalso.listar.and.resolveTo([viejo, nuevo]);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const filas = fixture.nativeElement.querySelectorAll('.tabla-historial tbody tr');
    expect(filas.length).toBe(2);
    expect(filas[0].textContent).toContain('F-2');
    expect(filas[0].textContent).toContain('Ana López');
    expect(filas[0].textContent).toContain('Chihuahua');
    expect(filas[1].textContent).toContain('F-1');
    expect(filas[1].textContent).toContain('Juan Pérez');
  }));

  it('muestra "(sin nombre)" cuando el trámite no tiene nombre de paciente capturado', fakeAsync(() => {
    servicioFalso.listar.and.resolveTo([registroDePrueba({ folio: 'F-3' })]);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.tabla-historial tbody tr').textContent).toContain('(sin nombre)');
  }));

  it('el botón "Abrir" emite el registro elegido', fakeAsync(() => {
    const registro = registroDePrueba({ folio: 'F-4' });
    servicioFalso.listar.and.resolveTo([registro]);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    let emitido: RegistroAtencionPrehospitalaria | undefined;
    fixture.componentInstance.abrir.subscribe(r => (emitido = r));

    const boton: HTMLButtonElement = fixture.nativeElement.querySelector('button.abrir');
    boton.click();

    expect(emitido).toBe(registro);
  }));

  it('el botón "Exportar PDF" arma un snapshot anidado (datosGenerales.folio) y llama a window.print()', fakeAsync(() => {
    const registro = registroDePrueba({ folio: 'F-5', estado: 'Chihuahua', ciudad: 'Cd. Juárez' });
    servicioFalso.listar.and.resolveTo([registro]);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    spyOn(window, 'print');
    const boton: HTMLButtonElement = fixture.nativeElement.querySelector('button.exportar-pdf');
    boton.click();

    expect(window.print).toHaveBeenCalled();
    expect((fixture.componentInstance.snapshotParaImpresion as any).datosGenerales.folio).toBe('F-5');
  }));

  it('el botón "Exportar Excel" llama a ExcelExportadorService.exportar() con el registro de esa fila', fakeAsync(() => {
    const registro = registroDePrueba({ folio: 'F-6' });
    servicioFalso.listar.and.resolveTo([registro]);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const boton: HTMLButtonElement = fixture.nativeElement.querySelector('button.exportar-excel');
    boton.click();

    expect(excelExportadorFalso.exportar).toHaveBeenCalledWith(registro);
  }));

  it('el botón "Eliminar" pide confirmación, borra el registro y lo quita de la lista', fakeAsync(() => {
    const registro = registroDePrueba({ folio: 'F-7' });
    servicioFalso.listar.and.resolveTo([registro]);
    servicioFalso.eliminar.and.resolveTo();
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    spyOn(window, 'confirm').and.returnValue(true);
    const boton: HTMLButtonElement = fixture.nativeElement.querySelector('button.eliminar');
    boton.click();
    tick();
    fixture.detectChanges();

    expect(window.confirm).toHaveBeenCalled();
    expect(servicioFalso.eliminar).toHaveBeenCalledWith(registro.id);
    expect(fixture.nativeElement.textContent).toContain('Todavía no hay trámites guardados.');
  }));

  it('el botón "Eliminar" no borra nada si el usuario cancela la confirmación', fakeAsync(() => {
    const registro = registroDePrueba({ folio: 'F-8' });
    servicioFalso.listar.and.resolveTo([registro]);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    spyOn(window, 'confirm').and.returnValue(false);
    const boton: HTMLButtonElement = fixture.nativeElement.querySelector('button.eliminar');
    boton.click();
    tick();

    expect(servicioFalso.eliminar).not.toHaveBeenCalled();
    expect(fixture.componentInstance.registros.length).toBe(1);
  }));

  it('si listar() rechaza la promesa, muestra el estado vacío en vez de propagar el error', fakeAsync(() => {
    servicioFalso.listar.and.rejectWith(new Error('localStorage corrupto'));
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Todavía no hay trámites guardados.');
  }));
});
