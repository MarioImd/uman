# Migración de UMAM a PHP + MySQL: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el backend NestJS + PostgreSQL por PHP + MySQL publicable en cPanel, con historial paginado, login por usuario, administración, eliminación lógica y detección de ediciones simultáneas.

**Architecture:** PHP sin framework en `api/`, servido en el mismo origen que el Angular compilado. `registros.datos` guarda el JSON completo y las columnas ligeras sirven para listar y buscar. Sesión por cookie de PHP.

**Tech Stack:** PHP 8.1+, PDO MySQL, MariaDB/MySQL, Angular 20, Docker (solo desarrollo), `node --test` para probar la API.

**Spec:** `docs/2026-11-05-migracion-php-mysql-design.md`

## Global Constraints

- Rama `migracion-php-mysql`. Todo commit termina con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. No hacer push sin que se pida.
- PHP 8.1+ sin framework ni Composer. MySQL 5.7+ o MariaDB 10.2+. `utf8mb4` con `utf8mb4_unicode_ci`.
- Solo GET y POST. URLs relativas (`api/...`, sin barra inicial). `--base-href ./`.
- Código simple: pocas piezas, sin abstracciones que no se pidan. Comentarios y textos en español.
- Paginación 20 por defecto, máximo 100. Sesión de 12 horas sin actividad. 5 intentos fallidos bloquean 15 minutos. Contraseña mínimo 8 caracteres. Agrupación de actividad: 30 minutos.
- `config.php` y contraseñas nunca en git.
- Fechas en UTC: conexión con `time_zone = '+00:00'`, columnas `DATETIME(3)`, salida ISO 8601 con `Z`.

## Review Focus

1. Buscar `%` o `_`: se tratan como texto literal, no como comodines. Prueba en Task 3.
2. Buscar `perez` debe encontrar `Pérez`. Prueba en Task 3.
3. Registro que rebasa `post_max_size` o `max_allowed_packet`: responde 413 y no guarda un registro vacío. Prueba en Task 3.
4. Eliminar la última fila de la última página: el Historial pasa a la página anterior, no se queda en una vacía. Prueba en Task 7.
5. Escribir rápido en el buscador: una respuesta vieja no pisa a la más nueva. Prueba en Task 7.

---

### Task 1: Entorno local, esquema e instalador

**Files:**
- Create: `docker-compose.yml`, `docker/php/Dockerfile`, `api/config.example.php`, `api/db.php`, `api/schema.sql`, `api/instalar.php`, `api-tests/ayuda.mjs`, `api-tests/instalar.test.mjs`
- Modify: `.gitignore` (agregar `api/config.php`, `api/sesiones/`, `/deploy`)

**Interfaces:**
- Produces: `db(): PDO` (excepciones activadas, UTC, `utf8mb4`). `config.php` devuelve un arreglo con `db_host`, `db_nombre`, `db_usuario`, `db_clave`, `token_instalacion`, `carpeta_sesiones`.
- Produces: `api-tests/ayuda.mjs` con `peticion(ruta, {metodo, cuerpo, cookie})`, `entrar(usuario, clave)` que devuelve la cookie, y `limpiarBase()`.

- [ ] **Step 1:** `docker-compose.yml`: `php:8.1-apache` con `pdo_mysql` y `mod_rewrite`, sirviendo `api/` en `http://localhost:8080/api`, y `mariadb:10.6`.
- [ ] **Step 2:** `schema.sql` con las tablas del diseño, secciones 7 y 11. `intentos_login`: `usuario`, `fallos`, `bloqueado_hasta`. Índices del diseño.
- [ ] **Step 3: Prueba que falla** en `instalar.test.mjs`:
  - `sin token responde 403 y no crea tablas`
  - `con token crea tablas, usuarios admin y paramedico, y muestra sus claves una vez`
  - `segunda ejecución responde 409 y no cambia las claves`
