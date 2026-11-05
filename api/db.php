<?php
// Configuración y conexión a MySQL.

function config(): array
{
    static $config = null;
    return $config ??= require(getenv('UMAM_CONFIG') ?: __DIR__ . '/config.php');
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $c = config();
        $pdo = new PDO("mysql:host={$c['db_host']};dbname={$c['db_nombre']};charset=utf8mb4", $c['db_usuario'], $c['db_clave'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
        // Todas las fechas se guardan y se leen en UTC.
        $pdo->exec("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci, time_zone = '+00:00'");
    }
    return $pdo;
}

/** Convierte un valor de php.ini como "16M" a bytes. */
function bytesDeIni(string $valor): int
{
    $numero = (int) $valor;
    return match (strtoupper(substr(trim($valor), -1))) {
        'G' => $numero * 1024 ** 3,
        'M' => $numero * 1024 ** 2,
        'K' => $numero * 1024,
        default => $numero,
    };
}
