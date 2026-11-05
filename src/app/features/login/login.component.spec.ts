import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { LoginComponent } from './login.component';
import { SesionService } from '../../core/services/sesion.service';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let sesion: jasmine.SpyObj<SesionService>;

  const entrada = (nombre: string): HTMLInputElement => fixture.nativeElement.querySelector(`input[name="${nombre}"]`);
  const escribir = (nombre: string, valor: string) => {
    entrada(nombre).value = valor;
    entrada(nombre).dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const enviar = () => {
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }));
    tick();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    sesion = jasmine.createSpyObj<SesionService>('SesionService', ['entrar']);
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [{ provide: SesionService, useValue: sesion }],
    }).compileComponents();
    fixture = TestBed.createComponent(LoginComponent);
  });

  it('muestra el logo de UMAM', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-logo-umam svg')).toBeTruthy();
  });

  it('envía usuario y contraseña', fakeAsync(() => {
    sesion.entrar.and.resolveTo();
    fixture.detectChanges();
    escribir('usuario', 'paramedico');
    escribir('clave', 'secreta');
    enviar();
    expect(sesion.entrar).toHaveBeenCalledOnceWith('paramedico', 'secreta');
  }));

  it('credenciales malas muestran error sin borrar el usuario', fakeAsync(() => {
    sesion.entrar.and.rejectWith(new HttpErrorResponse({ status: 401 }));
    fixture.detectChanges();
    escribir('usuario', 'paramedico');
    escribir('clave', 'mala');
    enviar();
    expect(fixture.nativeElement.textContent).toContain('Usuario o contraseña incorrectos');
    expect(entrada('usuario').value).toBe('paramedico');
    expect(entrada('clave').value).toBe('');
  }));

  it('avisa el bloqueo por intentos', fakeAsync(() => {
    sesion.entrar.and.rejectWith(new HttpErrorResponse({ status: 429 }));
    fixture.detectChanges();
    escribir('usuario', 'admin');
    escribir('clave', 'x');
    enviar();
    expect(fixture.nativeElement.textContent).toContain('Espera 15 minutos');
  }));

  it('distingue un error de conexión', fakeAsync(() => {
    sesion.entrar.and.rejectWith(new HttpErrorResponse({ status: 0 }));
    fixture.detectChanges();
    escribir('usuario', 'admin');
    escribir('clave', 'x');
    enviar();
    expect(fixture.nativeElement.textContent).toContain('No se pudo conectar');
  }));

  it('con usuarioFijo no deja cambiar el usuario y explica por qué aparece', fakeAsync(() => {
    sesion.entrar.and.resolveTo();
    fixture.componentRef.setInput('usuarioFijo', 'paramedico');
    fixture.detectChanges();
    expect(entrada('usuario').readOnly).toBeTrue();
    expect(entrada('usuario').value).toBe('paramedico');
    expect(fixture.nativeElement.textContent).toContain('Tu sesión venció');
    escribir('clave', 'secreta');
    enviar();
    expect(sesion.entrar).toHaveBeenCalledOnceWith('paramedico', 'secreta');
  }));
});
