import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { entrar, guardar, instalar, limpiarBase, nuevoRegistro, peticion, sql } from './ayuda.mjs';

let admin;
let paramedico;
beforeEach(async () => {
  limpiarBase();
  const claves = await instalar();
  admin = await entrar('admin', claves.admin);
  paramedico = await entrar('paramedico', claves.paramedico);
});

const conPaciente = (nombre, cambios = {}) => nuevoRegistro({ datosPaciente: { nombreOMediaFiliacion: nombre }, ...cambios });
const buscar = (q, cookie = admin) => peticion(`registros?q=${encodeURIComponent(q)}`, { cookie });

async function sembrar(cantidad) {
  const base = Date.UTC(2026, 0, 1);
  for (let i = 0; i < cantidad; i++) {
    const r = nuevoRegistro({ folio: `F-${i}`, fechaCreacion: new Date(base + i * 60000).toISOString() });
    assert.equal((await guardar(r, admin)).estado, 200);
  }
}

test('sin sesión todas las rutas responden 401', async () => {
  const r = nuevoRegistro();
  assert.equal((await peticion('registros')).estado, 401);
  assert.equal((await peticion('registros/ultimo')).estado, 401);
  assert.equal((await peticion(`registros/${r.id}`)).estado, 401);
  assert.equal((await guardar(r)).estado, 401);
  assert.equal((await peticion(`registros/${r.id}/eliminar`, { metodo: 'POST' })).estado, 401);
  assert.equal(sql('SELECT COUNT(*) FROM registros'), '0');
});

test('la lista pagina de 20 en 20, más reciente primero, con total real', async () => {
  await sembrar(25);
  const uno = await peticion('registros', { cookie: admin });
  assert.equal(uno.json.total, 25);
  assert.equal(uno.json.pagina, 1);
  assert.equal(uno.json.porPagina, 20);
  assert.equal(uno.json.items.length, 20);
  assert.equal(uno.json.items[0].folio, 'F-24');
  const dos = await peticion('registros?pagina=2', { cookie: admin });
  assert.equal(dos.json.items.length, 5);
  assert.equal(dos.json.items[4].folio, 'F-0');
});

test('porPagina=500 se limita a 100', async () => {
  const r = await peticion('registros?porPagina=500', { cookie: admin });
  assert.equal(r.json.porPagina, 100);
});

test('la lista no contiene datos ni imágenes', async () => {
  const imagen = 'data:image/jpeg;base64,' + 'A'.repeat(1000);
  await guardar(conPaciente('Ana', { folio: 'F-1', ciudad: 'Puebla', observaciones: { fotos: [imagen] } }), admin);
  const r = await peticion('registros', { cookie: admin });
  assert.deepEqual(Object.keys(r.json.items[0]).sort(), ['ciudad', 'fechaCreacion', 'folio', 'id', 'paciente']);
  assert.equal(r.json.items[0].paciente, 'Ana');
  assert.doesNotMatch(r.texto, /base64/);
});

test('busca por folio, ciudad y paciente fuera de la primera página', async () => {
  await guardar(conPaciente('Ana Torres', { folio: 'ZZ-9', ciudad: 'Oaxaca', fechaCreacion: '2020-01-01T00:00:00.000Z' }), admin);
  await sembrar(25);
  for (const q of ['ZZ-9', 'oaxaca', 'torres']) {
    const r = await buscar(q);
    assert.equal(r.json.total, 1, q);
    assert.equal(r.json.items[0].folio, 'ZZ-9');
  }
});

test('buscar perez encuentra Pérez', async () => {
  await guardar(conPaciente('Juan Pérez'), admin);
  assert.equal((await buscar('perez')).json.total, 1);
});

test('buscar % y _ no devuelve todo', async () => {
  await guardar(nuevoRegistro({ folio: 'ABC' }), admin);
  await guardar(nuevoRegistro({ folio: '50%' }), admin);
  await guardar(nuevoRegistro({ folio: 'A_B' }), admin);
  assert.equal((await buscar('%')).json.total, 1);
  assert.equal((await buscar('_')).json.total, 1);
});