- [ ] **Step 4:** Correr `docker compose up -d` y `node --test api-tests/`. Esperado: FAIL.
- [ ] **Step 5:** Implementar `instalar.php` (formulario POST con token). Crea `admin` (rol `admin`) y `paramedico` (rol `usuario`) con claves aleatorias de 16 caracteres, mostradas una sola vez. Muestra `post_max_size`, `memory_limit` y `max_allowed_packet`, y advierte si están por debajo de 32 MB.
- [ ] **Step 6:** Correr las pruebas. Esperado: PASS.
- [ ] **Step 7:** Commit `feat: esquema MySQL e instalador con dos usuarios iniciales`.

### Task 2: Enrutador y sesión

**Files:**
- Create: `api/index.php`, `api/.htaccess`, `api/http.php`, `api/sesion.php`, `api-tests/sesion.test.mjs`

**Interfaces:**
- Consumes: `db()`.
- Produces: `responder(int $estado, mixed $cuerpo): never`, `leerJson(): array`, `exigirSesion(): array` (usuario activo o 401), `exigirAdmin(): array` (403 si no lo es).
- Produces: rutas `POST api/sesion/login`, `POST api/sesion/logout`, `GET api/sesion`, que devuelven `{id, usuario, nombre, rol}`.

- [ ] **Step 1: Prueba que falla** en `sesion.test.mjs`:
  - `login correcto devuelve el usuario y una cookie HttpOnly con SameSite=Lax`
  - `login incorrecto responde 401 con el mismo mensaje para usuario inexistente y clave mala`
  - `el sexto intento responde 429 aunque la clave sea correcta`
  - `GET api/sesion sin cookie responde 401`
  - `usuario desactivado con sesión abierta recibe 401 en la siguiente petición`
  - `logout invalida la cookie`
  - `api/config.php y api/schema.sql no se pueden descargar`
  - `las respuestas llevan Cache-Control: no-store`
- [ ] **Step 2:** Correr. Esperado: FAIL.
- [ ] **Step 3:** Implementar. `session_save_path` a `carpeta_sesiones`, `gc_maxlifetime` de 43200, `session_regenerate_id(true)` al entrar. Errores internos al log; al cliente solo un 500 genérico. `Secure` se activa cuando la petición llega por HTTPS, para que Docker funcione en HTTP.
- [ ] **Step 4:** Correr. Esperado: PASS.
- [ ] **Step 5:** Commit `feat: enrutador PHP y sesiones`.

### Task 3: API de registros

**Files:**
- Create: `api/registros.php`, `api/actividad.php`, `api-tests/registros.test.mjs`

**Interfaces:**
- Consumes: `exigirSesion()`, `leerJson()`, `responder()`.
- Produces: `registrarActividad(int $usuarioId, string $accion, string $registroId, string $folio): void`.
- Produces: `GET api/registros` devuelve `{items: [{id, folio, ciudad, paciente, fechaCreacion}], total, pagina, porPagina}`. `GET api/registros/{id}` y `GET api/registros/ultimo` devuelven el registro completo más `version`. `POST api/registros/{id}` recibe el registro con `version` (0 si es nuevo) y devuelve `{version}`. El 409 lleva `{codigo: 'conflicto' | 'eliminado'}`.

- [ ] **Step 1: Prueba que falla** en `registros.test.mjs`:
  - `sin sesión todas las rutas responden 401`
  - `la lista pagina de 20 en 20, más reciente primero, con total real`
  - `porPagina=500 se limita a 100`
  - `la lista no contiene datos ni imágenes`
  - `busca por folio, ciudad y paciente fuera de la primera página`
  - `buscar perez encuentra Pérez`
  - `buscar % y _ no devuelve todo`
  - `crear con version 0 devuelve version 1`
  - `guardar con version vieja responde 409 conflicto y no cambia datos`
  - `guardar con id distinto al del cuerpo responde 400`
  - `ultimo devuelve el último del propio usuario, no el de otro`
  - `ultimo responde 404 si el usuario no tiene registros`
  - `eliminar lo oculta de lista y detalle (404)`
  - `guardar sobre uno eliminado responde 409 eliminado y no lo revive`
  - `cuerpo mayor a post_max_size responde 413 y no crea nada`
  - `dos guardados del mismo usuario en 30 minutos dejan una fila edito; a más de 30, dos`
  - `paciente de más de 255 caracteres se recorta en la columna y se conserva en datos`
