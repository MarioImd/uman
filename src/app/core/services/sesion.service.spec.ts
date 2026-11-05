import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { SesionService, UsuarioSesion } from './sesion.service';
import { sesionInterceptor } from './sesion.interceptor';

const USUARIO: UsuarioSesion = { id: 2, usuario: 'paramedico', nombre: 'Paramédico', rol: 'usuario' };

describe('SesionService', () => {
  let sesion: SesionService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SesionService, provideHttpClient(withInterceptors([sesionInterceptor])), provideHttpClientTesting()],
    });
    sesion = TestBed.inject(SesionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('cargar() deja el usuario de la sesión', async () => {
    const promesa = sesion.cargar();
    http.expectOne('api/sesion').flush(USUARIO);
    await promesa;
    expect(sesion.usuario()).toEqual(USUARIO);
  });

  it('cargar() sin sesión deja usuario en null y no marca sesión vencida', async () => {
    const promesa = sesion.cargar();
    http.expectOne('api/sesion').flush(null, { status: 401, statusText: 'Unauthorized' });
    await promesa;
    expect(sesion.usuario()).toBeNull();
    expect(sesion.sesionVencida()).toBeFalse();
  });

  it('entrar() envía las credenciales y limpia sesionVencida', async () => {
    sesion.sesionVencida.set(true);
    const promesa = sesion.entrar('paramedico', 'clave');
    const req = http.expectOne('api/sesion/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ usuario: 'paramedico', clave: 'clave' });
    req.flush(USUARIO);
    await promesa;
    expect(sesion.usuario()).toEqual(USUARIO);
    expect(sesion.sesionVencida()).toBeFalse();
  });

  it('entrar() con clave mala rechaza sin marcar sesión vencida', async () => {
    const promesa = sesion.entrar('paramedico', 'mala');
    http.expectOne('api/sesion/login').flush({ error: 'x' }, { status: 401, statusText: 'Unauthorized' });
    await expectAsync(promesa).toBeRejected();
    expect(sesion.sesionVencida()).toBeFalse();
  });

  it('salir() cierra la sesión', async () => {
    sesion.usuario.set(USUARIO);
    const promesa = sesion.salir();
    const req = http.expectOne('api/sesion/logout');
    expect(req.request.method).toBe('POST');
    req.flush({ ok: true });
    await promesa;
    expect(sesion.usuario()).toBeNull();
  });

  it('el interceptor activa sesionVencida con un 401 de otra ruta', async () => {
    sesion.usuario.set(USUARIO);
    const promesa = firstValueFrom(TestBed.inject(HttpClient).get('api/registros'));
    http.expectOne('api/registros').flush(null, { status: 401, statusText: 'Unauthorized' });
    await expectAsync(promesa).toBeRejected();
    expect(sesion.sesionVencida()).toBeTrue();
    expect(sesion.usuario()).toEqual(USUARIO);
  });

  it('el interceptor ignora otros errores', async () => {
    sesion.usuario.set(USUARIO);
    const promesa = firstValueFrom(TestBed.inject(HttpClient).get('api/registros'));
    http.expectOne('api/registros').flush(null, { status: 500, statusText: 'Error' });
    await expectAsync(promesa).toBeRejected();
    expect(sesion.sesionVencida()).toBeFalse();
  });
});
