import { TestBed } from '@angular/core/testing';
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

  it('guardar() hace PUT al id del registro', async () => {
    const registro = crearRegistroVacio();
    const promesa = servicio.guardar(registro);
    const req = http.expectOne(`${API_REGISTROS_URL}/${registro.id}`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(registro);
    req.flush(registro);
    expect(await promesa).toEqual(registro);
  });

  it('obtener() devuelve undefined si el backend responde 404', async () => {
    const promesa = servicio.obtener('no-existe');
    http.expectOne(`${API_REGISTROS_URL}/no-existe`).flush(null, { status: 404, statusText: 'Not Found' });
    expect(await promesa).toBeUndefined();
  });

  it('listar() hace GET a la colección', async () => {
    const promesa = servicio.listar();
    http.expectOne(API_REGISTROS_URL).flush([]);
    expect(await promesa).toEqual([]);
  });

  it('eliminar() hace DELETE al id', async () => {
    const promesa = servicio.eliminar('abc');
    const req = http.expectOne(`${API_REGISTROS_URL}/abc`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
    await promesa;
  });
});
