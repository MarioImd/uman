<?php
// Registro de quién hizo qué sobre cada registro.

const MINUTOS_AGRUPAR_EDICION = 30;

/**
 * Agrega una fila de actividad. El autoguardado edita muchas veces por minuto,
 * así que las ediciones seguidas de una persona sobre un registro comparten fila.
 */
function registrarActividad(int $usuarioId, string $accion, string $registroId, string $folio): void
{
    $pdo = db();
    if ($accion === 'edito') {
        $actualizar = $pdo->prepare(
            "UPDATE actividad SET fin = UTC_TIMESTAMP(3), folio = ?
             WHERE usuario_id = ? AND registro_id = ? AND accion = 'edito'
               AND fin >= UTC_TIMESTAMP(3) - INTERVAL ? MINUTE
             ORDER BY fin DESC LIMIT 1"
        );
        $actualizar->execute([$folio, $usuarioId, $registroId, MINUTOS_AGRUPAR_EDICION]);
        if ($actualizar->rowCount() > 0) {
            return;
        }
    }
    $pdo->prepare(
        'INSERT INTO actividad (usuario_id, accion, registro_id, folio, inicio, fin)
         VALUES (?, ?, ?, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))'
    )->execute([$usuarioId, $accion, $registroId, $folio]);
}

function listarActividad(): never
{
    exigirAdmin();
    [$pagina, $porPagina, $offset] = paginacion();
    $filtro = '1 = 1';
    $parametros = [];
    $texto = trim((string) ($_GET['q'] ?? ''));
    if ($texto !== '') {
        $filtro = "(u.usuario LIKE ? ESCAPE '|' OR u.nombre LIKE ? ESCAPE '|' OR a.folio LIKE ? ESCAPE '|')";
        $parametros = array_fill(0, 3, patronBusqueda($texto));
    }

    $pdo = db();
    $total = $pdo->prepare("SELECT COUNT(*) FROM actividad a JOIN usuarios u ON u.id = a.usuario_id WHERE $filtro");
    $total->execute($parametros);
    $filas = $pdo->prepare(
        "SELECT u.usuario, a.accion, a.folio, a.inicio, a.fin FROM actividad a
         JOIN usuarios u ON u.id = a.usuario_id WHERE $filtro
         ORDER BY a.fin DESC, a.id DESC LIMIT $porPagina OFFSET $offset"
    );
    $filas->execute($parametros);

    $items = array_map(fn (array $fila) => [
        ...$fila,
        'inicio' => fechaIso($fila['inicio']),
        'fin' => fechaIso($fila['fin']),
    ], $filas->fetchAll());

    responder(200, ['items' => $items, 'total' => (int) $total->fetchColumn(), 'pagina' => $pagina, 'porPagina' => $porPagina]);
}
