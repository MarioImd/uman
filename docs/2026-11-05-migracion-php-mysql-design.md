# Migración de UMAM a PHP + MySQL para cPanel

Fecha: 2026-11-05. Estado: aprobado.

Etiquetas: **[Mario]** lo decidió Mario. **[Claude]** es decisión técnica propuesta, se puede rechazar.

## 1. Intención

UMAM es un formulario de atención prehospitalaria (Angular 20) con backend NestJS + PostgreSQL que
hoy solo corre en local. Se quiere publicar en cPanel, con varios usuarios, y que siga rápido cuando
haya muchos registros.

Hoy la app descarga todos los registros completos, con firmas y fotos, en dos momentos: al abrir el
Historial y al abrir el Formulario (solo para recuperar el último borrador). Con muchos registros
eso la vuelve inutilizable, sobre todo en celular y con mala señal.

## 2. Objetivos

1. Backend en PHP y base MySQL, publicable en cPanel subiendo archivos. **[Mario]**
2. Historial paginado y con búsqueda en el servidor, sin descargar imágenes. **[Mario]**
3. Login con cuenta por persona. **[Mario]**
4. Pantalla de usuarios, solo para el administrador. **[Mario]**
5. Cualquier usuario puede editar cualquier registro. **[Mario]**
6. Cualquier usuario puede eliminar, pero solo se marca con una bandera. **[Mario]**
7. El administrador ve una tabla de quién modificó qué. **[Mario]**

## 3. Fuera de alcance

- Sacar las imágenes del JSON del registro. El autoguardado sigue enviando el registro completo.
  Se puede hacer en una etapa posterior. **[Claude]**
- Historial campo por campo de qué cambió. La actividad dice quién y cuándo, no qué campo. **[Claude]**
- Registrar quién consultó o exportó un registro, y registrar inicios de sesión. **[Claude]**
- Borrado definitivo de registros. **[Claude]**
- Modo sin conexión. **[Claude]**
- Migrar datos: PostgreSQL está vacío, se arranca con la base vacía. **[Mario]**

## 4. Lo que sería un fracaso aunque "funcione"

- Perder lo capturado: por sesión vencida, por un error de red o por sobrescribir un registro con
  datos vacíos.
- Que datos de pacientes sean accesibles sin sesión válida.
- Que un usuario termine editando por accidente el paciente de otro.

## 5. Restricciones

- Hosting compartido con cPanel: sin procesos permanentes, sin consola garantizada, límites de PHP y
  MySQL que quizá no se puedan cambiar.
- Requisitos del hosting: PHP 8.1+ con PDO MySQL, MySQL 5.7+ o MariaDB 10.2+, HTTPS. **[Claude]**
- La cámara del celular exige HTTPS, y las cookies de sesión también.
- Mario prefiere código simple con pocas piezas: PHP sin framework ni Composer. **[Claude]**
- La dirección final aún no está definida, así que nada puede depender de ella: subdominio, dominio
  principal y subcarpeta deben funcionar sin recompilar. **[Claude]**

## 6. Arquitectura

```
public_html/(o subcarpeta)
├── index.html, *.js, *.css     Angular compilado (ng build --base-href ./)
├── .htaccess                   HTTPS, compresión, caché
└── api/
    ├── index.php               Enrutador: todas las peticiones a api/ entran aquí
    ├── .htaccess               Reescritura a index.php y bloqueo de archivos internos
    ├── config.php              Credenciales; fuera de git (hay config.example.php)
    ├── instalar.php            Crea tablas y primer administrador
    └── ...                     Pocos archivos por tema: registros, usuarios, actividad, sesión
```

- Frontend y API en el mismo origen: sin CORS. **[Claude]**
- La URL de la API es relativa (`api/...`, sin barra inicial) y `base href` es `./`, así funciona en
  cualquier ruta. **[Claude]**
- La app no usa router (cambia de vista con la propiedad `vista` de `App`), por lo que no hace falta
  reescritura de rutas para Angular. Se sigue igual, agregando vistas. **[Claude]**
- Escrituras solo por GET y POST: algunos hostings bloquean PUT y DELETE con su firewall. **[Claude]**
- Un script de npm genera una carpeta lista para subir (frontend + `api/`). **[Claude]**
- Al quedar funcionando se elimina `backend/` (queda en el historial de git). **[Claude]**
- Desarrollo local: PHP y MySQL en Docker (la máquina no tiene PHP instalado) y `ng serve` con proxy
  a `api/`. **[Claude]**

