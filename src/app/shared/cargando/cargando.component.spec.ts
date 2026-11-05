import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CargandoComponent } from './cargando.component';

describe('CargandoComponent', () => {
  let fixture: ComponentFixture<CargandoComponent>;
  const texto = () => fixture.nativeElement.textContent as string;

  beforeEach(() => {
    fixture = TestBed.createComponent(CargandoComponent);
  });

  it('muestra el espiral y su texto', fakeAsync(() => {
    fixture.componentRef.setInput('texto', 'Guardando el trámite…');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.espiral')).toBeTruthy();
    expect(texto()).toContain('Guardando el trámite…');
    fixture.destroy();
  }));

  it('lo anuncia a los lectores de pantalla', fakeAsync(() => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="status"]')).toBeTruthy();
    fixture.destroy();
  }));

  it('no avisa de demora durante los primeros 4 segundos', fakeAsync(() => {
    fixture.detectChanges();
    tick(3999);
    fixture.detectChanges();
    expect(texto()).not.toContain('sigue trabajando');
    fixture.destroy();
  }));

  it('si el servidor tarda, pide esperar', fakeAsync(() => {
    fixture.detectChanges();
    tick(4000);
    fixture.detectChanges();
    expect(texto()).toContain('El servidor sigue trabajando');
    expect(texto()).toContain('espera');
    fixture.destroy();
  }));

  it('al desaparecer cancela el aviso pendiente', fakeAsync(() => {
    fixture.detectChanges();
    fixture.destroy();
    tick(4000); // fakeAsync falla si queda un temporizador vivo.
  }));

  it('con cubrir ocupa la pantalla', fakeAsync(() => {
    fixture.componentRef.setInput('cubrir', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.cargando.cubrir')).toBeTruthy();
    fixture.destroy();
  }));
});
