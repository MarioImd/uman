<?php
// Copia este archivo como config.php y llena los valores de tu cPanel.
return [
    'db_host' => 'localhost',
    'db_nombre' => '',
    'db_usuario' => '',
    'db_clave' => '',
    // Clave larga inventada por ti; se pide una sola vez al correr instalar.php.
    'token_instalacion' => '',
    // Carpeta privada para las sesiones, de preferencia fuera de public_html.
    'carpeta_sesiones' => '',
    // Archivo de errores, de preferencia fuera de public_html. Si queda vacío se
    // usa api/errores.log, que el .htaccess bloquea.
    'archivo_errores' => '',
    // Cookie siempre Secure y encabezado HSTS. Actívalo SOLO cuando el certificado
    // funcione bien: con HSTS los navegadores recuerdan la regla por un año y, si
    // el certificado falla, el sitio queda inaccesible para quien ya entró.
    'forzar_https' => false,
    // Actívalo solo si un proxy de confianza termina el SSL y envía X-Forwarded-Proto.
    // Sin proxy, cualquiera podría falsificar ese encabezado.
    'confiar_proxy' => false,
];