## 7. Base de datos

Conjunto de caracteres `utf8mb4`.

**`registros`**
`id` CHAR(36) PK (lo genera el frontend), `fecha_creacion`, `fecha_actualizacion`, `folio`, `estado`,
`ciudad`, `paciente` (copia de `datosPaciente.nombreOMediaFiliacion`), `datos` LONGTEXT (JSON completo
del registro), `version` entero, `eliminado` booleano, `eliminado_por`, `eliminado_en`, `creado_por`, `actualizado_por`.

- Un solo campo `datos` en vez de 18 columnas JSON: el formulario cambia seguido y no hace falta
  consultar dentro del JSON. Los campos de búsqueda se copian a columnas al guardar. **[Claude]**
- LONGTEXT y no JSON: evita diferencias entre MySQL y MariaDB. **[Claude]**
- El listado nunca selecciona `datos`.
- Índices: (`eliminado`, `fecha_creacion`), (`actualizado_por`, `fecha_actualizacion`), `folio`.

**`usuarios`**
`id`, `usuario` (único), `nombre`, `password_hash`, `rol` (`admin` o `usuario`), `activo`, `creado_en`.

**`actividad`**
`id`, `usuario_id`, `accion` (`creo`, `edito`, `elimino`, `restauro`), `registro_id`, `folio` (copia),
`inicio`, `fin`.

- Agrupación: un guardado de la misma persona sobre el mismo registro, a menos de 30 minutos del
  `fin` de su última fila `edito`, solo actualiza `fin`. Si no, crea fila nueva. **[Claude]**

**`intentos_login`**: para limitar intentos fallidos.

## 8. API

Todo requiere sesión válida salvo login. Respuestas JSON con `Cache-Control: no-store`.

| Método | Ruta | Quién | Qué hace |
|---|---|---|---|
| POST | `api/sesion/login` | público | Inicia sesión |
| POST | `api/sesion/logout` | usuario | Cierra sesión |
| GET | `api/sesion` | usuario | Usuario actual y rol (401 si no hay sesión) |
| GET | `api/registros?pagina=&porPagina=&q=` | usuario | Página ligera, sin `datos` |
| GET | `api/registros/ultimo` | usuario | Último registro propio, completo |
| GET | `api/registros/{id}` | usuario | Un registro completo |
| POST | `api/registros/{id}` | usuario | Crea o actualiza |
| POST | `api/registros/{id}/eliminar` | usuario | Marca como eliminado |
| GET | `api/registros/eliminados?pagina=` | admin | Lista eliminados |
| POST | `api/registros/{id}/restaurar` | admin | Restaura |
| GET, POST | `api/usuarios`, `api/usuarios/{id}` | admin | Lista, crea, edita, desactiva, cambia clave |
| GET | `api/actividad?pagina=&q=` | admin | Tabla de actividad |

- Paginación: `{ items, total, pagina, porPagina }`, 20 por defecto, máximo 100, más reciente primero.
- Búsqueda: contiene el texto en folio, paciente o ciudad, igual que hoy. `LIKE '%texto%'` no aprovecha
  un índice, pero recorre solo columnas ligeras. Suficiente para decenas de miles de registros. **[Claude]**
- Registro eliminado: 404 para lecturas. Guardar sobre uno eliminado responde 409 y no lo revive.
- Cuerpo que rebasa los límites del servidor: 413, con mensaje claro en pantalla.

## 9. Seguridad

- `password_hash` / `password_verify`, mínimo 8 caracteres. **[Claude]**
- Cookie de sesión `HttpOnly`, `Secure`, `SameSite=Lax`; `session_regenerate_id` al entrar. **[Claude]**
- Sesión de 12 horas sin actividad (cubre una guardia), con carpeta de sesiones propia para no
  depender del `/tmp` compartido. **[Claude]**
- En cada petición se revisa que el usuario siga activo: desactivar una cuenta surte efecto al
  momento. **[Claude]**
- 5 intentos fallidos bloquean 15 minutos por usuario. **[Claude]**
- Consultas preparadas con PDO en todo. Errores internos al log, nunca al cliente.
- `.htaccess` fuerza HTTPS y bloquea el acceso directo a archivos internos de `api/`.
- `instalar.php` exige un token definido en `config.php` y se niega a correr si ya existe un
  administrador. Se indica borrarlo después. **[Claude]**
