import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_REGISTROS_URL, ApiRegistroService } from './registro-api.service';
import { crearRegistroVacio } from '../models/registro.model';

describe('ApiRegistroService', () => {
  let servicio: ApiRegistroService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ApiRegistroService, provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(ApiRegistroService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('usa una URL relativa para funcionar en cualquier carpeta', () => {
    expect(API_REGISTROS_URL).toBe('api/registros');
  });

  it('guardar() hace POST al id del registro y devuelve la version', async () => {
    const registro = crearRegistroVacio();
    const promesa = servicio.guardar(registro);
    const req = http.expectOne(`${API_REGISTROS_URL}/${registro.id}`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(registro);
    req.flush({ version: 1 });
    expect(await promesa).toEqual({ version: 1 });
  });

  it('guardar() no se queda colgado para siempre', fakeAsync(() => {
    let fallo = false;
    const registro = crearRegistroVacio();
    servicio.guardar(registro).catch(() => (fallo = true));
    http.expectOne(`${API_REGISTROS_URL}/${registro.id}`);
    tick(120000);
    expect(fallo).toBeTrue();
  }));

  it('obtener() devuelve undefined si el servidor responde 404', async () => {
    const promesa = servicio.obtener('no-existe');
    http.expectOne(`${API_REGISTROS_URL}/no-existe`).flush(null, { status: 404, statusText: 'Not Found' });
    expect(await promesa).toBeUndefined();
  });

  it('ultimo() devuelve el registro del servidor', async () => {
    const registro = crearRegistroVacio();
    const promesa = servicio.ultimo();
    http.expectOne(`${API_REGISTROS_URL}/ultimo`).flush(registro);
    expect(await promesa).toEqual(registro);
  });

  it('ultimo() devuelve undefined con 404', async () => {
    const promesa = servicio.ultimo();
    http.expectOne(`${API_REGISTROS_URL}/ultimo`).flush(null, { status: 404, statusText: 'Not Found' });
    expect(await promesa).toBeUndefined();
  });

  it('ultimo() deja pasar otros errores', async () => {
    const promesa = servicio.ultimo();
    http.expectOne(`${API_REGISTROS_URL}/ultimo`).flush(null, { status: 500, statusText: 'Error' });
    await expectAsync(promesa).toBeRejected();
  });

  it('listar() llama api/registros con pagina y q', async () => {
    const pagina = { items: [], total: 0, pagina: 3, porPagina: 20 };
    const promesa = servicio.listar(3, 'pérez');
    const req = http.expectOne(r => r.url === API_REGISTROS_URL);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('pagina')).toBe('3');
    expect(req.request.params.get('q')).toBe('pérez');
    req.flush(pagina);
    expect(await promesa).toEqual(pagina);
  });

  it('eliminar hace POST a api/registros/{id}/eliminar', async () => {
    const promesa = servicio.eliminar('abc');
    const req = http.expectOne(`${API_REGISTROS_URL}/abc/eliminar`);
    expect(req.request.method).toBe('POST');
    req.flush({ ok: true });
    await promesa;
  });
});
