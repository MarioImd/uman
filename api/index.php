<?php
// Punto de entrada de la API: el .htaccess manda aquí todas las peticiones.
ini_set('display_errors', '0'); // Antes de cargar nada: prepararEntorno() podría fallar.

require __DIR__ . '/db.php';
require __DIR__ . '/http.php';
require __DIR__ . '/sesion.php';
require __DIR__ . '/actividad.php';
require __DIR__ . '/registros.php';
require __DIR__ . '/usuarios.php';

try {
    prepararEntorno();

    $faltan = extensionesFaltantes();
    if ($faltan !== []) {
        responder(500, ['error' => 'Al servidor le falta la extensión de PHP: ' . implode(', ', $faltan) . '. Actívala en Select PHP Version.']);
    }

    if ((config()['forzar_https'] ?? false) && esHttps()) {
        header('Strict-Transport-Security: max-age=31536000');
    }

    $base = dirname($_SERVER['SCRIPT_NAME']);
    $ruta = substr(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), strlen($base));
    $partes = explode('/', trim($ruta, '/'));
    $metodo = $_SERVER['REQUEST_METHOD'];
    exigirJson($metodo);

    match ($partes[0]) {
        'sesion' => rutasSesion($metodo, $partes),
        'registros' => rutasRegistros($metodo, $partes),
        'usuarios' => rutasUsuarios($metodo, $partes),
        'actividad' => $metodo === 'GET' ? listarActividad() : responder(404, ['error' => 'Ruta no encontrada.']),
        default => responder(404, ['error' => 'Ruta no encontrada.']),
    };
} catch (Throwable $error) {
    error_log((string) $error);
    responder(500, ['error' => 'Error interno del servidor.']);
}