test('crear con version 0 devuelve version 1', async () => {
  const r = await guardar(nuevoRegistro(), admin);
  assert.equal(r.estado, 200);
  assert.equal(r.json.version, 1);
});

test('obtener devuelve el registro completo con su version', async () => {
  const registro = conPaciente('Ana', { folio: 'F-1', signosVitales: [{ pulso: '80' }], observaciones: { nota: 'ñandú "x"' } });
  await guardar(registro, admin);
  const r = await peticion(`registros/${registro.id}`, { cookie: paramedico });
  assert.equal(r.estado, 200);
  assert.deepEqual(r.json, { ...registro, version: 1 });
});

test('guardar con version vigente la incrementa', async () => {
  const registro = nuevoRegistro();
  await guardar(registro, admin);
  const r = await guardar({ ...registro, version: 1, folio: 'NUEVO' }, paramedico);
  assert.equal(r.json.version, 2);
  assert.equal((await peticion(`registros/${registro.id}`, { cookie: admin })).json.folio, 'NUEVO');
});

test('guardar con version vieja responde 409 conflicto y no cambia datos', async () => {
  const registro = nuevoRegistro({ folio: 'ORIGINAL' });
  await guardar(registro, admin);
  await guardar({ ...registro, version: 1, folio: 'PRIMERO' }, admin);
  const r = await guardar({ ...registro, version: 1, folio: 'SEGUNDO' }, paramedico);
  assert.equal(r.estado, 409);
  assert.equal(r.json.codigo, 'conflicto');
  assert.equal((await peticion(`registros/${registro.id}`, { cookie: admin })).json.folio, 'PRIMERO');
});

test('crear con un id que ya existe responde 409 conflicto', async () => {
  const registro = nuevoRegistro({ folio: 'ORIGINAL' });
  await guardar(registro, admin);
  const r = await guardar({ ...registro, folio: 'OTRO' }, paramedico);
  assert.equal(r.estado, 409);
  assert.equal(r.json.codigo, 'conflicto');
});

test('guardar con id distinto al del cuerpo responde 400', async () => {
  const registro = nuevoRegistro();
  const r = await peticion(`registros/${crypto.randomUUID()}`, { metodo: 'POST', cuerpo: registro, cookie: admin });
  assert.equal(r.estado, 400);
});

test('guardar con fecha inválida responde 400', async () => {
  assert.equal((await guardar(nuevoRegistro({ fechaCreacion: 'ayer' }), admin)).estado, 400);
});

test('ultimo devuelve el último del propio usuario, no el de otro', async () => {
  const mio = conPaciente('Mío');
  await guardar(mio, paramedico);
  await guardar(conPaciente('De otro'), admin);
  const r = await peticion('registros/ultimo', { cookie: paramedico });
  assert.equal(r.json.id, mio.id);
  assert.equal(r.json.version, 1);
});

test('ultimo responde 404 si el usuario no tiene registros', async () => {
  await guardar(nuevoRegistro(), admin);
  assert.equal((await peticion('registros/ultimo', { cookie: paramedico })).estado, 404);
});

test('eliminar lo oculta de lista y detalle (404)', async () => {
  const registro = nuevoRegistro();
  await guardar(registro, admin);
  const r = await peticion(`registros/${registro.id}/eliminar`, { metodo: 'POST', cookie: paramedico });
  assert.equal(r.estado, 200);
  assert.equal((await peticion('registros', { cookie: admin })).json.total, 0);
  assert.equal((await peticion(`registros/${registro.id}`, { cookie: admin })).estado, 404);
  assert.equal((await peticion('registros/ultimo', { cookie: admin })).estado, 404);
  assert.equal(sql('SELECT COUNT(*) FROM registros WHERE eliminado = 1 AND eliminado_por IS NOT NULL'), '1');
});

