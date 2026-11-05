import assert from 'node:assert/strict';
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

const idDe = usuario => sql(`SELECT id FROM usuarios WHERE usuario = '${usuario}'`);
const crear = (datos, cookie = admin) => peticion('usuarios', { metodo: 'POST', cuerpo: datos, cookie });
const editar = (id, datos, cookie = admin) => peticion(`usuarios/${id}`, { metodo: 'POST', cuerpo: datos, cookie });
const valido = { usuario: 'nuevo', nombre: 'Persona Nueva', clave: 'clave-segura', rol: 'usuario' };

async function eliminado(cambios = {}) {
  const registro = nuevoRegistro({ folio: 'F-1', ...cambios });
  await guardar(registro, admin);
  await peticion(`registros/${registro.id}/eliminar`, { metodo: 'POST', cookie: paramedico });
  return registro;
}

test('sin sesión las rutas de administración responden 401', async () => {
  for (const ruta of ['usuarios', 'actividad', 'registros/eliminados']) {
    assert.equal((await peticion(ruta)).estado, 401, ruta);
  }
});

test('un usuario normal recibe 403 en usuarios, actividad, eliminados y restaurar', async () => {
  const registro = await eliminado();
  for (const ruta of ['usuarios', 'actividad', 'registros/eliminados']) {
    assert.equal((await peticion(ruta, { cookie: paramedico })).estado, 403, ruta);
  }
  assert.equal((await crear(valido, paramedico)).estado, 403);
  assert.equal((await editar(idDe('paramedico'), { rol: 'admin' }, paramedico)).estado, 403);
  assert.equal((await peticion(`registros/${registro.id}/restaurar`, { metodo: 'POST', cookie: paramedico })).estado, 403);
  assert.equal(sql('SELECT eliminado FROM registros'), '1');
  assert.equal(sql("SELECT rol FROM usuarios WHERE usuario = 'paramedico'"), 'usuario');
});

test('crear usuario permite iniciar sesión con él', async () => {
  const r = await crear(valido);
  assert.equal(r.estado, 200);
  assert.equal(r.json.usuario, 'nuevo');
  assert.equal(r.json.activo, true);
  const cookie = await entrar('nuevo', 'clave-segura');
  assert.equal((await peticion('sesion', { cookie })).json.nombre, 'Persona Nueva');
});

test('crear usuario con clave de 7 caracteres responde 400', async () => {
  assert.equal((await crear({ ...valido, clave: '1234567' })).estado, 400);
  assert.equal(sql("SELECT COUNT(*) FROM usuarios WHERE usuario = 'nuevo'"), '0');
});

test('crear usuario con datos incompletos o rol inválido responde 400', async () => {
  assert.equal((await crear({ ...valido, usuario: '' })).estado, 400);
  assert.equal((await crear({ ...valido, nombre: '  ' })).estado, 400);
  assert.equal((await crear({ ...valido, rol: 'jefe' })).estado, 400);
});

test('usuario repetido responde 409', async () => {
  assert.equal((await crear({ ...valido, usuario: 'paramedico' })).estado, 409);
});

test('ninguna respuesta contiene password_hash', async () => {
  const respuestas = [await peticion('usuarios', { cookie: admin }), await crear(valido), await editar(idDe('paramedico'), { nombre: 'Otro' })];
  for (const r of respuestas) assert.doesNotMatch(r.texto, /password|\$2y\$/);
});

test('la lista de usuarios incluye rol y estado', async () => {
  const r = await peticion('usuarios', { cookie: admin });
  assert.deepEqual(r.json.map(u => [u.usuario, u.rol, u.activo]), [['admin', 'admin', true], ['paramedico', 'usuario', true]]);
});

test('desactivar un usuario le corta el acceso', async () => {
  const r = await editar(idDe('paramedico'), { activo: false });
  assert.equal(r.json.activo, false);
  assert.equal((await peticion('sesion', { cookie: paramedico })).estado, 401);
});

