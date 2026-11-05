<?php
// Login y sesión por cookie.

const DURACION_SESION = 12 * 60 * 60;
const MAXIMO_FALLOS = 5;
const MINUTOS_BLOQUEO = 15;

function iniciarSesion(): void
{
    $carpeta = config()['carpeta_sesiones'];
    if (!is_dir($carpeta)) {
        mkdir($carpeta, 0700, true);
    }
    session_save_path($carpeta);
    ini_set('session.gc_maxlifetime', (string) DURACION_SESION);
    ini_set('session.use_strict_mode', '1');
    session_name('UMAMSESION');
    session_set_cookie_params([
        'path' => dirname($_SERVER['SCRIPT_NAME']),
        'httponly' => true,
        'secure' => ($_SERVER['HTTPS'] ?? '') === 'on' || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https',
        'samesite' => 'Lax',
    ]);
    session_start();
}

function destruirSesion(): void
{
    $_SESSION = [];
    session_destroy();
}

/** Devuelve el usuario de la sesión, o responde 401. */
function exigirSesion(): array
{
    iniciarSesion();
    $id = $_SESSION['usuario_id'] ?? null;
    $vencida = time() - ($_SESSION['ultima_actividad'] ?? 0) > DURACION_SESION;
    $usuario = false;
    if ($id !== null && !$vencida) {
        $consulta = db()->prepare('SELECT id, usuario, nombre, rol FROM usuarios WHERE id = ? AND activo = 1');
        $consulta->execute([$id]);
        $usuario = $consulta->fetch();
    }
    if ($usuario === false) {
        destruirSesion();
        responder(401, ['error' => 'Sesión no válida.']);
    }
    $_SESSION['ultima_actividad'] = time();
    // Libera el archivo de sesión para no bloquear las demás peticiones del usuario.
    session_write_close();
    $usuario['id'] = (int) $usuario['id'];
    return $usuario;
}

/** Devuelve el usuario si es administrador, o responde 403. */
function exigirAdmin(): array
{
    $usuario = exigirSesion();
    if ($usuario['rol'] !== 'admin') {
        responder(403, ['error' => 'Solo el administrador puede hacer esto.']);
    }
    return $usuario;
}

function entrar(): never
{
    $datos = leerJson();
    $nombreUsuario = mb_substr((string) ($datos['usuario'] ?? ''), 0, 60);
    $clave = (string) ($datos['clave'] ?? '');
    $pdo = db();

    $consulta = $pdo->prepare('SELECT 1 FROM intentos_login WHERE usuario = ? AND bloqueado_hasta > UTC_TIMESTAMP(3)');
    $consulta->execute([$nombreUsuario]);
    if ($consulta->fetchColumn() !== false) {
        responder(429, ['error' => 'Demasiados intentos. Espera 15 minutos.']);
    }

    $consulta = $pdo->prepare('SELECT id, usuario, nombre, rol, password_hash FROM usuarios WHERE usuario = ? AND activo = 1');
    $consulta->execute([$nombreUsuario]);
    $usuario = $consulta->fetch();
    // Sin usuario también se verifica contra un hash, para que el tiempo de
    // respuesta no revele qué usuarios existen.
    $hash = $usuario['password_hash'] ?? '$2y$10$usesomesillystringforsaltOgS3IZ8PZ3M4xjZ1EzjbmGv5kG6nCW';
    if (!password_verify($clave, $hash) || $usuario === false) {
        registrarFallo($nombreUsuario);
        responder(401, ['error' => 'Usuario o contraseña incorrectos.']);
    }

    $pdo->prepare('DELETE FROM intentos_login WHERE usuario = ?')->execute([$nombreUsuario]);
    iniciarSesion();
    session_regenerate_id(true);
    $_SESSION['usuario_id'] = (int) $usuario['id'];
    $_SESSION['ultima_actividad'] = time();
    unset($usuario['password_hash']);
    $usuario['id'] = (int) $usuario['id'];
    responder(200, $usuario);
}

function registrarFallo(string $usuario): void
{
    $pdo = db();
    $pdo->prepare('INSERT INTO intentos_login (usuario, fallos) VALUES (?, 1) ON DUPLICATE KEY UPDATE fallos = fallos + 1')
        ->execute([$usuario]);
    $pdo->prepare('UPDATE intentos_login SET fallos = 0, bloqueado_hasta = UTC_TIMESTAMP(3) + INTERVAL ? MINUTE WHERE usuario = ? AND fallos >= ?')
        ->execute([MINUTOS_BLOQUEO, $usuario, MAXIMO_FALLOS]);
}

function rutasSesion(string $metodo, array $partes): never
{
    $accion = $partes[1] ?? '';
    if ($metodo === 'GET' && $accion === '') {
        responder(200, exigirSesion());
    }
    if ($metodo === 'POST' && $accion === 'login') {
        entrar();
    }
    if ($metodo === 'POST' && $accion === 'logout') {
        iniciarSesion();
        destruirSesion();
        responder(200, ['ok' => true]);
    }
    responder(404, ['error' => 'Ruta no encontrada.']);
}
