# PDF fiel al formato físico + captura wizard — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** El botón "Exportar PDF" produce un documento idéntico a la hoja física de UMAM (2 páginas), y la captura pasa de acordeones a un wizard paso a paso con chips táctiles.

**Architecture:** La vista de impresión (`PdfVistaComponent`) se reescribe como plantilla HTML/CSS bespoke de 2 páginas carta que replica el papel; se llena desde el snapshot del formulario y los catálogos `SECCIONES`/`CATALOGO_MATERIAL`. La captura se reorganiza: `FormularioComponent` mantiene el FormGroup/autosave/exportadores intactos pero renderiza una sección por paso con un nuevo `SeccionPasoComponent`; `CampoFormularioComponent` cambia radios/checkboxes por chips táctiles.

**Tech Stack:** Angular 20 standalone components, Reactive Forms, Angular Material (se conserva para inputs), CSS print (`@page`, `print-color-adjust`). Sin dependencias nuevas.

## Global Constraints

- Sin librerías nuevas en `package.json`.
- No se modifican: `registro.model.ts`, `construir-formulario.ts`, `secciones.data.ts`, `material-utilizado.data.ts`, `registro-local-storage.service.ts`, `excel-exportador.service.ts`.
- Colores UMAM: azul `#1892d3`, celeste `#dbeef9`, borde `#b9def2`, folio rojo `#c0392b`.
- Etiquetas/textos del PDF copiados textualmente de la hoja física (fotos de referencia en el spec).
- Todo fondo de color en impresión lleva `print-color-adjust: exact; -webkit-print-color-adjust: exact;`.
- Comandos de verificación: `npx ng build` y `npx ng test --watch=false --browsers=ChromeHeadless`.

---

### Task 1: Chips táctiles en `campo-formulario`

**Files:**
- Modify: `src/app/shared/campo-formulario/campo-formulario.component.ts`
- Test: `src/app/shared/campo-formulario/campo-formulario.component.spec.ts`

**Interfaces:**
- Consumes: `CampoFormulario` (existente), `FormControl` (existente).
- Produces: mismos `@Input()`s; el DOM de `radio-grupo`/`checkbox-grupo` ahora usa `button.chip` con clase `chip-activo` cuando está seleccionado. API pública sin cambios (`estaMarcada`, `alternarOpcion`; se agrega `seleccionarRadio(opcion: string)` que fija el valor del control, y tocar el chip activo lo des-selecciona a `''`).

- [ ] **Step 1: Test de chips** — en el spec existente, agregar pruebas: (a) `radio-grupo` renderiza `button.chip` por opción; click fija `control.value`; segundo click en el mismo chip regresa a `''`; (b) `checkbox-grupo` alterna valores en el arreglo y refleja `chip-activo`.
- [ ] **Step 2: Correr tests** — deben FALLAR (no existen `.chip`).
- [ ] **Step 3: Implementación** — reemplazar `mat-radio-group`/`mat-checkbox` de los grupos por botones chip (`min-height: 44px`, `border-radius: 999px`, borde celeste, activo = fondo azul/texto blanco, `flex-wrap`). El checkbox simple (`tipo: 'checkbox'`) también se vuelve chip individual. Quitar imports de Material que queden sin uso.
- [ ] **Step 4: Correr tests** — PASS.
- [ ] **Step 5: Commit** — `feat: chips táctiles en grupos de opciones`.

### Task 2: Wizard paso a paso en `formulario`

**Files:**
- Create: `src/app/shared/seccion-paso/seccion-paso.component.ts` (+`.spec.ts`)
- Modify: `src/app/features/formulario/formulario.component.ts`
- Test: `src/app/features/formulario/formulario.component.spec.ts`
- Delete: `src/app/shared/seccion-acordeon/` (componente y spec) al final.

**Interfaces:**
- `SeccionPasoComponent`: `@Input() seccion: SeccionFormulario`, `@Input() grupo: FormGroup` — mismo contrato que tenía `SeccionAcordeonComponent` (reusa `app-campo-formulario` y `app-tabla-repetible`, incluida la resolución de `FormArray` vía `grupo.parent`). Sin acordeón: título + campos en `.grid-campos` (grid responsivo `repeat(auto-fit, minmax(160px, 1fr))`; texto/textarea/grupos ocupan `grid-column: 1 / -1`).
- `FormularioComponent` agrega: `pasoActual: number` (0-based), `totalPasos` (secciones + 1 de material), `avanzar()`, `retroceder()`, `irAPaso(i: number)`, `tituloPasoActual`. Al cambiar de paso hace `window.scrollTo(0, 0)`.

