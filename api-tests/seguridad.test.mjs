import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { beforeEach, test } from 'node:test';
import { entrar, guardar, instalar, limpiarBase, nuevoRegistro, peticion, sql, TOKEN } from './ayuda.mjs';

let admin;
let claves;
beforeEach(async () => {
  limpiarBase();
  claves = await instalar();
  admin = await entrar('admin', claves.admin);
});

const enPhp = (...comando) => execFileSync('docker', ['compose', 'exec', '-T', 'php', ...comando], { encoding: 'utf8' });

// --- Log de errores ---

test('un error interno queda en el log y no llega al cliente', async () => {
  enPhp('sh', '-c', 'rm -f /tmp/umam-errores.log');
  sql('DROP TABLE actividad');
  const r = await guardar(nuevoRegistro(), admin);
  assert.equal(r.estado, 500);
  assert.doesNotMatch(r.texto, /SQLSTATE|actividad|\.php/);
  assert.match(enPhp('cat', '/tmp/umam-errores.log'), /actividad/);
});

test('el log se configura desde el arranque aunque display_errors esté activado', () => {
  const salida = enPhp('php', '-d', 'display_errors=1', '-r', "require '/var/www/html/api/db.php'; prepararEntorno(); echo ini_get('display_errors'), '|', ini_get('error_log');");
  assert.equal(salida, '0|/tmp/umam-errores.log');
});

// --- Límite para la app ---

test('la sesión informa el tamaño máximo de un registro', async () => {
  const r = await peticion('sesion', { cookie: admin });
  assert.equal(r.json.limiteBytes, 16 * 1024 * 1024); // post_max_size en Docker.
  const login = await peticion('sesion/login', { metodo: 'POST', cuerpo: { usuario: 'admin', clave: claves.admin } });
  assert.equal(login.json.limiteBytes, 16 * 1024 * 1024);
});

test('el límite usa el valor más restrictivo y un tercio de la memoria', () => {
  const php = `require '/var/www/html/api/db.php'; require '/var/www/html/api/http.php'; require '/var/www/html/api/sesion.php'; require '/var/www/html/api/actividad.php'; require '/var/www/html/api/registros.php';
    echo json_encode([limiteRegistro(100, 900, 500), limiteRegistro(100, 90, 500), limiteRegistro(100, 900, 50), limiteRegistro(0, -1, 50)]);`;
  assert.equal(enPhp('php', '-r', php), '[100,30,50,50]');
});

test('el servidor sigue validando por su cuenta', async () => {
  const r = await guardar(nuevoRegistro({ observaciones: { foto: 'A'.repeat(17 * 1024 * 1024) } }), admin);
  assert.equal(r.estado, 413);
});

// --- instalar.php ---

test('una falla al crear usuarios no deja cuentas a medias ni muestra detalles', async () => {
  sql("DELETE FROM usuarios WHERE rol = 'admin'");
  const r = await peticion('instalar.php', { metodo: 'POST', formulario: { token: TOKEN } });
  assert.equal(r.estado, 500);
  assert.doesNotMatch(r.texto, /SQLSTATE|Duplicate|Stack trace|var\/www/);
  assert.match(r.texto, /No se pudo instalar/);
  assert.equal(sql("SELECT COUNT(*) FROM usuarios WHERE rol = 'admin'"), '0');
});

// --- CSRF ---

test('un POST que no es JSON responde 415 y no escribe', async () => {
  const registro = nuevoRegistro();
  await guardar(registro, admin);
  const r = await peticion(`registros/${registro.id}/eliminar`, { metodo: 'POST', crudo: '{}', tipo: 'text/plain', cookie: admin });
  assert.equal(r.estado, 415);
  assert.equal(sql('SELECT eliminado FROM registros'), '0');
});

test('un formulario de otro sitio no puede crear usuarios', async () => {
  const r = await peticion('usuarios', { metodo: 'POST', formulario: { usuario: 'intruso' }, cookie: admin });
  assert.equal(r.estado, 415);
});