- [ ] **Step 2:** Correr. Esperado: FAIL.
- [ ] **Step 3:** Implementar. El guardado es atómico: `UPDATE ... SET version = version + 1 WHERE id = ? AND version = ? AND eliminado = 0`. Si afecta 0 filas, se distingue eliminado de conflicto. Con `version` 0 hace `INSERT`, y una llave duplicada es `conflicto`. Escapar `\`, `%` y `_` en el `LIKE`. Detectar `CONTENT_LENGTH` mayor que `post_max_size` antes de leer el cuerpo; un error de paquete de MySQL también responde 413.
- [ ] **Step 4:** Correr. Esperado: PASS.
- [ ] **Step 5:** Commit `feat: API de registros con paginación y versiones`.

### Task 4: API de administración

**Files:**
- Create: `api/usuarios.php`, `api-tests/admin.test.mjs`
- Modify: `api/registros.php`, `api/actividad.php`, `api/index.php`

**Interfaces:**
- Consumes: `exigirAdmin()`, `registrarActividad()`.
- Produces: `GET api/usuarios` devuelve `[{id, usuario, nombre, rol, activo}]`. `POST api/usuarios` crea. `POST api/usuarios/{id}` edita `nombre`, `rol`, `activo` y `clave`. `GET api/actividad?pagina=&q=` devuelve `{items: [{usuario, accion, folio, inicio, fin}], total, pagina, porPagina}`. `GET api/registros/eliminados` usa la forma de lista más `eliminadoPor` y `eliminadoEn`. `POST api/registros/{id}/restaurar`.

- [ ] **Step 1: Prueba que falla** en `admin.test.mjs`:
  - `un usuario normal recibe 403 en usuarios, actividad, eliminados y restaurar`
  - `crear usuario con clave de 7 caracteres responde 400`
  - `usuario repetido responde 409`
  - `ninguna respuesta contiene password_hash`
  - `no se puede desactivar ni degradar al último admin activo`
  - `restaurar devuelve el registro a la lista y registra la acción`
  - `actividad filtra por usuario y folio`
- [ ] **Step 2:** Correr. Esperado: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Correr. Esperado: PASS.
- [ ] **Step 5:** Commit `feat: API de usuarios, actividad y eliminados`.

### Task 5: Servicios Angular

**Files:**
- Create: `proxy.conf.json`, `src/app/core/services/sesion.service.ts`, `src/app/core/services/sesion.interceptor.ts` y sus `.spec.ts`
- Modify: `registro.service.ts`, `registro-api.service.ts`, `registro.model.ts`, `app.config.ts`, `angular.json` (proxy en `serve`), `registro-api.service.spec.ts`
- Delete: `registro-local-storage.service.ts` y su spec

**Interfaces:**
- Produces en `registro.model.ts`: `version?: number`; `RegistroResumen {id, folio, ciudad, paciente, fechaCreacion}`; `Pagina<T> {items: T[]; total: number; pagina: number; porPagina: number}`.
- Produces en `RegistroService`: `guardar(registro): Promise<{version: number}>`, `obtener(id)`, `ultimo(): Promise<Registro | undefined>`, `listar(pagina: number, q: string): Promise<Pagina<RegistroResumen>>`, `eliminar(id)`.
- Produces en `SesionService`: signal `usuario`, signal `sesionVencida`, `cargar()`, `entrar(usuario, clave)`, `salir()`.

- [ ] **Step 0:** `npm ci`.
- [ ] **Step 1: Prueba que falla:** `listar llama api/registros con pagina y q`; `eliminar hace POST a api/registros/{id}/eliminar`; `ultimo devuelve undefined con 404`; `el interceptor activa sesionVencida con un 401, salvo en api/sesion`.
- [ ] **Step 2:** `npx ng test --watch=false --browsers=ChromeHeadless`. Esperado: FAIL.
- [ ] **Step 3:** Implementar. `API_REGISTROS_URL = 'api/registros'`. El proxy manda `/api` a `http://localhost:8080`.
- [ ] **Step 4:** Correr. Pasan las pruebas de esta tarea; los componentes se corrigen en las Tasks 7 y 8.
- [ ] **Step 5:** Commit `feat: servicios Angular para la API PHP`.

