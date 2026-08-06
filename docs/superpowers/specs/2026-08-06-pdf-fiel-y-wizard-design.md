# Diseño: PDF fiel al formato físico + captura tipo wizard

Fecha: 2026-08-06
Estado: Aprobado por el usuario

## Problema

1. El "PDF" exportado hoy es una vista genérica de tablas (`PdfVistaComponent`) que no se
   parece al formato físico oficial de UMAM (Registro de Atención Prehospitalaria, 2 páginas,
   folio 56222 de referencia). El usuario necesita que el PDF sea visualmente idéntico a la
   hoja impresa.
2. La pantalla de captura (acordeones con radios/checkboxes de Material chicos) no es óptima
   para el uso real: captura rápida en celular durante un servicio de ambulancia.

## Decisiones tomadas (con el usuario)

- **Método PDF:** plantilla HTML/CSS de impresión fiel al papel + `window.print()`
  (guardar como PDF desde el diálogo). Sin librerías nuevas. Texto vectorial nítido.
- **Captura:** wizard paso a paso, una sección por paso, con chips táctiles grandes.

## Alcance

### 1. Vista de impresión fiel (`pdf-vista`)

Reescritura completa de `PdfVistaComponent` para replicar las 2 páginas del formato:

**Página 1 (frente):**
- Encabezado: logo UMAM (SVG/texto estilizado), "REGISTRO DE ATENCIÓN PREHOSPITALARIA",
  teléfonos (656) 625-9472 / (656) 625-9473, ambulanciasumam@yahoo.com, FOLIO en rojo.
- Renglón ESTADO / CIUDAD.
- Layout a 2 columnas con pestañas laterales azules verticales por sección
  (II DATOS DEL SERVICIO, III CONTROL, IV DATOS DEL PACIENTE, V CAUSA TRAUMÁTICA,
  VI CAUSA CLÍNICA, VII PARTO | VIII EVALUACIÓN INICIAL, IX EVALUACIÓN SECUNDARIA,
  X ANAMNESIS, XI TRATAMIENTO).
- Tabla de CRONOMETRÍA (6 horas), casillas ☐/☑ idénticas al papel para todos los grupos
  de opciones, silueta humana (SVG frente/espalda) en zonas de lesión, círculos de pupilas,
  tabla de SIGNOS VITALES Y MONITOREO, tabla de MANEJO FARMACOLÓGICO Y TERAPIA ELÉCTRICA.

**Página 2 (reverso):**
- XII TRASLADO (institución, condición, prioridad, texto de negativa/eximente con líneas de
  firma), XIII OBSERVACIONES (renglones), XIV SELLO DE MINISTERIO PÚBLICO,
- XV DATOS LEGALES (autoridades, tabla de 4 vehículos involucrados con placas, posición del
  paciente, pertenencias), XVI HOSPITAL RECEPTOR (aceptación, firmas entrega/recibe),
- MATERIAL UTILIZADO: cuadrícula completa de 3 columnas con todos los ítems del catálogo y
  casilla/cantidad por ítem.
- Pie: teléfonos, dirección (Calle Quinta Amalia #107, Fracc. Las Quintas, Cd. Juárez,
  Chih., C.P. 32401), e-mail.

**Reglas de render:**
- Campos vacíos se imprimen como líneas/casillas en blanco (igual que el papel; sirve
  también para imprimir en blanco y llenar a mano).
- Colores exactos: azul UMAM #1892d3, celeste de fondos, folio rojo; `print-color-adjust:
  exact` en todo elemento con fondo.
- `@page { size: letter; margin: … }`, `break-inside: avoid` por bloque, salto de página
  forzado entre página 1 y 2.
- Tipografías pequeñas y condensadas (~6.5–8px en impresión) como el original.

### 2. Captura tipo wizard (`formulario` + nuevos componentes)

- Nuevo componente de paso: muestra una sola sección a la vez (las 14 secciones de
  `SECCIONES` + Material Utilizado = 15 pasos).
- Encabezado con progreso ("Paso 3 de 15 — VIII. Evaluación Inicial") y menú desplegable
  para saltar directo a cualquier sección.
- Barra inferior fija: Anterior / Siguiente + acciones (guardar, PDF, Excel, nuevo).
- `campo-formulario`: los tipos `radio-grupo` y `checkbox-grupo` se renderizan como chips
  grandes táctiles (alto mínimo ~44px) en vez de mat-radio/mat-checkbox.
- Campos cortos relacionados (horas de cronometría, APGAR/Silverman, Glasgow, Trauma Score)
  agrupados en cuadrícula de 2 columnas para reducir scroll.
- Se conservan sin cambios: modelo `RegistroAtencionPrehospitalaria`, `SECCIONES`,
  `construirFormularioRegistro`, autosave con debounce, `RegistroService`/localStorage,
  exportador de Excel, snapshot para impresión.

## Fuera de alcance

- Descarga directa de archivo .pdf (jspdf/html2canvas) — descartado por el usuario.
- Cambios al modelo de datos o al exportador de Excel.
- Backend/sincronización.

## Pruebas

- Actualizar specs existentes de `pdf-vista`, `formulario` y `campo-formulario` al nuevo
  comportamiento; agregar specs del wizard (navegación, progreso).
- Verificación final: `ng build` sin errores + `ng test` en verde + revisión visual de la
  vista previa de impresión contra las fotos del formato.
