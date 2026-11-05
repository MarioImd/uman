// Entorno aislado para las pruebas: otro proyecto de Docker, otro puerto y otra
// base. Las pruebas vacían su base, así que nunca deben tocar la de desarrollo.
import { execFileSync } from 'node:child_process';

export const PROYECTO = 'umampruebas';
const PUERTO = '8090';

process.env.COMPOSE_PROJECT_NAME = PROYECTO;
process.env.UMAM_PUERTO = PUERTO;
process.env.API_URL = `http://localhost:${PUERTO}/api`;

const compose = (...args) => execFileSync('docker', ['compose', ...args], { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });

export async function levantarEntorno() {
  compose('up', '-d', '--build');
  for (let i = 0; i < 90; i++) {
    try {
      compose('exec', '-T', 'db', 'mariadb', '-uroot', '-proot', 'umam', '-e', 'SELECT 1');
      await fetch(`${process.env.API_URL}/sesion`);
      return;
    } catch {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  throw new Error('El entorno de pruebas no arrancó');
}

export function apagarEntorno() {
  compose('down', '-v');
}
