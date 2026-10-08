import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { AppModule } from './../src/app.module';

// Requiere Postgres corriendo (docker compose up -d).
describe('Registros (e2e)', () => {
  let app: NestExpressApplication;
  const id = randomUUID();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    app.setGlobalPrefix('api');
    app.useBodyParser('json', { limit: '50mb' });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await request(app.getHttpServer()).delete(`/api/registros/${id}`);
    await app.close();
  });

  const registro = () => ({
    id,
    fechaCreacion: new Date().toISOString(),
    estado: 'CDMX',
    ciudad: 'CDMX',
    folio: 'F-001',
    datosPaciente: { nombreOMediaFiliacion: 'Juan Pérez', edadAnios: 40 },
    hospitalReceptor: { firmaQuienRecibe: 'data:image/png;base64,' + 'A'.repeat(500_000) },
    signosVitales: [{ hora: '10:00', fc: 80 }],
  });

  it('crea, actualiza, lista, obtiene y elimina un registro', async () => {
    const server = app.getHttpServer();

    await request(server).put(`/api/registros/${id}`).send(registro()).expect(200);
    await request(server)
      .put(`/api/registros/${id}`)
      .send({ ...registro(), folio: 'F-002', campoDesconocido: 'x' })
      .expect(200);

    const lista = await request(server).get('/api/registros').expect(200);
    expect(lista.body.filter((r: { id: string }) => r.id === id)).toHaveLength(1);

    const uno = await request(server).get(`/api/registros/${id}`).expect(200);
    expect(uno.body.folio).toBe('F-002');
    expect(uno.body.campoDesconocido).toBeUndefined();
    expect(uno.body.datosPaciente.nombreOMediaFiliacion).toBe('Juan Pérez');
    expect(uno.body.signosVitales).toEqual([{ hora: '10:00', fc: 80 }]);
    expect(uno.body.control).toEqual({});

    await request(server).delete(`/api/registros/${id}`).expect(204);
    await request(server).get(`/api/registros/${id}`).expect(404);
  });

  it('rechaza un cuerpo cuyo id no coincide con la URL', () => {
    return request(app.getHttpServer())
      .put(`/api/registros/${randomUUID()}`)
      .send(registro())
      .expect(400);
  });

  it('rechaza datos inválidos', () => {
    return request(app.getHttpServer())
      .put(`/api/registros/${id}`)
      .send({ ...registro(), datosPaciente: 'no-es-objeto' })
      .expect(400);
  });
});
