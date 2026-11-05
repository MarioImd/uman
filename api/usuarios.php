<?php
// Administración de usuarios. Solo para el rol admin.

const CLAVE_MINIMA = 8;

function validarClave(mixed $clave): string
{
    if (!is_string($clave) || mb_strlen($clave) < CLAVE_MINIMA) {
        responder(400, ['error' => 'La contraseña debe tener al menos 8 caracteres.']);
    }
    return $clave;
}

function validarNombre(mixed $nombre): string
{
    $nombre = is_string($nombre) ? trim($nombre) : '';
    if ($nombre === '' || mb_strlen($nombre) > 120) {
        responder(400, ['error' => 'Escribe un nombre de hasta 120 caracteres.']);
    }
    return $nombre;
}

function validarRol(mixed $rol): string
{
    if ($rol !== 'admin' && $rol !== 'usuario') {
        responder(400, ['error' => 'El rol no es válido.']);
    }
    return $rol;
}

function buscarUsuario(int $id): array|false
{
    $consulta = db()->prepare('SELECT id, usuario, nombre, rol, activo FROM usuarios WHERE id = ?');
    $consulta->execute([$id]);
    $usuario = $consulta->fetch();
    return $usuario === false ? false : formatoUsuario($usuario);
}

function formatoUsuario(array $fila): array
{
    return [...$fila, 'id' => (int) $fila['id'], 'activo' => (bool) $fila['activo']];
}

function listarUsuarios(): never
{
    exigirAdmin();
    $filas = db()->query('SELECT id, usuario, nombre, rol, activo FROM usuarios ORDER BY id')->fetchAll();
    responder(200, array_map('formatoUsuario', $filas));
}

function crearUsuario(): never
{
    exigirAdmin();
    $datos = leerJson();
    $usuario = trim((string) ($datos['usuario'] ?? ''));
    if (preg_match('/^[\p{L}\p{N}._-]{3,60}$/u', $usuario) !== 1) {
        responder(400, ['error' => 'El usuario debe tener de 3 a 60 letras, números, punto o guion.']);
    }
    $nombre = validarNombre($datos['nombre'] ?? null);
    $rol = validarRol($datos['rol'] ?? null);
    $clave = validarClave($datos['clave'] ?? null);

    $pdo = db();
    try {
        $pdo->prepare('INSERT INTO usuarios (usuario, nombre, password_hash, rol, creado_en) VALUES (?, ?, ?, ?, UTC_TIMESTAMP(3))')
            ->execute([$usuario, $nombre, password_hash($clave, PASSWORD_DEFAULT), $rol]);
    } catch (PDOException $error) {
        if ((int) ($error->errorInfo[1] ?? 0) === 1062) {
            responder(409, ['error' => 'Ese usuario ya existe.']);
        }
        throw $error;
    }
    responder(200, buscarUsuario((int) $pdo->lastInsertId()));
}

function editarUsuario(int $id): never
{
    exigirAdmin();
    $datos = leerJson();
    $actual = buscarUsuario($id);
    if ($actual === false) {
        responder(404, ['error' => 'Usuario no encontrado.']);
    }

    $nombre = array_key_exists('nombre', $datos) ? validarNombre($datos['nombre']) : $actual['nombre'];
    $rol = array_key_exists('rol', $datos) ? validarRol($datos['rol']) : $actual['rol'];
    $activo = array_key_exists('activo', $datos) ? (bool) $datos['activo'] : $actual['activo'];
    $clave = array_key_exists('clave', $datos) ? validarClave($datos['clave']) : null;

    $pdo = db();
    $dejaDeSerAdmin = $actual['rol'] === 'admin' && $actual['activo'] && ($rol !== 'admin' || !$activo);
    if ($dejaDeSerAdmin) {
        $admins = (int) $pdo->query("SELECT COUNT(*) FROM usuarios WHERE rol = 'admin' AND activo = 1")->fetchColumn();
        if ($admins <= 1) {
            responder(409, ['error' => 'Debe quedar al menos un administrador activo.']);
        }
    }

    $pdo->prepare('UPDATE usuarios SET nombre = ?, rol = ?, activo = ? WHERE id = ?')
        ->execute([$nombre, $rol, (int) $activo, $id]);
    if ($clave !== null) {
        $pdo->prepare('UPDATE usuarios SET password_hash = ? WHERE id = ?')
            ->execute([password_hash($clave, PASSWORD_DEFAULT), $id]);
        // La clave nueva también levanta un bloqueo por intentos fallidos.
        $pdo->prepare('DELETE FROM intentos_login WHERE usuario = ?')->execute([$actual['usuario']]);
    }
    responder(200, buscarUsuario($id));
}

function rutasUsuarios(string $metodo, array $partes): never
{
    $id = $partes[1] ?? '';
    if ($metodo === 'GET' && $id === '') {
        listarUsuarios();
    }
    if ($metodo === 'POST' && $id === '') {
        crearUsuario();
    }
    if ($metodo === 'POST' && ctype_digit($id)) {
        editarUsuario((int) $id);
    }
    responder(404, ['error' => 'Ruta no encontrada.']);
}
