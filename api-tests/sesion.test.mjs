import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { entrar, instalar, limpiarBase, peticion, sql } from './ayuda.mjs';

let claves;
beforeEach(async () => {
  limpiarBase();
  claves = await instalar();
});

const login = (usuario, clave) => peticion('sesion/login', { metodo: 'POST', cuerpo: { usuario, clave } });

test('login correcto devuelve el usuario y una cookie HttpOnly con SameSite=Lax', async () => {
  const r = await login('admin', claves.admin);
  assert.equal(r.estado, 200);
  assert.equal(r.json.usuario, 'admin');
  assert.equal(r.json.rol, 'admin');
  assert.equal(r.json.password_hash, undefined);
  assert.match(r.setCookie, /HttpOnly/i);
  assert.match(r.setCookie, /SameSite=Lax/i);
});

test('login incorrecto responde 401 con el mismo mensaje para usuario inexistente y clave mala', async () => {
  const claveMala = await login('admin', 'clave-mala');
  const sinUsuario = await login('nadie', 'clave-mala');
  assert.equal(claveMala.estado, 401);
  assert.equal(sinUsuario.estado, 401);
  assert.deepEqual(claveMala.json, sinUsuario.json);
});

test('el sexto intento responde 429 aunque la clave sea correcta', async () => {
  for (let i = 0; i < 5; i++) assert.equal((await login('admin', 'mala')).estado, 401);
  assert.equal((await login('admin', claves.admin)).estado, 429);
});

test('un login correcto reinicia los intentos fallidos', async () => {
  for (let i = 0; i < 4; i++) await login('admin', 'mala');
  assert.equal((await login('admin', claves.admin)).estado, 200);
  for (let i = 0; i < 4; i++) await login('admin', 'mala');
  assert.equal((await login('admin', claves.admin)).estado, 200);
});

test('GET api/sesion sin cookie responde 401', async () => {
  assert.equal((await peticion('sesion')).estado, 401);
});

test('GET api/sesion con cookie devuelve el usuario actual', async () => {
  const cookie = await entrar('paramedico', claves.paramedico);
  const r = await peticion('sesion', { cookie });
  assert.equal(r.estado, 200);
  assert.equal(r.json.usuario, 'paramedico');
  assert.equal(r.json.rol, 'usuario');
});

test('usuario desactivado con sesión abierta recibe 401 en la siguiente petición', async () => {
  const cookie = await entrar('paramedico', claves.paramedico);
  sql("UPDATE usuarios SET activo = 0 WHERE usuario = 'paramedico'");
  assert.equal((await peticion('sesion', { cookie })).estado, 401);
});

test('usuario desactivado no puede entrar', async () => {
  sql("UPDATE usuarios SET activo = 0 WHERE usuario = 'paramedico'");
  assert.equal((await login('paramedico', claves.paramedico)).estado, 401);
});

test('logout invalida la cookie', async () => {
  const cookie = await entrar('admin', claves.admin);
  assert.equal((await peticion('sesion/logout', { metodo: 'POST', cookie })).estado, 200);
  assert.equal((await peticion('sesion', { cookie })).estado, 401);
});

test('api/config.php y api/schema.sql no se pueden descargar', async () => {
  for (const archivo of ['config.php', 'config.example.php', 'schema.sql', 'db.php', 'sesion.php']) {
    const r = await peticion(archivo);
    assert.equal(r.estado, 404, archivo);
    assert.doesNotMatch(r.texto, /CREATE TABLE|db_clave/);
  }
});

test('las respuestas llevan Cache-Control: no-store', async () => {
  assert.match((await peticion('sesion')).headers.get('cache-control'), /no-store/);
});

test('una ruta inexistente responde 404 en JSON', async () => {
  const r = await peticion('no-existe');
  assert.equal(r.estado, 404);
  assert.ok(r.json.error);
});

test('un cuerpo que no es JSON responde 400', async () => {
  const r = await peticion('sesion/login', { metodo: 'POST', formulario: { usuario: 'admin' } });
  assert.equal(r.estado, 400);
});
