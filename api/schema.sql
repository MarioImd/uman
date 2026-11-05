-- Esquema de UMAM. Lo ejecuta instalar.php.
CREATE TABLE IF NOT EXISTS usuarios (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  usuario VARCHAR(60) NOT NULL UNIQUE,
  nombre VARCHAR(120) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  rol ENUM('admin', 'usuario') NOT NULL DEFAULT 'usuario',
  activo TINYINT(1) NOT NULL DEFAULT 1,
  -- Sube al cambiar la contraseña: invalida las sesiones abiertas.
  sesion_version INT UNSIGNED NOT NULL DEFAULT 1,
  creado_en DATETIME(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- datos guarda el JSON completo. Las demás columnas sirven para listar y buscar
-- sin leer las imágenes.
CREATE TABLE IF NOT EXISTS registros (
  id CHAR(36) NOT NULL PRIMARY KEY,
  fecha_creacion DATETIME(3) NOT NULL,
  fecha_actualizacion DATETIME(3) NOT NULL,
  folio VARCHAR(191) NOT NULL DEFAULT '',
  estado VARCHAR(255) NOT NULL DEFAULT '',
  ciudad VARCHAR(255) NOT NULL DEFAULT '',
  paciente VARCHAR(255) NOT NULL DEFAULT '',
  datos LONGTEXT NOT NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  -- Identifica la pantalla que guardó por última vez. Ver guardarRegistro().
  edicion_id CHAR(36) NULL,
  finalizado TINYINT(1) NOT NULL DEFAULT 0,
  eliminado TINYINT(1) NOT NULL DEFAULT 0,
  eliminado_por INT UNSIGNED NULL,
  eliminado_en DATETIME(3) NULL,
  creado_por INT UNSIGNED NOT NULL,
  actualizado_por INT UNSIGNED NOT NULL,
  INDEX idx_eliminado_fecha (eliminado, fecha_creacion),
  INDEX idx_ultimo (creado_por, finalizado, eliminado, fecha_actualizacion),
  INDEX idx_folio (folio),
  FOREIGN KEY (creado_por) REFERENCES usuarios (id),
  FOREIGN KEY (actualizado_por) REFERENCES usuarios (id),
  FOREIGN KEY (eliminado_por) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS actividad (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT UNSIGNED NOT NULL,
  accion ENUM('creo', 'edito', 'elimino', 'restauro') NOT NULL,
  registro_id CHAR(36) NOT NULL,
  folio VARCHAR(191) NOT NULL DEFAULT '',
  inicio DATETIME(3) NOT NULL,
  fin DATETIME(3) NOT NULL,
  INDEX idx_agrupar (usuario_id, registro_id, accion, fin),
  INDEX idx_inicio (inicio),
  FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS intentos_login (
  usuario VARCHAR(60) NOT NULL PRIMARY KEY,
  fallos INT UNSIGNED NOT NULL DEFAULT 0,
  bloqueado_hasta DATETIME(3) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
