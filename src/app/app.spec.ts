import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNativeDateAdapter } from '@angular/material/core';
import { App } from './app';
import { HistorialComponent } from './features/historial/historial.component';
import { FormularioComponent } from './features/formulario/formulario.component';
import { REGISTRO_SERVICE } from './core/services/registro.service';
import { SesionService, UsuarioSesion } from './core/services/sesion.service';
import { crearRegistroVacio } from './core/models/registro.model';

const PARAMEDICO: UsuarioSesion = { id: 2, usuario: 'paramedico', nombre: 'Ana Paramédica', rol: 'usuario' };
const ADMIN: UsuarioSesion = { id: 1, usuario: 'admin', nombre: 'Administrador', rol: 'admin' };

describe('App', () => {
  let sesion: {
    usuario: ReturnType<typeof signal<UsuarioSesion | null>>;
    sesionVencida: ReturnType<typeof signal<boolean>>;
    cargar: jasmine.Spy;
    salir: jasmine.Spy;
  };

  beforeEach(async () => {
    sesion = {
      usuario: signal<UsuarioSesion | null>(PARAMEDICO),
      sesionVencida: signal(false),
      cargar: jasmine.createSpy('cargar').and.resolveTo(),
      salir: jasmine.createSpy('salir').and.callFake(async () => sesion.usuario.set(null)),
    };
    const registros = {
      guardar: async () => ({ version: 1 }),
      obtener: async () => undefined,
      ultimo: async () => undefined,
      listar: async () => ({ items: [], total: 0, pagina: 1, porPagina: 20 }),
      eliminar: async () => undefined,
    };
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: REGISTRO_SERVICE, useValue: registros },
        { provide: SesionService, useValue: sesion },
        provideNativeDateAdapter(),
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render app-formulario as the root content', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-formulario')).toBeTruthy();
  });

  it('la pestaña "Historial" muestra app-historial y oculta app-formulario; "Formulario" regresa', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    const botonHistorial = compiled.querySelectorAll<HTMLButtonElement>('button.pestana')[1];
    botonHistorial.click();
    fixture.detectChanges();
    expect(compiled.querySelector('app-historial')).toBeTruthy();
    expect(compiled.querySelector('app-formulario')).toBeFalsy();

    const botonFormulario = compiled.querySelectorAll<HTMLButtonElement>('button.pestana')[0];
    botonFormulario.click();
    fixture.detectChanges();
    expect(compiled.querySelector('app-formulario')).toBeTruthy();
    expect(compiled.querySelector('app-historial')).toBeFalsy();
  });

  it('al "abrir" un trámite desde el Historial, vuelve a la vista de Formulario con ese registro', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    fixture.componentInstance.irAHistorial();
    fixture.detectChanges();

    const registro = { ...crearRegistroVacio(), folio: 'F-HIST' };
    const historial = fixture.debugElement.query(By.directive(HistorialComponent)).componentInstance as HistorialComponent;
    historial.abrir.emit(registro);
    fixture.detectChanges();

    expect(fixture.componentInstance.vista).toBe('formulario');
    expect(fixture.componentInstance.registroACargar).toBe(registro);
    expect((fixture.nativeElement as HTMLElement).querySelector('app-formulario')).toBeTruthy();
  });

  it('al terminar "Enviar al Historial" en el formulario, cambia a la vista de Historial', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const formulario = fixture.debugElement.query(By.directive(FormularioComponent)).componentInstance as FormularioComponent;
    formulario.enviarAlHistorial.emit();
    fixture.detectChanges();

    expect(fixture.componentInstance.vista).toBe('historial');
    expect((fixture.nativeElement as HTMLElement).querySelector('app-historial')).toBeTruthy();
  });

  const pestanas = (fixture: { nativeElement: HTMLElement }) =>
    Array.from(fixture.nativeElement.querySelectorAll('button.pestana')).map(b => b.textContent ?? '');

  it('sin sesión se ve el login con el logo', async () => {
    sesion.usuario.set(null);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-login app-logo-umam svg')).toBeTruthy();
    expect(compiled.querySelector('app-formulario')).toBeFalsy();
    expect(compiled.querySelector('.barra-app')).toBeFalsy();
  });

  it('mientras revisa la sesión no muestra el login', () => {
    sesion.usuario.set(null);
    sesion.cargar.and.returnValue(new Promise(() => {}));
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('app-login')).toBeFalsy();
  });

  it('con sesión se ven las vistas y el nombre', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-login')).toBeFalsy();
    expect(compiled.querySelector('app-formulario')).toBeTruthy();
    expect(compiled.querySelector('.usuario-actual')?.textContent).toContain('Ana Paramédica');
  });

  it('un usuario normal no ve pestañas de administrador', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(pestanas(fixture).length).toBe(2);
  });

  it('el administrador ve Usuarios, Actividad y Eliminados', () => {
    sesion.usuario.set(ADMIN);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const textos = pestanas(fixture).join(' ');
    expect(textos).toContain('Usuarios');
    expect(textos).toContain('Actividad');
    expect(textos).toContain('Eliminados');
  });

  it('con sesión vencida el login se muestra encima y el formulario sigue en el DOM', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const formulario = (fixture.nativeElement as HTMLElement).querySelector('app-formulario');
    sesion.sesionVencida.set(true);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-login')).toBeTruthy();
    expect(compiled.querySelector('app-formulario')).toBe(formulario);
  });

  it('el login encima fija el usuario actual', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    sesion.sesionVencida.set(true);
    fixture.detectChanges();
    const entrada = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('app-login input[name="usuario"]');
    expect(entrada?.value).toBe('paramedico');
    expect(entrada?.readOnly).toBeTrue();
  });

  it('salir vuelve al login y borra registroACargar', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    fixture.componentInstance.registroACargar = crearRegistroVacio();
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button.salir')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(sesion.salir).toHaveBeenCalled();
    expect(fixture.componentInstance.registroACargar).toBeUndefined();
    expect((fixture.nativeElement as HTMLElement).querySelector('app-login')).toBeTruthy();
    expect(fixture.componentInstance.vista).toBe('formulario');
  });

  it('salir guarda lo pendiente del formulario antes de cerrar la sesión', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const formulario = fixture.debugElement.query(By.directive(FormularioComponent)).componentInstance as FormularioComponent;
    let guardado = false;
    spyOn(formulario, 'guardarPendientes').and.callFake(async () => {
      expect(sesion.salir).not.toHaveBeenCalled();
      guardado = true;
    });
    await fixture.componentInstance.salir();
    expect(guardado).toBeTrue();
    expect(sesion.salir).toHaveBeenCalled();
  });
});