### Task 6: Login, logo y sesión vencida

**Files:**
- Create: `src/app/shared/logo-umam/logo-umam.component.ts`, `src/app/features/login/login.component.ts` y sus specs
- Modify: `src/app/app.ts`, `src/app/app.html`, `src/app/app.scss`, `src/app/app.spec.ts`

**Interfaces:**
- Consumes: `SesionService`.
- Produces: `<app-logo-umam>` con el SVG que hoy está en `app.html`. `<app-login [usuarioFijo]="string | undefined">`. `App.vista` admite `'usuarios' | 'actividad' | 'eliminados'`.

- [ ] **Step 1: Prueba que falla:** `sin sesión se ve el login con el logo`; `credenciales malas muestran error sin borrar el usuario`; `con sesión se ven las vistas y el nombre`; `un usuario normal no ve pestañas de administrador`; `con sesión vencida el login se muestra encima y el formulario sigue en el DOM`; `el login encima fija el usuario actual`; `salir vuelve al login y borra registroACargar`.
- [ ] **Step 2:** Correr. Esperado: FAIL.
- [ ] **Step 3:** Implementar. El login encima solo permite al mismo usuario, para que lo capturado no quede guardado a nombre de otro. Usar el tema UMAM existente.
- [ ] **Step 4:** Correr. Esperado: PASS.
- [ ] **Step 5:** Commit `feat: pantalla de login con logo y sesión vencida`.

### Task 7: Historial paginado

**Files:**
- Modify: `src/app/features/historial/historial.component.ts` y su spec, `src/app/app.ts`

**Interfaces:**
- Consumes: `listar(pagina, q)`, `obtener(id)`.
- Produces: `@Output() abrir` emite `RegistroAtencionPrehospitalaria` completo, ya descargado.

- [ ] **Step 1: Prueba que falla:** `carga la página 1 y muestra el total real`; `cambiar de página pide esa página`; `buscar espera 300 ms y vuelve a la página 1`; `una respuesta vieja no reemplaza a la nueva`; `eliminar la última fila de la última página carga la anterior`; `Abrir, PDF y Excel piden el registro completo`; `si falla obtener muestra error y no emite abrir`.
- [ ] **Step 2:** Correr. Esperado: FAIL.
- [ ] **Step 3:** Implementar con `MatPaginator`. Descartar respuestas viejas con un contador de petición. Quitar `registrosFiltrados()`, el orden en el navegador y `nombrePaciente()`.
- [ ] **Step 4:** Correr. Esperado: PASS.
- [ ] **Step 5:** Commit `feat: historial paginado con búsqueda en servidor`.

### Task 8: Formulario

**Files:**
- Modify: `src/app/features/formulario/formulario.component.ts` y su spec, `src/app/app.ts`

**Interfaces:**
- Consumes: `ultimo()`, `obtener(id)`, `guardar()` devolviendo `{version}`, `SesionService.sesionVencida`.

