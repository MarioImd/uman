// Corre las pruebas de la API en el entorno aislado. Uso: npm run test:api
import { spawnSync } from 'node:child_process';
import { apagarEntorno, levantarEntorno } from './entorno-pruebas.mjs';

let resultado = 1;
try {
  await levantarEntorno();
  resultado = spawnSync('node', ['--test', '--test-concurrency=1', 'api-tests/*.test.mjs'], { stdio: 'inherit' }).status;
} finally {
  apagarEntorno();
}
process.exit(resultado ?? 1);
