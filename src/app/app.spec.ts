import { TestBed } from '@angular/core/testing';
import { provideNativeDateAdapter } from '@angular/material/core';
import { App } from './app';
import { REGISTRO_SERVICE } from './core/services/registro.service';
import { LocalStorageRegistroService } from './core/services/registro-local-storage.service';

describe('App', () => {
  beforeEach(async () => {
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
});