- [ ] **Step 1: Prueba que falla:** `al iniciar llama ultimo y nunca listar`; `sin registros propios queda en blanco y con autosave`; `dos guardados seguidos usan la version devuelta por el anterior`; `un guardado encolado del registro anterior usa la version de ese registro`; `con 409 conflicto deja de autoguardar, avisa y conserva el formulario`; `Recargar trae la versión del servidor`; `con 409 eliminado avisa y deja de autoguardar`; `con 401 conserva lo pendiente y lo reenvía al volver la sesión`; `con 413 muestra que el registro es demasiado grande`; `si falla obtener al abrir, no se autoguarda sobre ese registro`.
- [ ] **Step 2:** Correr. Esperado: FAIL.
- [ ] **Step 3:** Implementar. La versión vive en un objeto `{version}` que se crea por cada registro cargado. `guardar()` captura ese objeto y lo lee al enviar, no al encolar. Quitar el respaldo a la copia del Historial.
- [ ] **Step 4:** Correr. Esperado: PASS.
- [ ] **Step 5:** Commit `feat: formulario con último propio y control de versiones`.

### Task 9: Pantallas de administración

**Files:**
- Create: `src/app/core/services/admin.service.ts`, `src/app/features/admin/usuarios.component.ts`, `actividad.component.ts`, `eliminados.component.ts` y sus specs
- Modify: `src/app/app.html`, `src/app/app.ts`

**Interfaces:**
- Consumes: rutas de la Task 4.
- Produces: `AdminService` con `usuarios()`, `crearUsuario(datos)`, `editarUsuario(id, datos)`, `actividad(pagina, q)`, `eliminados(pagina)`, `restaurar(id)`.

- [ ] **Step 1: Prueba que falla:** `crea usuario y lo muestra en la lista`; `muestra el error de usuario repetido`; `desactivar y cambiar clave llaman a editarUsuario`; `actividad muestra quién, acción, folio, inicio y fin, y pagina`; `restaurar quita la fila de eliminados`.
- [ ] **Step 2:** Correr. Esperado: FAIL.
- [ ] **Step 3:** Implementar con el tema UMAM y `MatPaginator`.
- [ ] **Step 4:** Correr. Esperado: PASS.
- [ ] **Step 5:** Commit `feat: pantallas de usuarios, actividad y eliminados`.

### Task 10: Empaquetado, limpieza y documentación

**Files:**
- Create: `public/.htaccess`, `scripts/empaquetar.mjs`, `docs/instalacion-cpanel.md`
- Modify: `excel-exportador.service.ts` y su spec, `package.json` (`"build:cpanel"`), `README.md`, `api/.htaccess`
- Delete: `backend/`

- [ ] **Step 1: Prueba que falla:** `exportar carga exceljs solo al llamarse`. Esperado: FAIL.
- [ ] **Step 2:** Implementar con `await import('exceljs')`. La prueba pasa y la salida de `ng build` muestra `exceljs` en un chunk diferido.
- [ ] **Step 3:** `public/.htaccess`: forzar HTTPS, compresión, caché larga para archivos con hash y `no-cache` para `index.html`.
- [ ] **Step 4:** `npm run build:cpanel` corre `ng build --base-href ./` y arma `deploy/` con el frontend y `api/`, sin `config.php`. Esperado: `deploy/index.html` y `deploy/api/index.php` existen.
- [ ] **Step 5:** Probar `deploy/` en Docker en raíz y en subcarpeta: login, captura con fotos, historial, PDF y Excel en el navegador.
- [ ] **Step 6:** Prueba de carga: sembrar 5,000 registros con imágenes y medir en DevTools que abrir Historial y Formulario no descargue imágenes ni listas completas.
- [ ] **Step 7:** Escribir `docs/instalacion-cpanel.md` según la sección 12 del diseño, y actualizar `README.md`.
- [ ] **Step 8:** Borrar `backend/`. Correr `node --test api-tests/`, `npx ng test --watch=false --browsers=ChromeHeadless` y `npx ng build`. Esperado: todo PASS.
- [ ] **Step 9:** Commit `chore: empaquetado para cPanel y retiro del backend NestJS`.