- [ ] **Step 1: Tests** — spec de `SeccionPasoComponent` (renderiza título y un `app-campo-formulario` por campo) y en `formulario.component.spec.ts`: inicia en paso 0 mostrando solo la primera sección; `avanzar()` muestra la siguiente; en el último paso aparece Material Utilizado; `irAPaso()` salta; el select de secciones lista los 15 pasos; los botones Anterior/Siguiente se deshabilitan en los extremos.
- [ ] **Step 2: Correr tests** — FALLAR.
- [ ] **Step 3: Implementación** — encabezado con "Paso N de 15" + `<select>` de salto + barra de progreso (`div` con ancho %); contenido = `app-seccion-paso` de la sección actual o panel de material en el último paso; barra inferior sticky: Anterior / Siguiente / acciones existentes (guardar, PDF, Excel, nuevo). Conservar `snapshotParaImpresion`, autosave y `solo-impresion` tal cual. Eliminar acordeón y su nav lateral.
- [ ] **Step 4: Correr tests** — PASS (incluye actualizar los specs viejos que asumían acordeón).
- [ ] **Step 5: Commit** — `feat: captura tipo wizard por secciones`.

### Task 3: PDF página 1 fiel al papel

**Files:**
- Modify: `src/app/features/exportacion/pdf-vista/pdf-vista.component.ts` (se reescribe; si crece demasiado, extraer template a `pdf-vista.component.html` y estilos a `.scss`)
- Test: `src/app/features/exportacion/pdf-vista/pdf-vista.component.spec.ts`

**Interfaces:**
- `PdfVistaComponent` conserva `@Input() registro`. Helpers nuevos usados por el template:
  - `v(seccion: string, campo: string): string` — valor plano ('' si vacío).
  - `marcado(seccion: string, campo: string, opcion: string): boolean` — true si la opción está en el arreglo (checkbox-grupo) o es igual al valor (radio-grupo/checkbox booleano con opcion omitida).
  - `filas(clave: string, minimo: number): Record<string, string>[]` — filas de tabla rellenadas con vacías hasta `minimo` (signosVitales: 3, manejoFarmacologico: 4, vehiculosInvolucrados: 4).
  - `materialDe(clave: string): { marcado: boolean; cantidad: string }`.
- Estructura CSS base: `.hoja` (8.5in ancho, padding, fuente 7px/1.25 Arial), `.fila-flex`, `.tab-seccion` (pestaña lateral azul con `writing-mode: vertical-rl; transform: rotate(180deg)`), `.bloque` (borde), `.casilla` (cuadrito 7px con ☑ via `::after` cuando `.marcada`), `.linea` (campo subrayado con contenido), `.tabla-mini` (tablas densas con encabezado celeste), `.titulo-campo` (negritas 6.5px). `@media print { @page { size: letter; margin: 0.25in } .hoja { width: auto } .salto { break-after: page } }`.

