<?php
// Punto de entrada de la API: el .htaccess manda aquí todas las peticiones.
ini_set('display_errors', '0');

require __DIR__ . '/db.php';
require __DIR__ . '/http.php';
require __DIR__ . '/sesion.php';

try {
    $base = dirname($_SERVER['SCRIPT_NAME']);
    $ruta = substr(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), strlen($base));
    $partes = explode('/', trim($ruta, '/'));
    $metodo = $_SERVER['REQUEST_METHOD'];

    match ($partes[0]) {
        'sesion' => rutasSesion($metodo, $partes),
        default => responder(404, ['error' => 'Ruta no encontrada.']),
    };
} catch (Throwable $error) {
    error_log((string) $error);
    responder(500, ['error' => 'Error interno del servidor.']);
}