- No se puede desactivar ni degradar al último administrador activo. **[Claude]**
- La instalación crea dos usuarios: un administrador y uno normal. **[Mario]** Se llaman `admin` y
  `paramedico`, con claves aleatorias mostradas una sola vez; nunca van en git. **[Claude]**

## 10. Frontend

**Login.** Pantalla de usuario y contraseña, con el logo de UMAM que ya usa la app. **[Mario]** Al cargar, `GET api/sesion` decide si se muestra.
Sin registro público de cuentas.

**Sesión vencida durante la captura.** Un interceptor detecta el 401 y muestra el login encima del
formulario, sin destruirlo. Al volver a entrar, se reenvía lo pendiente. No se pierde lo capturado.

**Historial.** Paginador, buscador con espera de 300 ms contra el servidor y total real de registros.
Filas con solo los campos ligeros. Abrir, PDF y Excel piden el registro completo en ese momento, con
indicador de carga.

**Riesgo a cuidar.** Hoy, si falla `obtener()`, el formulario usa la copia que trajo el Historial. Esa
copia ya será un resumen sin datos: usarla dejaría al autoguardado sobrescribir el registro con vacío.
Si falla, se muestra error y no se abre el formulario.

**Formulario.** Usa `GET api/registros/ultimo` en lugar de `listar()`. Devuelve el último registro
**del propio usuario**, no el último de todos, para que nadie caiga en el paciente de otro. **[Claude]**
Si responde 409 por registro eliminado, avisa y deja de autoguardar sobre él.

**Administración.** Con rol admin aparecen las pestañas: Usuarios (crear, editar, desactivar, cambiar
clave), Actividad (tabla paginada con búsqueda) y Eliminados (lista paginada con Restaurar). **[Claude]**
El encabezado muestra el usuario y un botón de salir.

**Otras optimizaciones.** **[Claude]**
- `exceljs` se carga solo al exportar, para aligerar la carga inicial.
- `.htaccess`: compresión; caché larga para archivos con hash y sin caché para `index.html`.

**Limpieza.** `RegistroService` cambia de forma. Se elimina `LocalStorageRegistroService`, porque con
login ya no aplica. Se actualizan las pruebas que usan `listar()` o `API_REGISTROS_URL`. **[Claude]**

## 11. Ediciones simultáneas

Como cualquiera puede editar, dos personas pueden tener abierto el mismo registro, y cada guardado
envía el registro completo. Se detecta el choque en lugar de dejar que gane el último guardado. **[Mario]**

- `registros` lleva una columna `version` entera, que sube en cada guardado.
- Cada guardado envía la `version` con la que se cargó el registro. Si no coincide con la del servidor,
  responde 409 y no sobrescribe.
- La respuesta de un guardado exitoso trae la `version` nueva, y la cola de guardados del formulario
  debe usarla en el siguiente envío. Si no, la misma persona chocaría consigo misma.
- Al recibir el 409, el formulario deja de autoguardar, avisa que otra persona modificó el registro y
  ofrece recargarlo. Lo capturado sigue en pantalla hasta que la persona decida.

## 12. Instalación en cPanel

La documentación debe cubrir: crear base y usuario MySQL, activar SSL, subir la carpeta, llenar
`config.php`, correr `instalar.php`, borrarlo y probar. También cómo revisar `post_max_size`,
`memory_limit` y `max_allowed_packet`; `instalar.php` debe mostrar esos valores y advertir si son
bajos. Se apunta a 32 MB como mínimo por registro. **[Claude]**

## 13. Criterios de aceptación

- Abrir el Historial con miles de registros descarga una sola página, sin imágenes.
- Abrir el Formulario no descarga ninguna lista.
- La búsqueda encuentra registros que no están en la página visible.
- Ninguna ruta de datos responde sin sesión; las de administrador responden 403 a un usuario normal.
- Una cuenta desactivada pierde el acceso de inmediato.
- Eliminar oculta el registro para todos, el administrador lo ve y puede restaurarlo.
- La sesión vencida a media captura no pierde datos.
- Dos personas editando el mismo registro: la segunda recibe aviso y no se sobrescribe nada.
- Un registro con varias fotos se guarda y se exporta a PDF y Excel igual que hoy.
- La misma carpeta funciona en raíz de dominio y en subcarpeta.
- Pasan las pruebas de Angular y las pruebas de la API contra MySQL real.

## 14. Queda a criterio de quien lo construya

Organización interna de los archivos PHP, forma de probar la API, diseño visual de las pantallas
nuevas (siguiendo el tema UMAM existente) y nombre del script de empaquetado.