- [ ] **Step 1: Tests** — reescribir spec: renderiza encabezado ("REGISTRO DE ATENCIÓN PREHOSPITALARIA", teléfonos, folio del registro), pestañas de sección ("II DATOS DEL SERVICIO"…"XI TRATAMIENTO"), cronometría con 6 columnas de hora, casilla marcada cuando el registro trae p.ej. `datosServicio.motivoAtencion = 'Enfermedad'` y sin marcar cuando no, tabla de signos vitales con mínimo 3 filas.
- [ ] **Step 2: Correr tests** — FALLAR.
- [ ] **Step 3: Implementación página 1** — dos columnas (`display: grid; grid-template-columns: 1fr 1fr; gap: 8px`):
  - Encabezado: logo UMAM (SVG inline simple: estrella de la vida + texto "UMAM / UNIDAD MÓVIL DE ATENCIÓN MEDICA"), título y teléfonos centrados, `FOLIO:` en rojo negrita; renglón `ESTADO:`/`CIUDAD:` con `.linea`.
  - Columna izquierda: II Datos del Servicio (fecha/día, tabla CRONOMETRÍA con HORA DE LLAMADA/SALIDA/LLEGADA/TRASLADO/HOSPITAL/LIBERACIÓN, motivo con casillas, ubicación con líneas, lugar de ocurrencia con casillas), III Control, IV Datos del Paciente, V Causa Traumática (agente causal en 3 columnas de casillas, accidente automovilístico, sobre la colisión, atropellado), VI Causa Clínica, VII Parto (datos madre, post-parto, recién nacido, APGAR/Silverman).
  - Columna derecha: VIII Evaluación Inicial (nivel de conciencia, vía aérea, deglución, ventilación observación/auscultación/alternaciones, circulación pulsos/calidad/piel/características/temperatura), IX Evaluación Secundaria (exploración física con códigos D/CO/A/P/MP/C/H/F/ES/Q/L/E/AS/AM/DO, silueta humana SVG frente+espalda, círculos de pupilas, tabla SIGNOS VITALES Y MONITOREO), X Anamnesis (interrogatorio, peso/talla, alergias…, condición/prioridad/Glasgow/Trauma Score), XI Tratamiento (vía aérea, control cervical, asistencia ventilatoria, oxigenoterapia, descompresión, hemorragias, vías venosas, soluciones, tabla MANEJO FARMACOLÓGICO Y TERAPIA ELÉCTRICA, RCP/inmovilización/curación/vendaje).
  - Los grupos de casillas se generan iterando `SECCIONES` cuando el orden coincide con el papel; los bloques con layout especial (cronometría, silueta, tablas) son HTML dedicado.
- [ ] **Step 4: Correr tests** — PASS.
- [ ] **Step 5: Commit** — `feat: página 1 del PDF fiel al formato físico`.

### Task 4: PDF página 2 fiel al papel

**Files:**
- Modify: mismos de Task 3.
- Test: mismo spec.

**Interfaces:** usa los mismos helpers de Task 3. Se agrega `.salto` entre página 1 y 2.

- [ ] **Step 1: Tests** — página 2 renderiza: texto completo de la negativa ("Mediante la presente declaré que me niego a aceptar el (tratamiento) / (traslado)…"), líneas de firma paciente/testigo, tabla VEHÍCULOS INVOLUCRADOS con 4 filas (TIPO Y MARCA / PLACAS), "MATERIAL UTILIZADO" con todos los ítems del catálogo y casilla marcada + cantidad cuando el registro lo trae, pie con dirección "Calle Quinta Amalia # 107".
- [ ] **Step 2: Correr tests** — FALLAR.
- [ ] **Step 3: Implementación página 2** — grid 2 columnas arriba: izquierda XII Traslado (institución, condición/prioridad, bloque de negativa con texto legal y firmas, XIII Observaciones con 4 renglones celestes, XIV Sello MP con recuadro y "MINISTERIO PÚBLICO NOTIFICADO", "NOMBRE Y FIRMA DE QUIEN RECIBE"); derecha XV Datos Legales (autoridad, unidades, oficiales, tabla vehículos, posición del paciente, pertenencias, recibió pertenencias, compañía de seguro) y XVI Hospital Receptor (aceptación, firmas entrega/recibe). Abajo, ancho completo: MATERIAL UTILIZADO en cuadrícula de 3 columnas iterando `CATALOGO_MATERIAL` (nombre + `___` si `tieneMedida` + casilla/cantidad), pestañas laterales "CONSUMO MATERIAL". Pie negro con teléfonos, dirección y e-mail alineado a la derecha.
- [ ] **Step 4: Correr tests** — PASS.
- [ ] **Step 5: Commit** — `feat: página 2 del PDF fiel al formato físico`.

### Task 5: Verificación integral

- [ ] **Step 1:** `npx ng build` sin errores.
- [ ] **Step 2:** `npx ng test --watch=false --browsers=ChromeHeadless` en verde.
- [ ] **Step 3:** Revisión visual: servir la app, llenar campos de muestra, abrir vista previa de impresión y comparar contra las fotos (2 páginas, pestañas azules, casillas, tablas, material).
- [ ] **Step 4:** Commit final si hubo ajustes — `fix: ajustes visuales de impresión`.
