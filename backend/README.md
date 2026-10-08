# Backend UMAM (NestJS + PostgreSQL)

API REST que persiste los "Registros de Atención Prehospitalaria" del
frontend Angular. Cada sección del formulario se guarda como una columna
JSONB (los campos se definen en `src/app/core/data/secciones.data.ts` del
frontend), así que agregar campos al formulario no requiere migraciones.

## Uso

```powershell
cd backend
npm install
copy .env.example .env
docker compose up -d      # Postgres 17 en localhost:5432 (usuario/clave/bd: umam)
npm run start:dev         # API en http://localhost:3000/api
```

Con `DB_SYNCHRONIZE=true` (valor por defecto) TypeORM crea la tabla
`registros` al arrancar. En producción ponlo en `false` y usa migraciones.

## Endpoints

| Método | Ruta                  | Descripción                                    |
|--------|-----------------------|------------------------------------------------|
| GET    | `/api/registros`      | Lista todos (más antiguo → más reciente)       |
| GET    | `/api/registros/:id`  | Obtiene uno (404 si no existe)                 |
| PUT    | `/api/registros/:id`  | Crea o actualiza (el id lo genera el frontend) |
| DELETE | `/api/registros/:id`  | Elimina (204)                                  |

Las firmas e imágenes viajan como data URLs dentro del JSON; el límite del
body se ajusta con `BODY_LIMIT` (por defecto `50mb`).

## Pruebas

```powershell
npm run test:e2e   # requiere Postgres corriendo
```
