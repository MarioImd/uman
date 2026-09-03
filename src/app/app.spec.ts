import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNativeDateAdapter } from '@angular/material/core';
import { App } from './app';
import { HistorialComponent } from './features/historial/historial.component';
import { FormularioComponent } from './features/formulario/formulario.component';
import { REGISTRO_SERVICE } from './core/services/registro.service';
import { LocalStorageRegistroService } from './core/services/registro-local-storage.service';
import { crearRegistroVacio } from './core/models/registro.model';

describe('App', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [{ provide: REGISTRO_SERVICE, useClass: LocalStorageRegistroService }, provideNativeDateAdapter()],
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
});
