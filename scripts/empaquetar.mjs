// Arma la carpeta deploy/ lista para subir a cPanel: frontend compilado + api/.
// Uso: npm run build:cpanel
import { cpSync, existsSync, readdirSync, rmSync } from 'node:fs';

const FRONTEND = 'dist/app-tmp/browser';
const DESTINO = 'deploy';

if (!existsSync(FRONTEND)) {
  throw new Error(`No existe ${FRONTEND}. Corre primero ng build.`);
}

rmSync(DESTINO, { recursive: true, force: true });
cpSync(FRONTEND, DESTINO, { recursive: true });
// config.php tiene las credenciales de cada servidor: nunca va en el paquete.
cpSync('api', `${DESTINO}/api`, { recursive: true, filter: origen => !origen.endsWith('config.php') || origen.endsWith('config.example.php') });

console.log(`Paquete listo en ${DESTINO}/:`, readdirSync(DESTINO).join(', '));
