# Instalar UMAM en cPanel

Requisitos del hosting: PHP 8.1 o superior con PDO MySQL, MySQL 5.7+ o MariaDB 10.2+, y SSL.

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

En **MultiPHP Manager** (o **Select PHP Version**), elige PHP 8.1 o superior para el dominio.

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
];
```

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

## Límites

Un registro con fotos viaja completo en cada autoguardado. Para que quepa hacen falta:

| Valor | Mínimo | Dónde se cambia |
|---|---|---|
| `post_max_size` | 32 MB | MultiPHP INI Editor |
| `memory_limit` | 128 MB | MultiPHP INI Editor |
| `max_allowed_packet` | 32 MB | Lo controla el hosting; pídelo a soporte si es bajo |

Si un registro rebasa el límite, la app muestra "El registro es demasiado grande" y no guarda esos
cambios. En ese caso hay que quitar imágenes o subir el límite.

## Problemas comunes

- **Error 500 en toda la API:** revisa los datos de `config.php` y el registro de errores de cPanel.
- **Error 404 en `api/...`:** falta `api/.htaccess`, o el hosting no permite `mod_rewrite`.
- **Se cierra la sesión sola:** revisa que `carpeta_sesiones` exista y se pueda escribir.
- **"Error al guardar" con el firewall del hosting:** algunos ModSecurity bloquean JSON grande o con
  base64. Pide a soporte una excepción para la ruta `api/registros`.

## Actualizar a una versión nueva

Genera el paquete y sube los archivos encima, sin tocar `api/config.php` ni subir `api/instalar.php`.
Conviene borrar del servidor los `.js` y `.css` viejos, y respaldar antes la base con phpMyAdmin.

## Respaldos

Los datos de pacientes viven solo en esta base. Configura respaldos periódicos en
**Respaldo** de cPanel, y guárdalos en un lugar privado.
