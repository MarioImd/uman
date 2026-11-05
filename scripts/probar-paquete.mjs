// Prueba el paquete deploy/ en Apache real: raíz, subcarpeta, HTTPS, PHP-FPM y
// hostings mal configurados. Requiere Docker y haber corrido npm run build:cpanel.
// Uso: npm run test:paquete
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const raiz = process.cwd().replaceAll('\\', '/');
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

if (!existsSync('deploy/index.html')) throw new Error('Falta deploy/. Corre npm run build:cpanel.');

const SITIOS = [
  { nombre: 'umam-raiz', puerto: 8081, ruta: '/var/www/html' },
  { nombre: 'umam-sub', puerto: 8082, ruta: '/var/www/html/umam' },
  { nombre: 'umam-display', puerto: 8083, ruta: '/var/www/html', ini: 'display-on.ini' },
  { nombre: 'umam-sinmb', puerto: 8084, ruta: '/var/www/html', ini: 'sin-mbstring.ini' },
  { nombre: 'umam-mala', puerto: 8085, ruta: '/var/www/html', config: 'config-mala.php' },
  { nombre: 'umam-forzado', puerto: 8086, ruta: '/var/www/html', config: 'config-forzado.php' },
  { nombre: 'umam-fpm', puerto: 8087, ruta: '/var/www/html', imagen: 'uman-fpm' },
];

// Archivos que no vienen en el paquete pero que un hosting podría tener.
const SEMBRAR = `mkdir -p .well-known/acme-challenge api/sesiones
echo secreto > nota.md; echo secreto > respaldo.sql; echo secreto > errores.log; echo secreto > .env; echo secreto > api/nota.md
echo secreto > api/sesiones/sess_abc; echo validacion > .well-known/acme-challenge/prueba`;

function quitar() {
  for (const { nombre } of SITIOS) spawnSync('docker', ['rm', '-f', nombre], { stdio: 'ignore' });
}

function arrancar({ nombre, puerto, ruta, ini, config = 'config.php', imagen = 'uman-php' }) {
  const volumenes = [
    '-v', `${raiz}/docker/php/config.php:/etc/umam/config.php:ro`,
    '-v', `${raiz}/docker/php/${config}:/etc/umam/activa.php:ro`,
  ];
  if (ini) volumenes.push('-v', `${raiz}/docker/php/${ini}:/usr/local/etc/php/conf.d/zz-prueba.ini:ro`);
  docker('run', '-d', '--name', nombre, '--network', 'uman_default', '-p', `${puerto}:80`,
    '--add-host', 'umam.test:127.0.0.1', '-e', 'UMAM_CONFIG=/etc/umam/activa.php', ...volumenes, imagen);
  docker('exec', nombre, 'mkdir', '-p', ruta);
  docker('cp', 'deploy/.', `${nombre}:${ruta}`);
  docker('exec', '-w', ruta, nombre, 'sh', '-c', SEMBRAR);
}

async function esperar({ puerto }) {
  for (let i = 0; i < 60; i++) {
    try {
      await fetch(`http://localhost:${puerto}/`);
      return;
    } catch {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  throw new Error(`El contenedor del puerto ${puerto} no respondió`);
}

let resultado = 1;
try {
  docker('compose', 'up', '-d', '--build');
  docker('build', '-f', 'docker/php/Dockerfile.fpm', '-t', 'uman-fpm', 'docker/php');
  quitar();
  for (const sitio of SITIOS) arrancar(sitio);
  for (const sitio of SITIOS) await esperar(sitio);
  resultado = spawnSync('node', ['--test', '--test-concurrency=1', 'api-tests/paquete/paquete.test.mjs'], { stdio: 'inherit' }).status;
} finally {
  quitar();
}
process.exit(resultado ?? 1);
