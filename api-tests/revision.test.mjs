// Casos encontrados en la revisión final de la rama.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { beforeEach, test } from 'node:test';
import { entrar, guardar, instalar, limpiarBase, nuevoRegistro, peticion, sql } from './ayuda.mjs';

let admin;
let paramedico;
let claves;
beforeEach(async () => {
  limpiarBase();
  claves = await instalar();
  admin = await entrar('admin', claves.admin);
  paramedico = await entrar('paramedico', claves.paramedico);
});

test('respuesta perdida: la misma edición con version vieja se acepta y devuelve la vigente', async () => {
  const edicionId = crypto.randomUUID();
  const registro = nuevoRegistro({ edicionId, folio: 'A' });
  await guardar(registro, admin);
  await guardar({ ...registro, version: 1, folio: 'B' }, admin);
  // La respuesta del guardado anterior nunca llegó: el cliente sigue en version 1.
  const r = await guardar({ ...registro, version: 1, folio: 'C' }, admin);
  assert.equal(r.estado, 200);
  assert.equal(r.json.version, 3);
  assert.equal((await peticion(`registros/${registro.id}`, { cookie: admin })).json.folio, 'C');
});

test('respuesta perdida al crear: reenviar con version 0 y la misma edición se acepta', async () => {
  const registro = nuevoRegistro({ edicionId: crypto.randomUUID(), folio: 'A' });
  await guardar(registro, admin);
  const r = await guardar({ ...registro, folio: 'B' }, admin);
  assert.equal(r.estado, 200);
  assert.equal(r.json.version, 2);
});

test('otra edición con version vieja sigue siendo conflicto', async () => {
  const registro = nuevoRegistro({ edicionId: crypto.randomUUID(), folio: 'A' });
  await guardar(registro, admin);
  await guardar({ ...registro, version: 1, folio: 'B' }, admin);
  const r = await guardar({ ...registro, edicionId: crypto.randomUUID(), version: 1, folio: 'C' }, paramedico);
  assert.equal(r.estado, 409);
  assert.equal(r.json.codigo, 'conflicto');
});

test('la misma edición no pisa lo que otra persona guardó después', async () => {
  const mia = crypto.randomUUID();
  const registro = nuevoRegistro({ edicionId: mia, folio: 'MIO' });
  await guardar(registro, admin);
  await guardar({ ...registro, edicionId: crypto.randomUUID(), version: 1, folio: 'DE-OTRO' }, paramedico);
  const r = await guardar({ ...registro, edicionId: mia, version: 1, folio: 'PISADO' }, admin);
  assert.equal(r.estado, 409);
  assert.equal((await peticion(`registros/${registro.id}`, { cookie: admin })).json.folio, 'DE-OTRO');
});

test('la misma edición no revive un registro eliminado', async () => {
  const registro = nuevoRegistro({ edicionId: crypto.randomUUID() });
  await guardar(registro, admin);
  await peticion(`registros/${registro.id}/eliminar`, { metodo: 'POST', cookie: admin });
  const r = await guardar({ ...registro, version: 1 }, admin);
  assert.equal(r.json.codigo, 'eliminado');
});

test('si falla la actividad el guardado no queda a medias', async () => {
  sql('DROP TABLE actividad');
  const r = await guardar(nuevoRegistro(), admin);
  assert.equal(r.estado, 500);
  assert.equal(sql('SELECT COUNT(*) FROM registros'), '0');
});

test('ultimo ignora un registro de otra persona que yo edité', async () => {
  const mio = nuevoRegistro({ folio: 'MIO' });
  await guardar(mio, paramedico);
  const ajeno = nuevoRegistro({ folio: 'AJENO' });
  await guardar(ajeno, admin);
  await guardar({ ...ajeno, version: 1 }, paramedico);
  assert.equal((await peticion('registros/ultimo', { cookie: paramedico })).json.id, mio.id);
});

test('ultimo ignora un registro finalizado', async () => {
  const registro = nuevoRegistro({ finalizado: true });
  await guardar(registro, paramedico);
  assert.equal((await peticion('registros/ultimo', { cookie: paramedico })).estado, 404);
  assert.equal((await peticion(`registros/${registro.id}`, { cookie: paramedico })).estado, 200);
});

test('cambiar la contraseña cierra las sesiones abiertas de esa persona', async () => {
  const id = sql("SELECT id FROM usuarios WHERE usuario = 'paramedico'");
  await peticion(`usuarios/${id}`, { metodo: 'POST', cuerpo: { clave: 'clave-nueva-1' }, cookie: admin });
  assert.equal((await peticion('sesion', { cookie: paramedico })).estado, 401);
  assert.equal((await peticion('sesion', { cookie: admin })).estado, 200);
});

test('editar el nombre no cierra la sesión', async () => {
  const id = sql("SELECT id FROM usuarios WHERE usuario = 'paramedico'");
  await peticion(`usuarios/${id}`, { metodo: 'POST', cuerpo: { nombre: 'Otro' }, cookie: admin });
  assert.equal((await peticion('sesion', { cookie: paramedico })).estado, 200);
});

test('un registro que no cabría en memoria al leerlo se rechaza al guardar', () => {
  const php = `require '/var/www/html/api/db.php'; require '/var/www/html/api/http.php'; require '/var/www/html/api/sesion.php'; require '/var/www/html/api/actividad.php'; require '/var/www/html/api/registros.php';
    echo json_encode([excedeLimites(10, 100, 100), excedeLimites(101, 100, 1000), excedeLimites(40, 100, 100), excedeLimites(40, 100, -1), excedeLimites(40, 0, 1000)]);`;
  const salida = execFileSync('docker', ['compose', 'exec', '-T', 'php', 'php', '-r', php], { encoding: 'utf8' });
  assert.equal(salida, '[false,true,true,false,false]');
});

test('el instalador avisa si memory_limit baja de 128 MB, no de 32', () => {
  const salida = execFileSync('docker', ['compose', 'exec', '-T', 'php', 'grep', '-c', 'MINIMO_MEMORIA', '/var/www/html/api/instalar.php'], { encoding: 'utf8' }).trim();
  assert.ok(Number(salida) >= 2);
});