test('un POST sin Content-Type responde 415', async () => {
  const r = await peticion('sesion/logout', { metodo: 'POST', crudo: '', tipo: null, cookie: admin });
  assert.equal(r.estado, 415);
  assert.equal((await peticion('sesion', { cookie: admin })).estado, 200);
});

for (const metodo of ['PUT', 'PATCH', 'DELETE']) {
  test(`${metodo} sin JSON responde 415`, async () => {
    const r = await peticion('registros', { metodo, crudo: 'x', tipo: 'text/plain', cookie: admin });
    assert.equal(r.estado, 415);
  });
}

test('application/json con charset se acepta', async () => {
  const registro = nuevoRegistro();
  const r = await peticion(`registros/${registro.id}`, { metodo: 'POST', crudo: JSON.stringify(registro), tipo: 'application/json; charset=utf-8', cookie: admin });
  assert.equal(r.estado, 200);
});

test('un tipo que solo se parece a JSON responde 415', async () => {
  const r = await peticion('sesion/logout', { metodo: 'POST', crudo: '{}', tipo: 'application/jsonp', cookie: admin });
  assert.equal(r.estado, 415);
});

test('GET no exige Content-Type', async () => {
  assert.equal((await peticion('registros', { cookie: admin })).estado, 200);
});

// --- HTTPS ---

test('X-Forwarded-Proto no activa Secure si la configuración no lo indica', async () => {
  const r = await peticion('sesion/login', {
    metodo: 'POST', cuerpo: { usuario: 'admin', clave: claves.admin }, headers: { 'X-Forwarded-Proto': 'https' },
  });
  assert.doesNotMatch(r.setCookie, /Secure/i);
});

// --- Búsqueda ---

test('el patrón de búsqueda usa | como escape explícito', () => {
  const php = `require '/var/www/html/api/db.php'; require '/var/www/html/api/http.php'; require '/var/www/html/api/sesion.php'; require '/var/www/html/api/actividad.php'; require '/var/www/html/api/registros.php';
    echo patronBusqueda('5%_|\\\\x');`;
  assert.equal(enPhp('php', '-r', php), '%5|%|_||\\x%');
});

async function conSinEscapes(accion) {
  const modo = sql('SELECT @@GLOBAL.sql_mode');
  sql("SET GLOBAL sql_mode = CONCAT(@@GLOBAL.sql_mode, ',NO_BACKSLASH_ESCAPES')");
  try {
    await accion();
  } finally {
    sql(`SET GLOBAL sql_mode = '${modo}'`);
  }
}

for (const [nombre, envolver] of [['normal', accion => accion()], ['con NO_BACKSLASH_ESCAPES', conSinEscapes]]) {
  test(`la búsqueda trata % _ | y \\ como texto, modo ${nombre}`, async () => {
    for (const folio of ['ABC', '50%', 'A_B', 'X|Y', 'C\\D']) await guardar(nuevoRegistro({ folio }), admin);
    await envolver(async () => {
      for (const [texto, total] of [['%', 1], ['_', 1], ['|', 1], ['\\', 1], ['A', 2]]) {
        const r = await peticion(`registros?q=${encodeURIComponent(texto)}`, { cookie: admin });
        assert.equal(r.json.total, total, texto);
      }
    });
  });

  test(`la actividad trata % y _ como texto, modo ${nombre}`, async () => {
    await guardar(nuevoRegistro({ folio: 'ABC' }), admin);
    await guardar(nuevoRegistro({ folio: '50%' }), admin);
    await envolver(async () => {
      // "%" solo aparece en un folio; "_" en ningún folio ni usuario.
      assert.equal((await peticion(`actividad?q=${encodeURIComponent('%')}`, { cookie: admin })).json.total, 1);
      assert.equal((await peticion(`actividad?q=${encodeURIComponent('_')}`, { cookie: admin })).json.total, 0);
    });
  });
}
