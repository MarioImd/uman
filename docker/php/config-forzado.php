<?php
// Prueba de forzar_https detrás de un proxy de confianza.
return [...require __DIR__ . '/config.php', 'forzar_https' => true, 'confiar_proxy' => true];
