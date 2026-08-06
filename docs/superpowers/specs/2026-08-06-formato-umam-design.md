# Formato UMAM digital — diseño

**Fecha:** 2026-08-06
**Estado:** Aprobado (pendiente de revisión final del usuario sobre este documento)

## Objetivo

Reemplazar el llenado a mano del "Registro de Atención Prehospitalaria" de UMAM
(Unidad Móvil de Atención Médica, Cd. Juárez) por un formulario web en Angular,
fiel en contenido y colores al documento físico (2 caras), fácil y rápido de
llenar para el personal en campo ("las chicas" que hoy lo llenan a mano), con
exportación a PDF y a Excel que respetan el mismo diseño. La app debe quedar
lista para conectarse a un backend real más adelante, sin rediseñar los
componentes.

Es un demo funcional para uso interno, no un dispositivo médico certificado ni
un sistema con autenticación/multiusuario en esta entrega.

## Origen de los campos

Los campos se tomaron de dos fotos del formato físico de UMAM:
- Frente: folio, datos del servicio, datos del paciente, causa traumática,
  causa clínica, parto, evaluación inicial, evaluación secundaria, anamnesis,
  tratamiento.
- Reverso: traslado (incluye carta de negativa de atención), observaciones,
  sello de Ministerio Público, datos legales (autoridades, vehículos
  involucrados), hospital receptor, y el listado "Material Utilizado"
  (~90 insumos consumibles agrupados en 6 columnas, cada uno con casilla y,
  en varios casos, un campo de medida/cantidad).

Ambas caras del papel se muestran como **secciones dentro de una sola página**
en pantalla (no como "frente/reverso" separados), en el orden en que un
paramédico las usaría durante un servicio.

## Stack

- **Angular 22**, componentes standalone, Reactive Forms (`FormGroup` /
  `FormArray` anidados por sección).
- **Angular Material** para los controles (inputs, selects, checkboxes,
  radios, `mat-expansion-panel` para el acordeón). Tema personalizado con la
  paleta celeste/azul del documento UMAM en vez del morado por defecto.
- **exceljs** + **file-saver** para exportar `.xlsx` con relleno de color,
  encabezados combinados y secciones equivalentes al papel.
- **PDF vía impresión del navegador**: una vista de impresión dedicada
  (`@media print`) que reproduce el layout de las 2 páginas del documento;
  botón "Exportar PDF" dispara `window.print()` → el usuario elige
  "Guardar como PDF". Se evita cargar una librería pesada de generación de
  PDF; el resultado es texto real y nítido, no una captura de pantalla.

## Prioridad de UX: rapidez de llenado

Esta es la prioridad #1 explícita del usuario. Reglas de diseño:

- Inputs y áreas de toque grandes (mínimo 44px de alto), buen espaciado,
  tipografía legible en celular.
- Donde el papel ya define opciones fijas (checkboxes de una sola letra,
  listas de "agente causal", etc.) se usan checkboxes/radios/selects reales,
  nunca texto libre — menos que escribir, menos errores.
- Acordeón (`mat-expansion-panel`) con **todas las secciones abiertas por
  defecto**: nada de clics extra para llegar a la sección que se necesita,
  pero cada sección se puede colapsar si estorba.
- Barra de navegación lateral fija con anclas a cada sección (salta sin
  hacer scroll largo) — se colapsa a un menú desplegable en celular.
- Barra de acciones flotante siempre visible: "Guardar borrador" (autosave a
  localStorage cada pocos segundos, y al perder foco), "Exportar PDF",
  "Exportar Excel".
- Tablas repetibles (signos vitales por hora, manejo farmacológico, vehículos
  involucrados) usan `FormArray` con botón "+ agregar fila" en vez de
  obligar a llenar filas vacías.
- El listado "Material Utilizado" (~90 renglones) se agrupa por las mismas
  categorías del papel, con casilla + campo de cantidad/medida inline;
  incluye un buscador/filtro de texto arriba de la lista para no tener que
  scrollear entre 90 ítems buscando uno.

## Decisiones de alcance para elementos no triviales del papel (v1)

- **Firmas** (paciente, testigo, quien entrega/recibe, oficiales): se
  capturan como campo de texto (nombre) en vez de firma dibujada a mano. Una
  futura iteración podría agregar un canvas de firma; queda fuera de esta
  entrega.
