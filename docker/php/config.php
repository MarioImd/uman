<?php
// Configuración solo para el entorno local de Docker.
return [
    'db_host' => 'db',
    'db_nombre' => 'umam',
    'db_usuario' => 'umam',
    'db_clave' => 'umam',
    'token_instalacion' => 'token-de-prueba',
    'carpeta_sesiones' => '/tmp/umam-sesiones',
    'archivo_errores' => '/tmp/umam-errores.log',
    'forzar_https' => false,
    'confiar_proxy' => false,
];
