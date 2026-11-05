# Instalar UMAM en cPanel

Requisitos del hosting: PHP 8.1 o superior con las extensiones `pdo_mysql` y `mbstring`, MySQL 5.7+ o
MariaDB 10.2+, y SSL. El instalador avisa si falta alguna extensión.

## 1. Generar el paquete

En tu computadora:

```powershell
npm ci
npm run build:cpanel
```

Esto crea la carpeta `deploy/` con el frontend y la API. No incluye `config.php`.

## 2. Crear la base de datos

En cPanel, abre **Bases de datos MySQL** (o el Asistente de bases de datos):

1. Crea una base de datos.
2. Crea un usuario con una contraseña fuerte.
3. Agrega el usuario a la base con **todos los privilegios**.

cPanel antepone tu cuenta a los nombres, por ejemplo `micuenta_umam`. Anota los nombres completos.

## 3. Activar HTTPS

En **SSL/TLS Status**, confirma que el dominio tenga certificado (AutoSSL suele hacerlo solo).
Sin HTTPS no funcionan la cámara ni el inicio de sesión seguro.

## 4. Revisar la versión de PHP

En **MultiPHP Manager** (o **Select PHP Version**), elige PHP 8.1 o superior para el dominio, y confirma
que estén activas `pdo_mysql` y `mbstring`.

En **MultiPHP INI Editor**, deja `display_errors` en **Off**. La app lo apaga por su cuenta con
`api/.user.ini` y desde su código, pero PHP imprime algunos avisos antes de ejecutar la app. Con PHP
como módulo de Apache, `.user.ini` se ignora, y solo este ajuste los evita. El instalador avisa si
sigue activado.

## 5. Subir los archivos

Sube **todo el contenido** de `deploy/`, incluidos los archivos `.htaccess`, a la carpeta del sitio:

- Dominio principal: `public_html/`
- Subdominio: la carpeta raíz del subdominio
- Subcarpeta: por ejemplo `public_html/umam/`

La app funciona en cualquiera de las tres sin volver a compilar.

En el Administrador de archivos, activa **Mostrar archivos ocultos** para ver los `.htaccess`.

## 6. Crear config.php

1. Crea una carpeta privada para las sesiones **fuera** de `public_html`, por ejemplo
   `/home/micuenta/umam-sesiones`.
2. En `api/`, copia `config.example.php` como `config.php`.
3. Llena sus valores:

```php
return [
    'db_host' => 'localhost',
    'db_nombre' => 'micuenta_umam',
    'db_usuario' => 'micuenta_umamuser',
    'db_clave' => 'la-contraseña-de-la-base',
    'token_instalacion' => 'una-clave-larga-inventada-por-ti',
    'carpeta_sesiones' => '/home/micuenta/umam-sesiones',
    'archivo_errores' => '/home/micuenta/umam-errores.log',
    'forzar_https' => false,
    'confiar_proxy' => false,
];
```

Los errores de PHP se escriben en `archivo_errores`, nunca en el navegador. Si lo dejas vacío se usa
`api/errores.log`, que el `.htaccess` bloquea, pero es mejor tenerlo fuera de `public_html`.

Deja `forzar_https` y `confiar_proxy` en `false` por ahora. Ver "HTTPS" más abajo.

## 7. Correr el instalador

1. Abre `https://tu-dominio/api/instalar.php` (con la subcarpeta, si usas una).
2. Escribe el `token_instalacion`.
3. **Guarda las contraseñas que aparecen.** Se muestran una sola vez.

El instalador crea las tablas y dos usuarios: `admin` (administrador) y `paramedico` (usuario normal).
También muestra los límites del servidor. Si alguno aparece por debajo de 32 MB, lee la sección
"Límites" más abajo.

## 8. Borrar el instalador

Borra `api/instalar.php` del servidor. Esto es obligatorio.

## 9. Probar

1. Entra con `admin` y confirma que ves las pestañas Usuarios, Actividad y Eliminados.
2. Cambia las contraseñas iniciales desde **Usuarios**.
3. Con `paramedico`, captura un registro de prueba con una **foto** y una **firma**, y confirma que
   el estado diga "Guardado".
4. Desde **Historial**, exporta ese registro a PDF y Excel.
5. Elimínalo y restáuralo desde **Eliminados**.

## HTTPS

