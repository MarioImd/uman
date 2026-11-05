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

function leerJson(): array
{
    $datos = json_decode(file_get_contents('php://input'), true);
    if (!is_array($datos)) {
        responder(400, ['error' => 'El cuerpo debe ser JSON válido.']);
    }
    return $datos;
}
