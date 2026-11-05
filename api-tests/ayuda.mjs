// Utilidades para probar la API contra el entorno de Docker.
import { execFileSync } from 'node:child_process';

const BASE = process.env.API_URL ?? 'http://localhost:8080/api';
export const TOKEN = 'token-de-prueba';

export async function peticion(ruta, { metodo = 'GET', cuerpo, cookie, formulario, crudo, tipo, headers: extra, base = BASE } = {}) {
  const headers = { ...extra };
  if (cookie) headers.Cookie = cookie;
  let body;
  if (crudo !== undefined) {
    if (tipo) headers['Content-Type'] = tipo;
    body = new Blob([crudo]); // Un Blob sin tipo no agrega Content-Type.
  } else if (formulario) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    body = new URLSearchParams(formulario).toString();
  } else if (cuerpo !== undefined || metodo !== 'GET') {
    // Igual que el frontend: todo POST lleva JSON, aunque sea vacío.
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(cuerpo ?? {});
  }
  const respuesta = await fetch(`${base}/${ruta}`, { method: metodo, headers, body, redirect: 'manual' });
  const texto = await respuesta.text();
  let json;
  try { json = JSON.parse(texto); } catch { json = undefined; }
  return {
    estado: respuesta.status,
    texto,
    json,
    headers: respuesta.headers,
    // Como un navegador: si la misma cookie llega dos veces, gana la última.
    cookie: [...new Map(respuesta.headers.getSetCookie().map(c => c.split(';')[0].split('='))).entries()]
      .map(([nombre, valor]) => `${nombre}=${valor}`).join('; '),
    setCookie: respuesta.headers.getSetCookie().join('\n'),
  };
}

/** Ejecuta SQL directo en la base de Docker y devuelve la salida como texto. */
export function sql(consulta) {
  return execFileSync(
    'docker', ['compose', 'exec', '-T', 'db', 'mariadb', '-uroot', '-proot', 'umam', '-N', '-B', '-e', consulta],
    { encoding: 'utf8' },
  ).trim();
}

export function limpiarBase() {
  sql('SET FOREIGN_KEY_CHECKS=0; DROP TABLE IF EXISTS actividad, intentos_login, registros, usuarios;');
}

/** Corre el instalador y devuelve las claves generadas. */
export async function instalar() {
  const r = await peticion('instalar.php', { metodo: 'POST', formulario: { token: TOKEN } });
  const clave = id => r.texto.match(new RegExp(`id="clave-${id}">([^<]+)<`))?.[1];
  return { respuesta: r, admin: clave('admin'), paramedico: clave('paramedico') };
}

export async function entrar(usuario, clave) {
  const r = await peticion('sesion/login', { metodo: 'POST', cuerpo: { usuario, clave } });
  return r.cookie;
}

/** Registro mínimo válido, como el que manda el frontend. */
export function nuevoRegistro(cambios = {}) {
  return {
    id: crypto.randomUUID(),
    fechaCreacion: new Date().toISOString(),
    estado: '',
    ciudad: '',
    folio: '',
    version: 0,
    datosPaciente: {},
    signosVitales: [],
    ...cambios,
  };
}

export function guardar(registro, cookie) {
  return peticion(`registros/${registro.id}`, { metodo: 'POST', cuerpo: registro, cookie });
}
