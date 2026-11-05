<?php
// Utilidades de petición y respuesta.

function responder(int $estado, mixed $cuerpo): never
{
    http_response_code($estado);
    header('Content-Type: application/json; charset=utf-8');
    // Son datos de pacientes: ni el navegador ni un proxy deben guardarlos.
    header('Cache-Control: no-store');
    echo json_encode($cuerpo, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Defensa contra CSRF: un formulario de otro sitio no puede enviar
 * application/json sin que el navegador pida permiso antes.
 */
function exigirJson(string $metodo): void
{
    if (!in_array($metodo, ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
        return;
    }
    $tipo = strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0]));
    if ($tipo !== 'application/json') {
        responder(415, ['error' => 'El cuerpo debe enviarse como application/json.']);
    }
}

function leerJson(): array
{
    $datos = json_decode(file_get_contents('php://input'), true);
    if (!is_array($datos)) {
        responder(400, ['error' => 'El cuerpo debe ser JSON válido.']);
    }
    return $datos;
}
