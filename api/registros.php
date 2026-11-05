<?php
// Registros de atención prehospitalaria.

const POR_PAGINA = 20;
const MAXIMO_POR_PAGINA = 100;
const MENSAJE_MUY_GRANDE = 'El registro es demasiado grande para el servidor. Quita o reduce algunas imágenes.';

/** Lee pagina y porPagina de la URL y devuelve [pagina, porPagina, offset]. */
function paginacion(): array
{
    $pagina = max(1, (int) ($_GET['pagina'] ?? 1));
    $porPagina = min(MAXIMO_POR_PAGINA, max(1, (int) ($_GET['porPagina'] ?? POR_PAGINA)));
    return [$pagina, $porPagina, ($pagina - 1) * $porPagina];
}

/** Convierte un texto de búsqueda en patrón LIKE, tratando % y _ como texto literal. */
function patronBusqueda(string $texto): string
{
    return '%' . addcslashes($texto, '\\%_') . '%';
}

/** Fecha de MySQL (UTC) a ISO 8601. */
function fechaIso(?string $fecha): ?string
{
    return $fecha === null ? null : str_replace(' ', 'T', $fecha) . 'Z';
}

function listarRegistros(): never
{
    exigirSesion();
    [$pagina, $porPagina, $offset] = paginacion();
    $filtro = 'eliminado = 0';
    $parametros = [];
    $texto = trim((string) ($_GET['q'] ?? ''));
    if ($texto !== '') {
        $filtro .= ' AND (folio LIKE ? OR paciente LIKE ? OR ciudad LIKE ?)';
        $parametros = array_fill(0, 3, patronBusqueda($texto));
    }

    $pdo = db();
    $total = $pdo->prepare("SELECT COUNT(*) FROM registros WHERE $filtro");
    $total->execute($parametros);

    // Nunca se selecciona `datos`: ahí viven las imágenes.
    $filas = $pdo->prepare(
        "SELECT id, folio, ciudad, paciente, fecha_creacion FROM registros WHERE $filtro
         ORDER BY fecha_creacion DESC, id LIMIT $porPagina OFFSET $offset"
    );
    $filas->execute($parametros);

    $items = array_map(fn (array $fila) => [
        'id' => $fila['id'],
        'folio' => $fila['folio'],
        'ciudad' => $fila['ciudad'],
        'paciente' => $fila['paciente'],
        'fechaCreacion' => fechaIso($fila['fecha_creacion']),
    ], $filas->fetchAll());

    responder(200, ['items' => $items, 'total' => (int) $total->fetchColumn(), 'pagina' => $pagina, 'porPagina' => $porPagina]);
}

/**
 * Envía un registro completo. `datos` ya es JSON, así que se agrega la versión
 * vigente al final sin decodificarlo: un registro con fotos pesa varios MB y
 * decodificarlo gastaría memoria sin necesidad. En JSON gana la última clave,
 * por lo que esta versión sustituye a la que venía guardada en `datos`.
 */
function responderRegistro(array $fila): never
{
    http_response_code(200);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo substr($fila['datos'], 0, -1), ',"version":', (int) $fila['version'], '}';
    exit;
}

function obtenerRegistro(string $id): never
{
    exigirSesion();
    $consulta = db()->prepare('SELECT datos, version FROM registros WHERE id = ? AND eliminado = 0');
    $consulta->execute([$id]);
    $fila = $consulta->fetch();
    if ($fila === false) {
        responder(404, ['error' => 'Registro no encontrado.']);
    }
    responderRegistro($fila);
}

function ultimoRegistro(): never
{
    $usuario = exigirSesion();
    $consulta = db()->prepare(
        'SELECT datos, version FROM registros WHERE actualizado_por = ? AND eliminado = 0
         ORDER BY fecha_actualizacion DESC LIMIT 1'
    );
    $consulta->execute([$usuario['id']]);
    $fila = $consulta->fetch();
    if ($fila === false) {
        responder(404, ['error' => 'No hay registros propios.']);
    }
    responderRegistro($fila);
}

function responderChoque(string $id): never
{
    $consulta = db()->prepare('SELECT eliminado FROM registros WHERE id = ?');
    $consulta->execute([$id]);
    if ((int) $consulta->fetchColumn() === 1) {
        responder(409, ['codigo' => 'eliminado', 'error' => 'Este registro fue eliminado.']);
    }
    responder(409, ['codigo' => 'conflicto', 'error' => 'Otra persona modificó este registro.']);
}

