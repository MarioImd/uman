// Corre con scripts/probar-paquete.mjs, que levanta los contenedores.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { beforeEach, describe, test } from 'node:test';
import { limpiarBase, nuevoRegistro, peticion, sql, TOKEN } from '../ayuda.mjs';

const base = (puerto, ruta = '') => `http://localhost:${puerto}${ruta}/api`;

/** Curl desde dentro del contenedor, donde umam.test tiene HTTP en 80 y HTTPS en 443. */
const curl = (contenedor, ...args) => execFileSync('docker', ['exec', contenedor, 'curl', '-sk', ...args], { encoding: 'utf8' });
const resumen = (contenedor, url, ...args) => curl(contenedor, '-o', '/dev/null', '-w', '%{http_code} %{num_redirects} %{redirect_url}', ...args, url).trim();

async function instalarEn(url) {
  const r = await peticion('instalar.php', { base: url, metodo: 'POST', formulario: { token: TOKEN } });
  return { respuesta: r, admin: r.texto.match(/id="clave-admin">([^<]+)</)?.[1], paramedico: r.texto.match(/id="clave-paramedico">([^<]+)</)?.[1] };
}
const entrarEn = (url, usuario, clave) => peticion('sesion/login', { base: url, metodo: 'POST', cuerpo: { usuario, clave } });

const SITIOS = [
  { nombre: 'raíz', contenedor: 'umam-raiz', puerto: 8081, ruta: '' },
  { nombre: 'subcarpeta', contenedor: 'umam-sub', puerto: 8082, ruta: '/umam' },
];

for (const { nombre, contenedor, puerto, ruta } of SITIOS) {
  describe(`paquete en ${nombre}`, () => {
    const web = `http://localhost:${puerto}${ruta}`;
    const estado = async archivo => (await fetch(`${web}/${archivo}`, { redirect: 'manual' })).status;

    test('el paquete incluye los .htaccess y funciona', async () => {
      assert.equal(await estado(''), 200);
      assert.equal(await estado('api/sesion'), 401);
      const archivos = execFileSync('docker', ['exec', contenedor, 'ls', '-a', `/var/www/html${ruta}`, `/var/www/html${ruta}/api`], { encoding: 'utf8' });
      assert.equal(archivos.match(/^\.htaccess$/gm)?.length, 2);
    });

    for (const archivo of [
      'api/schema.sql', 'api/config.php', 'api/config.example.php', 'api/sesiones/sess_abc', 'api/sesiones/', 'api/nota.md',
      'api/.htaccess', 'api/.user.ini', 'nota.md', 'respaldo.sql', 'errores.log', '.env', '.htaccess',
    ]) {
      test(`${archivo} devuelve 403`, async () => assert.equal(await estado(archivo), 403));
    }

    test('.well-known sigue accesible para que AutoSSL valide', async () => {
      assert.equal(await estado('.well-known/acme-challenge/prueba'), 200);
      const r = resumen(contenedor, `http://umam.test${ruta}/.well-known/acme-challenge/prueba`);
      assert.equal(r.split(' ')[0], '200', 'por HTTP no debe redirigir');
    });

    test('HTTP redirige una sola vez a HTTPS', () => {
      assert.equal(resumen(contenedor, `http://umam.test${ruta}/`), `301 0 https://umam.test${ruta}/`);
      assert.equal(resumen(contenedor, `http://umam.test${ruta}/api/sesion`), `301 0 https://umam.test${ruta}/api/sesion`);
    });

    test('siguiendo redirecciones no hay bucle', () => {
      assert.match(resumen(contenedor, `http://umam.test${ruta}/`, '-L', '--max-redirs', '3'), /^200 1$/);
      assert.match(resumen(contenedor, `http://umam.test${ruta}/api/sesion`, '-L', '--max-redirs', '3'), /^401 1$/);
    });

    test('por HTTPS responde sin redirigir', () => {
      assert.match(resumen(contenedor, `https://umam.test${ruta}/`), /^200 0$/);
      assert.match(resumen(contenedor, `https://umam.test${ruta}/api/sesion`), /^401 0$/);
    });

    test('X-Forwarded-Proto no evita la redirección', () => {
      assert.match(resumen(contenedor, `http://umam.test${ruta}/`, '-H', 'X-Forwarded-Proto: https'), /^301 /);
      assert.match(resumen(contenedor, `http://umam.test${ruta}/api/sesion`, '-H', 'X-Forwarded-Proto: https'), /^301 /);
    });

    test('sin forzar_https no se envía HSTS', () => {
      assert.doesNotMatch(curl(contenedor, '-I', `https://umam.test${ruta}/api/sesion`), /strict-transport-security/i);
    });
  });
}

