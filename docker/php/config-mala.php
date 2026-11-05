<?php
// Prueba de que un fallo de conexión no revela detalles.
return [...require __DIR__ . '/config.php', 'db_usuario' => 'usuario_que_no_existe', 'db_clave' => 'clave_equivocada'];