Los `.htaccess` redirigen HTTP a HTTPS usando `%{HTTPS}`, sin configurar nada. La carpeta
`.well-known` queda libre y sin redirección, porque AutoSSL la necesita para validar el dominio y
renovar el certificado. No la bloquees.

**Forzar HTTPS.** Con `'forzar_https' => true`, la cookie de sesión siempre lleva `Secure` y la API
envía el encabezado HSTS durante un año. Actívalo solo cuando el certificado ya funcione bien y se
renueve solo.

**Cuidado:** HSTS no se puede deshacer al momento. El navegador recuerda la regla un año. Si el
certificado vence o falla, el sitio queda inaccesible para quien ya entró, aunque apagues la opción.

**Detrás de un proxy.** Si un proxy termina el SSL (por ejemplo Cloudflare en modo Flexible), el
servidor recibe todo por HTTP y la redirección causa un bucle. Lo mejor es usar SSL completo entre el
proxy y el servidor, por ejemplo Cloudflare en modo Full (strict). Si no se puede:

1. Agrega esta línea justo después de `RewriteCond %{HTTPS} off`, en `.htaccess` y en `api/.htaccess`:
   `RewriteCond %{HTTP:X-Forwarded-Proto} !https`
2. Pon `'confiar_proxy' => true` en `config.php`.

Hazlo solo si todo el tráfico pasa por ese proxy: quien llegue directo al servidor podría falsificar
ese encabezado.

## Archivos protegidos

Los `.htaccess` responden 403 a `schema.sql`, `config.php`, `config.example.php`, `api/sesiones/`,
y a cualquier archivo `.sql`, `.md`, `.log` u oculto, salvo `.well-known`. Funciona igual en raíz y en
subcarpeta. Si agregas reglas, no uses `php_flag` ni `php_value`: con PHP-FPM dan error 500.

## Límites

Un registro con fotos viaja completo en cada autoguardado. Para que quepa hacen falta:

| Valor | Mínimo | Dónde se cambia |
|---|---|---|
| `post_max_size` | 32 MB | MultiPHP INI Editor |
| `memory_limit` | 128 MB | MultiPHP INI Editor |
| `max_allowed_packet` | 32 MB | Lo controla el hosting; pídelo a soporte si es bajo |
| `max_input_time` y `max_execution_time` | 120 s | MultiPHP INI Editor |

La API también rechaza un registro que ocupe más de un tercio de `memory_limit`, porque después no
se podría volver a abrir.

La app conoce estos límites y mide cada registro tal como viajaría, con las imágenes en base64. Avisa
al llegar al 95% del límite, sin enviarlo: muestra "El registro es demasiado grande" y no guarda esos
cambios. En ese caso hay que quitar imágenes o subir el límite. El servidor sigue validando por su cuenta.

## Problemas comunes

- **Error 500 en toda la API:** revisa los datos de `config.php` y `archivo_errores`.
- **Error 500 en toda la API o en el sitio:** si los datos de `config.php` están bien, puede faltar
  `mod_rewrite`, porque `RewriteEngine` no se reconoce. Pídelo a soporte.
- **Error 404 en `api/...`:** falta `api/.htaccess`. Revisa que se haya subido, con **Mostrar archivos
  ocultos** activo.
- **"Al servidor le falta la extensión de PHP":** actívala en **Select PHP Version**.
- **Error 415 en las peticiones:** la API solo acepta `application/json`. Si solo pasa detrás de un
  firewall, revisa que no esté cambiando las cabeceras.
- **El sitio entra en un bucle de redirecciones:** hay un proxy terminando el SSL. Ver "HTTPS".
- **Se cierra la sesión sola:** revisa que `carpeta_sesiones` exista y se pueda escribir.
- **"Error al guardar" con el firewall del hosting:** algunos ModSecurity bloquean JSON grande o con
  base64. Pide a soporte una excepción para la ruta `api/registros`.

## Actualizar a una versión nueva

Genera el paquete y sube los archivos encima, sin tocar `api/config.php` ni subir `api/instalar.php`.
Conviene borrar del servidor los `.js` y `.css` viejos, y respaldar antes la base con phpMyAdmin.

## Respaldos

Los datos de pacientes viven solo en esta base. Configura respaldos periódicos en
**Respaldo** de cPanel, y guárdalos en un lugar privado.