test('guardar sobre uno eliminado responde 409 eliminado y no lo revive', async () => {
  const registro = nuevoRegistro();
  await guardar(registro, admin);
  await peticion(`registros/${registro.id}/eliminar`, { metodo: 'POST', cookie: admin });
  const r = await guardar({ ...registro, version: 1 }, paramedico);
  assert.equal(r.estado, 409);
  assert.equal(r.json.codigo, 'eliminado');
  assert.equal(sql('SELECT eliminado FROM registros'), '1');
});

test('cuerpo mayor a post_max_size responde 413 y no crea nada', async () => {
  const r = await guardar(nuevoRegistro({ observaciones: { foto: 'A'.repeat(17 * 1024 * 1024) } }), admin);
  assert.equal(r.estado, 413);
  assert.ok(r.json.error);
  assert.equal(sql('SELECT COUNT(*) FROM registros'), '0');
});

test('registro mayor a max_allowed_packet responde 413 y no crea nada', async () => {
  sql('SET GLOBAL max_allowed_packet = 1048576');
  try {
    const r = await guardar(nuevoRegistro({ observaciones: { foto: 'A'.repeat(3 * 1024 * 1024) } }), admin);
    assert.equal(r.estado, 413);
    assert.equal(sql('SELECT COUNT(*) FROM registros'), '0');
  } finally {
    sql('SET GLOBAL max_allowed_packet = 16777216');
  }
});

test('un registro con una foto de 5 MB se guarda y se recupera intacto', async () => {
  const foto = 'data:image/jpeg;base64,' + 'B'.repeat(5 * 1024 * 1024);
  const registro = nuevoRegistro({ observaciones: { fotos: [foto] } });
  assert.equal((await guardar(registro, admin)).estado, 200);
  const r = await peticion(`registros/${registro.id}`, { cookie: admin });
  assert.equal(r.json.observaciones.fotos[0], foto);
});

test('dos guardados del mismo usuario en 30 minutos dejan una fila edito; a más de 30, dos', async () => {
  const registro = nuevoRegistro({ folio: 'F-1' });
  await guardar(registro, admin);
  await guardar({ ...registro, version: 1 }, admin);
  await guardar({ ...registro, version: 2 }, admin);
  const filas = () => sql("SELECT COUNT(*) FROM actividad WHERE accion = 'edito'");
  assert.equal(filas(), '1');
  sql('UPDATE actividad SET fin = UTC_TIMESTAMP(3) - INTERVAL 31 MINUTE');
  await guardar({ ...registro, version: 3 }, admin);
  assert.equal(filas(), '2');
});

test('la edición de otra persona crea su propia fila de actividad', async () => {
  const registro = nuevoRegistro();
  await guardar(registro, admin);
  await guardar({ ...registro, version: 1 }, admin);
  await guardar({ ...registro, version: 2 }, paramedico);
  assert.equal(sql("SELECT COUNT(DISTINCT usuario_id) FROM actividad WHERE accion = 'edito'"), '2');
});

test('crear y eliminar quedan en la actividad', async () => {
  const registro = nuevoRegistro({ folio: 'F-7' });
  await guardar(registro, admin);
  await peticion(`registros/${registro.id}/eliminar`, { metodo: 'POST', cookie: paramedico });
  assert.equal(sql('SELECT accion, folio FROM actividad ORDER BY id'), 'creo\tF-7\nelimino\tF-7');
});

test('paciente de más de 255 caracteres se recorta en la columna y se conserva en datos', async () => {
  const nombre = 'ñ'.repeat(300);
  const registro = conPaciente(nombre);
  assert.equal((await guardar(registro, admin)).estado, 200);
  assert.equal(sql('SELECT CHAR_LENGTH(paciente) FROM registros'), '255');
  const r = await peticion(`registros/${registro.id}`, { cookie: admin });
  assert.equal(r.json.datosPaciente.nombreOMediaFiliacion, nombre);
});