function guardarRegistro(string $id): never
{
    $usuario = exigirSesion();
    if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > bytesDeIni(ini_get('post_max_size'))) {
        responder(413, ['error' => MENSAJE_MUY_GRANDE]);
    }
    // Se guarda el JSON tal como llegó, sin volver a codificarlo, para ahorrar memoria.
    $crudo = rtrim(file_get_contents('php://input'));
    $datos = json_decode($crudo, true);
    if (!is_array($datos) || ($datos['id'] ?? null) !== $id) {
        responder(400, ['error' => 'El id del cuerpo no coincide con el de la URL.']);
    }
    try {
        $fechaCreacion = (new DateTimeImmutable((string) ($datos['fechaCreacion'] ?? '')))
            ->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s.v');
    } catch (Exception) {
        responder(400, ['error' => 'La fecha de creación no es válida.']);
    }

    $version = (int) ($datos['version'] ?? 0);
    $folio = mb_substr((string) ($datos['folio'] ?? ''), 0, 191);
    $estado = mb_substr((string) ($datos['estado'] ?? ''), 0, 255);
    $ciudad = mb_substr((string) ($datos['ciudad'] ?? ''), 0, 255);
    $nombre = $datos['datosPaciente']['nombreOMediaFiliacion'] ?? '';
    $paciente = mb_substr(is_string($nombre) ? $nombre : '', 0, 255);
    unset($datos);

    $pdo = db();
    try {
        if ($version === 0) {
            $pdo->prepare(
                'INSERT INTO registros (id, fecha_creacion, fecha_actualizacion, folio, estado, ciudad, paciente, datos, creado_por, actualizado_por)
                 VALUES (?, ?, UTC_TIMESTAMP(3), ?, ?, ?, ?, ?, ?, ?)'
            )->execute([$id, $fechaCreacion, $folio, $estado, $ciudad, $paciente, $crudo, $usuario['id'], $usuario['id']]);
            registrarActividad($usuario['id'], 'creo', $id, $folio);
            responder(200, ['version' => 1]);
        }

        // Solo guarda si nadie cambió el registro desde que esta persona lo cargó.
        $actualizar = $pdo->prepare(
            'UPDATE registros SET version = version + 1, fecha_actualizacion = UTC_TIMESTAMP(3), folio = ?, estado = ?,
                ciudad = ?, paciente = ?, datos = ?, actualizado_por = ?
             WHERE id = ? AND version = ? AND eliminado = 0'
        );
        $actualizar->execute([$folio, $estado, $ciudad, $paciente, $crudo, $usuario['id'], $id, $version]);
    } catch (PDOException $error) {
        $codigo = (int) ($error->errorInfo[1] ?? 0);
        if ($codigo === 1062) {
            responderChoque($id); // Llave duplicada: el registro ya existía.
        }
        if (in_array($codigo, [1153, 1301, 2006, 2013], true)) {
            responder(413, ['error' => MENSAJE_MUY_GRANDE]); // Rebasó max_allowed_packet.
        }
        throw $error;
    }

    if ($actualizar->rowCount() === 0) {
        responderChoque($id);
    }
    registrarActividad($usuario['id'], 'edito', $id, $folio);
    responder(200, ['version' => $version + 1]);
}

function eliminarRegistro(string $id): never
{
    $usuario = exigirSesion();
    $pdo = db();
    $marcar = $pdo->prepare(
        'UPDATE registros SET eliminado = 1, eliminado_por = ?, eliminado_en = UTC_TIMESTAMP(3) WHERE id = ? AND eliminado = 0'
    );
    $marcar->execute([$usuario['id'], $id]);
    if ($marcar->rowCount() > 0) {
        $consulta = $pdo->prepare('SELECT folio FROM registros WHERE id = ?');
        $consulta->execute([$id]);
        registrarActividad($usuario['id'], 'elimino', $id, (string) $consulta->fetchColumn());
    }
    responder(200, ['ok' => true]);
}

function listarEliminados(): never
{
    exigirAdmin();
    [$pagina, $porPagina, $offset] = paginacion();
    $pdo = db();
    $total = (int) $pdo->query('SELECT COUNT(*) FROM registros WHERE eliminado = 1')->fetchColumn();
    $filas = $pdo->query(
        "SELECT r.id, r.folio, r.ciudad, r.paciente, r.fecha_creacion, r.eliminado_en, u.usuario AS eliminado_por
         FROM registros r LEFT JOIN usuarios u ON u.id = r.eliminado_por
         WHERE r.eliminado = 1 ORDER BY r.eliminado_en DESC, r.id LIMIT $porPagina OFFSET $offset"
    )->fetchAll();

    $items = array_map(fn (array $fila) => [
        'id' => $fila['id'],
        'folio' => $fila['folio'],
        'ciudad' => $fila['ciudad'],
        'paciente' => $fila['paciente'],
        'fechaCreacion' => fechaIso($fila['fecha_creacion']),
        'eliminadoPor' => $fila['eliminado_por'],
        'eliminadoEn' => fechaIso($fila['eliminado_en']),
    ], $filas);

    responder(200, ['items' => $items, 'total' => $total, 'pagina' => $pagina, 'porPagina' => $porPagina]);
}

function restaurarRegistro(string $id): never
{
    $usuario = exigirAdmin();
    $pdo = db();
    $restaurar = $pdo->prepare('UPDATE registros SET eliminado = 0, eliminado_por = NULL, eliminado_en = NULL WHERE id = ? AND eliminado = 1');
    $restaurar->execute([$id]);
    if ($restaurar->rowCount() === 0) {
        responder(404, ['error' => 'Registro eliminado no encontrado.']);
    }
    $consulta = $pdo->prepare('SELECT folio FROM registros WHERE id = ?');
    $consulta->execute([$id]);
    registrarActividad($usuario['id'], 'restauro', $id, (string) $consulta->fetchColumn());
    responder(200, ['ok' => true]);
}

function rutasRegistros(string $metodo, array $partes): never
{
    $id = $partes[1] ?? '';
    $accion = $partes[2] ?? '';
    if ($metodo === 'GET' && $id === '') {
        listarRegistros();
    }
    if ($metodo === 'GET' && $id === 'ultimo') {
        ultimoRegistro();
    }
    if ($metodo === 'GET' && $id === 'eliminados') {
        listarEliminados();
    }
    if (preg_match('/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i', $id) === 1) {
        if ($metodo === 'GET' && $accion === '') {
            obtenerRegistro($id);
        }
        if ($metodo === 'POST' && $accion === '') {
            guardarRegistro($id);
        }
        if ($metodo === 'POST' && $accion === 'eliminar') {
            eliminarRegistro($id);
        }
        if ($metodo === 'POST' && $accion === 'restaurar') {
            restaurarRegistro($id);
        }
    }
    responder(404, ['error' => 'Ruta no encontrada.']);
}
