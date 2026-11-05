import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { instalar, limpiarBase, peticion, sql } from './ayuda.mjs';

beforeEach(() => limpiarBase());

test('sin token responde 403 y no crea tablas', async () => {
  const r = await peticion('instalar.php', { metodo: 'POST', formulario: { token: 'malo' } });
  assert.equal(r.estado, 403);
  assert.equal(sql("SHOW TABLES LIKE 'usuarios'"), '');
});

test('con token crea tablas, usuarios admin y paramedico, y muestra sus claves una vez', async () => {
  const { respuesta, admin, paramedico } = await instalar();
  assert.equal(respuesta.estado, 200);
  assert.equal(admin.length, 16);
  assert.equal(paramedico.length, 16);
  assert.notEqual(admin, paramedico);
  assert.equal(sql('SELECT usuario, rol FROM usuarios ORDER BY id'), 'admin\tadmin\nparamedico\tusuario');
  for (const tabla of ['registros', 'actividad', 'intentos_login']) {
    assert.equal(sql(`SHOW TABLES LIKE '${tabla}'`), tabla);
  }
});

test('segunda ejecución responde 409 y no cambia las claves', async () => {
  await instalar();
  const antes = sql('SELECT password_hash FROM usuarios ORDER BY id');
  const { respuesta, admin } = await instalar();
  assert.equal(respuesta.estado, 409);
  assert.equal(admin, undefined);
  assert.equal(sql('SELECT password_hash FROM usuarios ORDER BY id'), antes);
});

test('muestra los límites del servidor y advierte si están por debajo de 32 MB', async () => {
  const { respuesta } = await instalar();
  assert.match(respuesta.texto, /post_max_size/);
  assert.match(respuesta.texto, /max_allowed_packet/);
  assert.match(respuesta.texto, /por debajo de 32 MB/); // Docker usa post_max_size=16M.
});

test('una instalación interrumpida antes de crear usuarios se puede repetir', async () => {
  await instalar();
  sql('SET FOREIGN_KEY_CHECKS=0; DELETE FROM usuarios; DROP TABLE actividad;');
  const { respuesta, admin } = await instalar();
  assert.equal(respuesta.estado, 200);
  assert.equal(admin.length, 16);
  assert.equal(sql("SHOW TABLES LIKE 'actividad'"), 'actividad');
});
