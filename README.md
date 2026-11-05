# Formato UMAM Digital

Formulario web que reproduce el "Registro de Atención Prehospitalaria" de UMAM, con exportación a
PDF y Excel. Frontend en Angular 20 y API en PHP con MySQL, pensada para publicarse en cPanel.

- Instalación en producción: `docs/instalacion-cpanel.md`
- Diseño: `docs/2026-11-05-migracion-php-mysql-design.md`

## Desarrollo local

Requiere Node y Docker. Docker solo se usa aquí; no se sube a cPanel.

```powershell
npm ci
docker compose up -d --build     # API en http://localhost:8080/api
npm start                        # App en http://localhost:4200 (proxy de /api)
```

La primera vez, abre `http://localhost:8080/api/instalar.php` y usa el token `token-de-prueba`
para crear las tablas y los usuarios `admin` y `paramedico`.

## Estructura

| Carpeta | Contenido |
|---|---|
| `src/` | Frontend Angular |
| `api/` | API PHP sin framework; `.htaccess` manda todo a `index.php` |
| `api-tests/` | Pruebas de la API contra el entorno de Docker |
| `docker/` | Imagen de PHP y configuración local |
| `scripts/` | Empaquetado para cPanel |

## Pruebas

```powershell
npx ng test --watch=false --browsers=ChromeHeadless   # Frontend
npm run test:api                                      # API (requiere Docker)
npm run build:cpanel; npm run test:paquete            # Paquete en Apache real: raíz, subcarpeta, HTTPS y FPM
```

Las pruebas de API y de paquete levantan su propio entorno de Docker en el puerto 8090, con su propia
base, y lo borran al terminar. No tocan tu base de desarrollo.

## Paquete para cPanel

```powershell
npm run build:cpanel
```

Genera `deploy/`, lista para subir.