test('cambiar la clave invalida la anterior y exige 8 caracteres', async () => {
  const id = idDe('paramedico');
  assert.equal((await editar(id, { clave: 'corta' })).estado, 400);
  assert.equal((await editar(id, { clave: 'clave-nueva-1' })).estado, 200);
  const login = clave => peticion('sesion/login', { metodo: 'POST', cuerpo: { usuario: 'paramedico', clave } });
  assert.equal((await login(claves.paramedico)).estado, 401);
  assert.equal((await login('clave-nueva-1')).estado, 200);
});

test('no se puede desactivar ni degradar al último admin activo', async () => {
  const id = idDe('admin');
  assert.equal((await editar(id, { activo: false })).estado, 409);
  assert.equal((await editar(id, { rol: 'usuario' })).estado, 409);
  assert.equal(sql("SELECT rol, activo FROM usuarios WHERE usuario = 'admin'"), 'admin\t1');
});

test('con otro admin activo sí se puede degradar', async () => {
  await crear({ ...valido, usuario: 'segundo', rol: 'admin' });
  assert.equal((await editar(idDe('admin'), { rol: 'usuario' })).estado, 200);
});

test('editar un usuario inexistente responde 404', async () => {
  assert.equal((await editar(9999, { nombre: 'Nadie' })).estado, 404);
});

test('eliminados lista quién y cuándo, sin imágenes', async () => {
  await eliminado({ observaciones: { fotos: ['data:image/jpeg;base64,AAAA'] } });
  const r = await peticion('registros/eliminados', { cookie: admin });
  assert.equal(r.json.total, 1);
  assert.equal(r.json.items[0].folio, 'F-1');
  assert.equal(r.json.items[0].eliminadoPor, 'paramedico');
  assert.match(r.json.items[0].eliminadoEn, /^\d{4}-\d{2}-\d{2}T.*Z$/);
  assert.doesNotMatch(r.texto, /base64/);
});

test('restaurar devuelve el registro a la lista y registra la acción', async () => {
  const registro = await eliminado();
  const r = await peticion(`registros/${registro.id}/restaurar`, { metodo: 'POST', cookie: admin });
  assert.equal(r.estado, 200);
  assert.equal((await peticion('registros', { cookie: paramedico })).json.total, 1);
  assert.equal((await peticion('registros/eliminados', { cookie: admin })).json.total, 0);
  assert.equal(sql("SELECT COUNT(*) FROM actividad WHERE accion = 'restauro'"), '1');
  assert.equal(sql('SELECT eliminado_por IS NULL, eliminado_en IS NULL FROM registros'), '1\t1');
});

test('restaurar un registro que no está eliminado responde 404', async () => {
  const registro = nuevoRegistro();
  await guardar(registro, admin);
  assert.equal((await peticion(`registros/${registro.id}/restaurar`, { metodo: 'POST', cookie: admin })).estado, 404);
});

test('actividad devuelve quién, acción, folio y fechas, más reciente primero', async () => {
  await eliminado();
  const r = await peticion('actividad', { cookie: admin });
  assert.equal(r.json.total, 2);
  assert.deepEqual(r.json.items.map(a => [a.usuario, a.accion, a.folio]), [['paramedico', 'elimino', 'F-1'], ['admin', 'creo', 'F-1']]);
  assert.match(r.json.items[0].inicio, /Z$/);
  assert.match(r.json.items[0].fin, /Z$/);
});

test('actividad filtra por usuario y folio', async () => {
  await eliminado();
  await guardar(nuevoRegistro({ folio: 'OTRO-2' }), paramedico);
  assert.equal((await peticion('actividad?q=OTRO', { cookie: admin })).json.total, 1);
  assert.equal((await peticion('actividad?q=admin', { cookie: admin })).json.total, 1);
  assert.equal((await peticion('actividad?q=paramedico', { cookie: admin })).json.total, 2);
});

test('actividad pagina', async () => {
  for (let i = 0; i < 3; i++) await guardar(nuevoRegistro(), admin);
  const r = await peticion('actividad?pagina=2&porPagina=2', { cookie: admin });
  assert.equal(r.json.total, 3);
  assert.equal(r.json.items.length, 1);
});
