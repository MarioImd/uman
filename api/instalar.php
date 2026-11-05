<?php
// Instalador: crea las tablas y los dos usuarios iniciales. Se corre una sola
// vez desde el navegador y después hay que borrar este archivo del servidor.
require __DIR__ . '/db.php';

const MINIMO_BYTES = 32 * 1024 * 1024;

function pagina(int $estado, string $contenido): never
{
    http_response_code($estado);
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-store');
    echo "<!doctype html><html lang=\"es\"><meta charset=\"utf-8\"><title>Instalar UMAM</title>"
        . "<body style=\"font-family:sans-serif;max-width:640px;margin:40px auto;padding:0 16px\">"
        . "<h1>Instalar UMAM</h1>$contenido</body></html>";
    exit;
}

/** Límites del servidor que determinan el tamaño máximo de un registro. */
function resumenLimites(): string
{
    $limites = [
        'post_max_size' => bytesDeIni(ini_get('post_max_size')),
        'memory_limit' => bytesDeIni(ini_get('memory_limit')),
        'max_allowed_packet' => (int) db()->query('SELECT @@max_allowed_packet')->fetchColumn(),
    ];
    $filas = '';
    foreach ($limites as $nombre => $bytes) {
        $sinLimite = $bytes < 0;
        $texto = $sinLimite ? 'sin límite' : round($bytes / 1024 / 1024) . ' MB';
        $aviso = !$sinLimite && $bytes < MINIMO_BYTES ? ' <strong>por debajo de 32 MB</strong>' : '';
        $filas .= "<li>$nombre: $texto$aviso</li>";
    }
    return "<h2>Límites del servidor</h2><ul>$filas</ul>";
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    pagina(200, '<form method="post"><label>Token de instalación <input type="password" name="token" required></label> <button>Instalar</button></form>');
}

$token = (string) (config()['token_instalacion'] ?? '');
if ($token === '' || !hash_equals($token, (string) ($_POST['token'] ?? ''))) {
    pagina(403, '<p>Token incorrecto.</p>');
}

$pdo = db();
$hayTabla = $pdo->query("SHOW TABLES LIKE 'usuarios'")->fetchColumn() !== false;
if ($hayTabla && $pdo->query("SELECT COUNT(*) FROM usuarios WHERE rol = 'admin'")->fetchColumn() > 0) {
    pagina(409, '<p>UMAM ya está instalado. Borra este archivo del servidor.</p>');
}

foreach (array_filter(array_map('trim', explode(';', file_get_contents(__DIR__ . '/schema.sql')))) as $sentencia) {
    $pdo->exec($sentencia);
}

$claves = [];
$crear = $pdo->prepare('INSERT INTO usuarios (usuario, nombre, password_hash, rol, creado_en) VALUES (?, ?, ?, ?, UTC_TIMESTAMP(3))');
foreach ([['admin', 'Administrador', 'admin'], ['paramedico', 'Paramédico', 'usuario']] as [$usuario, $nombre, $rol]) {
    $claves[$usuario] = bin2hex(random_bytes(8));
    $crear->execute([$usuario, $nombre, password_hash($claves[$usuario], PASSWORD_DEFAULT), $rol]);
}

pagina(200, '<p>Instalación completa. <strong>Guarda estas claves ahora: no se vuelven a mostrar.</strong></p>'
    . "<ul><li>admin: <code id=\"clave-admin\">{$claves['admin']}</code></li>"
    . "<li>paramedico: <code id=\"clave-paramedico\">{$claves['paramedico']}</code></li></ul>"
    . resumenLimites()
    . '<p><strong>Ahora borra instalar.php del servidor.</strong></p>');
