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