- **Diagrama de cuerpo / zonas de lesión**: en vez de un dibujo clicable, se
  usa una lista de checkboxes por zona corporal (cabeza, tórax anterior/
  posterior, abdomen, brazo izq/der, pierna izq/der, etc.) cruzada con el
  tipo de hallazgo (D, CO, A, P, MP, C, H, F, ES, Q, L, E, AS, AM, DO). Más
  rápido de llenar en pantalla que un mapa gráfico.
- **Sello de Ministerio Público**: campo de texto libre (folio/referencia),
  no una imagen de sello.

Si alguno de estos tres puntos no es aceptable, se puede ajustar antes de
pasar a implementación.

## Arquitectura y capa de servicios (preparado para backend)

```
RegistroService (interfaz abstracta)
  guardar(registro): Promise<Registro>
  obtener(id): Promise<Registro>
  listar(): Promise<Registro[]>
  eliminar(id): Promise<void>

LocalStorageRegistroService implements RegistroService   ← usado hoy
ApiRegistroService implements RegistroService             ← se agrega después,
                                                              solo cambia el
                                                              provider en
                                                              app.config.ts
```

Los componentes de formulario dependen únicamente de la interfaz
`RegistroService` (inyectada por token), nunca de la implementación
concreta. Cambiar de localStorage a una API real no toca ningún componente.

## Estructura de carpetas

```
umam-formato/
  src/app/
    core/
      models/registro.model.ts        (interfaces de todas las secciones)
      services/registro.service.ts    (token + interfaz)
      services/registro-local-storage.service.ts
    features/formulario/
      secciones/
        datos-servicio, datos-paciente, causa-traumatica, causa-clinica,
        parto, evaluacion-inicial, evaluacion-secundaria, anamnesis,
        tratamiento, traslado, datos-legales, hospital-receptor,
        material-utilizado          (un componente standalone por sección)
      formulario.component.ts       (orquesta el FormGroup raíz + acordeón +
                                      nav lateral + autosave)
    features/exportacion/
      pdf-vista/                    (componente de layout imprimible)
      excel-exporter.service.ts
    shared/
      theme/                        (paleta de colores UMAM para Material)
      data/material-utilizado.data.ts  (catálogo de los ~90 insumos)
```

## Modelo de datos

Una interfaz raíz `RegistroAtencionPrehospitalaria` compuesta por
sub-interfaces por sección (`DatosServicio`, `DatosPaciente`,
`CausaTraumatica`, `CausaClinica`, `Parto`, `EvaluacionInicial`,
`EvaluacionSecundaria`, `Anamnesis`, `Tratamiento`, `Traslado`,
`DatosLegales`, `HospitalReceptor`, `MaterialUtilizado`), enumerando todos
los campos identificados en las dos fotos (incluye folio, cronometría,
checkboxes de agente causal/origen probable/lugar de ocurrencia, tabla de
signos vitales repetible, tabla de manejo farmacológico repetible, tabla de
vehículos involucrados repetible, y el catálogo de material utilizado como
lista de `{ nombre, categoria, marcado, cantidad? }`). El detalle campo por
campo se termina de fijar en el plan de implementación, no en este
documento.

## Exportación

- **PDF**: vista de impresión que reproduce las 2 páginas del papel
  (encabezados en azul, tablas con bordes, mismo orden de secciones);
  `window.print()`. Funciona offline, sin dependencias nuevas.
- **Excel**: un libro `.xlsx` con una hoja que refleja las secciones del
  papel (encabezados con relleno azul, texto en negro/blanco según
  contraste, columnas con el mismo ancho relativo), generado con `exceljs`
  en el navegador y descargado con `file-saver`. Incluye el listado de
  material utilizado como tabla aparte dentro del mismo libro.

## Verificación

- `ng build` sin errores.
- Prueba manual: llenar el formulario completo (incluye al menos una fila en
  cada tabla repetible y varios ítems de material utilizado), guardar
  borrador, recargar la página y confirmar que los datos persisten
  (localStorage), exportar PDF y Excel y confirmar visualmente que
  respetan el diseño y contienen los datos capturados.

## Fuera de alcance

Autenticación, backend real, listado/búsqueda de múltiples registros
guardados, firma dibujada a mano, diagrama de cuerpo gráfico interactivo,
validación clínica avanzada, soporte offline tipo PWA.
