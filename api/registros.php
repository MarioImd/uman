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

/**
 * Convierte un texto de búsqueda en patrón LIKE, tratando % y _ como texto literal.
 * Se usa con ESCAPE '|' porque el escape por defecto (\\) deja de funcionar en
 * MySQL con NO_BACKSLASH_ESCAPES.
 */
function patronBusqueda(string $texto): string
{
    return '%' . strtr($texto, ['|' => '||', '%' => '|%', '_' => '|_']) . '%';
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
        $filtro .= " AND (folio LIKE ? ESCAPE '|' OR paciente LIKE ? ESCAPE '|' OR ciudad LIKE ? ESCAPE '|')";
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
    // Se envía por partes para no duplicar en memoria un registro de varios MB.
    $largo = strlen($fila['datos']) - 1;
    for ($inicio = 0; $inicio < $largo; $inicio += 1048576) {
        echo substr($fila['datos'], $inicio, min(1048576, $largo - $inicio));
    }
    echo ',"version":', (int) $fila['version'], '}';
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
        'SELECT datos, version FROM registros WHERE creado_por = ? AND finalizado = 0 AND eliminado = 0
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

/**
 * ¿Rebasa lo que el servidor puede recibir o volver a leer? Guardar y, sobre
 * todo, leer un registro ocupan varias veces su tamaño en memoria. Un post_max_size
 * de 0 o un memory_limit de -1 significan "sin límite".
 */
function excedeLimites(int $bytes, int $postMaximo, int $memoria): bool
{
    if ($postMaximo > 0 && $bytes > $postMaximo) {
        return true;
    }
    return $memoria > 0 && $bytes * 3 > $memoria;
}

/** El tamaño más grande que el servidor puede guardar y volver a leer. */
function limiteRegistro(int $postMaximo, int $memoria, int $paquete): int
{
    $limites = array_filter([$postMaximo, intdiv($memoria, 3), $paquete], fn (int $limite) => $limite > 0);
    return min($limites);
}

/** Se le informa a la app para que avise antes de enviar; el servidor valida por su cuenta. */
function limiteActual(): int
{
    $paquete = (int) db()->query('SELECT @@max_allowed_packet')->fetchColumn();
    return limiteRegistro(bytesDeIni(ini_get('post_max_size')), bytesDeIni(ini_get('memory_limit')), $paquete);
}

function guardarRegistro(string $id): never
{
    $usuario = exigirSesion();
    if (excedeLimites((int) ($_SERVER['CONTENT_LENGTH'] ?? 0), bytesDeIni(ini_get('post_max_size')), bytesDeIni(ini_get('memory_limit')))) {
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
    $finalizado = empty($datos['finalizado']) ? 0 : 1;
    $edicionId = is_string($datos['edicionId'] ?? null) ? substr($datos['edicionId'], 0, 36) : null;
    unset($datos);

    $pdo = db();
    $pdo->beginTransaction();
    try {
        if ($version === 0 && insertarRegistro($id, $fechaCreacion, $folio, $estado, $ciudad, $paciente, $crudo, $finalizado, $edicionId, $usuario['id'])) {
            registrarActividad($usuario['id'], 'creo', $id, $folio);
            $pdo->commit();
            responder(200, ['version' => 1]);
        }

        // Solo guarda si nadie cambió el registro desde que esta persona lo cargó.
        // La segunda condición cubre una respuesta perdida por mala señal: el
        // guardado anterior sí se aplicó y el navegador no se enteró. Si esta misma
        // pantalla fue la última en guardar, nadie más ha escrito desde entonces.
        $actualizar = $pdo->prepare(
            'UPDATE registros SET version = version + 1, fecha_actualizacion = UTC_TIMESTAMP(3), folio = ?, estado = ?,
                ciudad = ?, paciente = ?, datos = ?, finalizado = ?, edicion_id = ?, actualizado_por = ?
             WHERE id = ? AND eliminado = 0 AND (version = ? OR edicion_id = ?)'
        );
        $actualizar->execute([$folio, $estado, $ciudad, $paciente, $crudo, $finalizado, $edicionId, $usuario['id'], $id, $version, $edicionId]);
        if ($actualizar->rowCount() === 0) {
            $pdo->rollBack();
            responderChoque($id);
        }

        registrarActividad($usuario['id'], 'edito', $id, $folio);
        $consulta = $pdo->prepare('SELECT version FROM registros WHERE id = ?');
        $consulta->execute([$id]);
        $vigente = (int) $consulta->fetchColumn();
        $pdo->commit();
        responder(200, ['version' => $vigente]);
    } catch (PDOException $error) {
        try {
            $pdo->rollBack();
        } catch (Throwable) {
            // La conexión ya se perdió, y con ella la transacción.
        }
        if (in_array((int) ($error->errorInfo[1] ?? 0), [1153, 1301, 2006, 2013], true)) {
            responder(413, ['error' => MENSAJE_MUY_GRANDE]); // Rebasó max_allowed_packet.
        }
        throw $error;
    }
}

/** Crea el registro. Devuelve false si el id ya existía. */
function insertarRegistro(string $id, string $fechaCreacion, string $folio, string $estado, string $ciudad, string $paciente, string $crudo, int $finalizado, ?string $edicionId, int $usuarioId): bool
{
    try {
        db()->prepare(
            'INSERT INTO registros (id, fecha_creacion, fecha_actualizacion, folio, estado, ciudad, paciente, datos, finalizado, edicion_id, creado_por, actualizado_por)
             VALUES (?, ?, UTC_TIMESTAMP(3), ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([$id, $fechaCreacion, $folio, $estado, $ciudad, $paciente, $crudo, $finalizado, $edicionId, $usuarioId, $usuarioId]);
        return true;
    } catch (PDOException $error) {
        if ((int) ($error->errorInfo[1] ?? 0) === 1062) {
            return false;
        }
        throw $error;
    }
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