describe('hosting con display_errors activado', () => {
  beforeEach(() => limpiarBase());

  test('instalar.php avisa que display_errors está activado', async () => {
    const { respuesta } = await instalarEn(base(8083));
    assert.match(respuesta.texto, /display_errors está activado/);
  });

  test('la app recibe el límite para no enviar lo que dañaría la respuesta', async () => {
    for (const puerto of [8083, 8087]) {
      const url = base(puerto);
      limpiarBase();
      const claves = await instalarEn(url);
      const r = await entrarEn(url, 'paramedico', claves.paramedico);
      assert.equal(r.json.limiteBytes, 16 * 1024 * 1024, `puerto ${puerto}`);
    }
  });

  test('con PHP-FPM un guardado normal funciona', async () => {
    const url = base(8087);
    const claves = await instalarEn(url);
    const { cookie } = await entrarEn(url, 'paramedico', claves.paramedico);
    const registro = nuevoRegistro();
    const r = await peticion(`registros/${registro.id}`, { base: url, metodo: 'POST', cuerpo: registro, cookie });
    assert.equal(r.estado, 200);
  });
});

describe('hosting con display_errors apagado', () => {
  beforeEach(() => limpiarBase());

  for (const [nombre, puerto] of [['módulo de Apache', 8081], ['PHP-FPM', 8088]]) {
    test(`con ${nombre} el 413 es JSON válido`, async () => {
      const url = base(puerto);
      const claves = await instalarEn(url);
      const { cookie } = await entrarEn(url, 'paramedico', claves.paramedico);
      const registro = nuevoRegistro({ observaciones: { foto: 'A'.repeat(17 * 1024 * 1024) } });
      const r = await peticion(`registros/${registro.id}`, { base: url, metodo: 'POST', cuerpo: registro, cookie });
      assert.equal(r.estado, 413);
      assert.match(r.headers.get('content-type'), /application\/json/);
      assert.ok(r.json?.error, `cuerpo: ${r.texto.slice(0, 200)}`);
      assert.equal(sql('SELECT COUNT(*) FROM registros'), '0');
    });
  }
});

describe('hosting sin mbstring', () => {
  beforeEach(() => limpiarBase());

  test('instalar.php lo dice y no instala', async () => {
    const { respuesta, admin } = await instalarEn(base(8084));
    assert.equal(respuesta.estado, 500);
    assert.match(respuesta.texto, /mbstring/);
    assert.equal(admin, undefined);
    assert.equal(sql("SHOW TABLES LIKE 'usuarios'"), '');
  });

  test('la API falla con un error entendible, en JSON', async () => {
    const r = await entrarEn(base(8084), 'admin', 'x');
    assert.equal(r.estado, 500);
    assert.match(r.json?.error ?? '', /mbstring/);
  });
});

describe('hosting con datos de conexión incorrectos', () => {
  test('instalar.php no revela detalles', async () => {
    const r = await peticion('instalar.php', { base: base(8085), metodo: 'POST', formulario: { token: TOKEN } });
    assert.equal(r.estado, 500);
    assert.doesNotMatch(r.texto, /SQLSTATE|Access denied|usuario_que_no_existe|Stack trace|var\/www/);
    assert.match(r.texto, /No se pudo instalar/);
  });

  test('la API responde un error genérico', async () => {
    const r = await entrarEn(base(8085), 'admin', 'x');
    assert.equal(r.estado, 500);
    assert.deepEqual(r.json, { error: 'Error interno del servidor.' });
  });
});

describe('forzar_https activado con proxy de confianza', () => {
  const url = base(8086);
  beforeEach(() => limpiarBase());

  test('la cookie de sesión lleva Secure', async () => {
    const claves = await instalarEn(url);
    assert.match((await entrarEn(url, 'admin', claves.admin)).setCookie, /Secure/i);
  });

  test('envía HSTS si el proxy dice que la conexión es HTTPS', async () => {
    const r = await peticion('sesion', { base: url, headers: { 'X-Forwarded-Proto': 'https' } });
    assert.match(r.headers.get('strict-transport-security') ?? '', /max-age=\d+/);
  });

  test('no envía HSTS por HTTP', async () => {
    assert.equal((await peticion('sesion', { base: url })).headers.get('strict-transport-security'), null);
  });
});

test('ningún .htaccess usa php_flag ni php_value', () => {
  for (const archivo of ['deploy/.htaccess', 'deploy/api/.htaccess']) {
    assert.doesNotMatch(readFileSync(archivo, 'utf8'), /^\s*php_(flag|value|admin)/m);
  }
});
