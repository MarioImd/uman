# Formato UMAM Digital — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an Angular 22 standalone app that reproduces UMAM's "Registro de Atención Prehospitalaria" (both sides of the paper form) as an easy-to-fill web form, with PDF and Excel export matching the document's design, and a service layer ready to swap localStorage for a real backend later.

**Architecture:** A declarative, data-driven form: each paper section is described as a `SeccionFormulario` config (list of `CampoFormulario` + optional repeatable tables), rendered by two generic components (`CampoFormularioComponent` for a single field, `TablaRepetibleComponent` for repeatable rows) inside `mat-expansion-panel` accordion sections. One root reactive `FormGroup` is built from all section configs by a factory function. A `RegistroService` interface abstracts persistence (localStorage today, HTTP later). Export is two independent features reading the same section configs + form value: a print-CSS view for PDF, and an `exceljs`-based workbook builder for Excel.

**Tech Stack:** Angular 22 (standalone components, Reactive Forms), Angular Material (UMAM blue theme), TypeScript, exceljs + file-saver, Karma/Jasmine (default Angular CLI test runner).

## Global Constraints

- Project root: `C:\Users\mario.moreno\Desktop\umam-formato` (git repo already initialized; `docs/superpowers/specs/2026-08-06-formato-umam-design.md` already committed).
- No backend in this delivery — `RegistroService` must be an interface with a localStorage implementation only; nothing may depend directly on `LocalStorageRegistroService`, only on the `RegistroService` injection token.
- Signatures = text fields (name), not drawn signatures. Body-zone lesions = checkbox list, not a clickable diagram. MP seal = text field. (Per approved spec.)
- Every touch target (input, checkbox, button) must be comfortably tappable on a phone — use Angular Material defaults (already ≥44px) and do not override to smaller.
- Date/time fields use native `<input type="date">` / `<input type="time">` inside `<mat-form-field>` — no MatDatepicker/date-adapter dependency, to keep setup simple.
- Commit after every task.

---

## File Structure

```
umam-formato/
  src/app/
    core/
      models/
        campo-formulario.model.ts       (Task 2)
        registro.model.ts               (Task 2)
      data/
        secciones.data.ts               (Task 3 — 12 non-material sections)
        material-utilizado.data.ts      (Task 4 — ~90-item catalog)
      forms/
        construir-formulario.ts         (Task 5 — FormGroup factory)
      services/
        registro.service.ts             (Task 10 — interface + injection token)
        registro-local-storage.service.ts (Task 10)
    shared/
      theme/
        umam-theme.scss                 (Task 1)
      campo-formulario/
        campo-formulario.component.ts   (Task 6)
      tabla-repetible/
        tabla-repetible.component.ts    (Task 7)
      seccion-acordeon/
        seccion-acordeon.component.ts   (Task 8)
    features/
      material-utilizado/
        material-utilizado.component.ts (Task 9)
      formulario/
        formulario.component.ts         (Task 11)
      exportacion/
        pdf-vista/
          pdf-vista.component.ts        (Task 12)
        excel-exportador.service.ts     (Task 13)
    app.component.ts                    (Task 14)
    app.config.ts                       (Task 1, edited Task 10)
```

---

### Task 1: Scaffold Angular workspace, Material, and UMAM theme

**Files:**
- Create: entire Angular workspace at `C:\Users\mario.moreno\Desktop\umam-formato` (merged from a temp subfolder)
- Create: `src/app/shared/theme/umam-theme.scss`
- Modify: `src/styles.scss`

**Interfaces:**
- Produces: a working `ng build` and `ng test` pipeline that every later task relies on.

- [ ] **Step 1: Scaffold the workspace in a temp subfolder (the project root already has `docs/` and `.git`, so `ng new` can't target it directly)**

Run in PowerShell from `C:\Users\mario.moreno\Desktop\umam-formato`:

```powershell
ng new app-tmp --directory app-tmp --routing=false --style=scss --ssr=false --zoneless=false --skip-git --package-manager=npm --ai-config=none --defaults
```

- [ ] **Step 2: Merge the generated workspace into the project root, then remove the temp folder**

```powershell
Get-ChildItem -Path .\app-tmp -Force | Move-Item -Destination . -Force
Remove-Item .\app-tmp -Recurse -Force
```

- [ ] **Step 3: Verify the base app builds and tests run**

```powershell
npm install
npx ng build
npx ng test --watch=false --browsers=ChromeHeadless
```

Expected: build succeeds, default `app.component.spec.ts` test passes.

- [ ] **Step 4: Add Angular Material with a custom theme**

```powershell
npx ng add @angular/material --theme=custom --typography=true --animations=enabled --skip-confirmation
```

If any flag is rejected (schematic option names can shift between CLI versions), run `npx ng add @angular/material --help` first inside this workspace to confirm the exact flag names before retrying — do not fall back to answering prompts by guesswork, use the `--help` output.

- [ ] **Step 5: Write the UMAM color theme**

Create `src/app/shared/theme/umam-theme.scss`:

```scss
@use '@angular/material' as mat;

// Theme driven by Angular Material's M3 blue palette (current Material major
// version expects M3 palettes, not a hand-rolled M2 map). The custom
// properties below are the actual colors sampled from the UMAM paper form
// (celeste/blue section headers and table fills) and are what the rest of
// the app's raw CSS (print view, section headers) reads from — keep them in
// sync with $blue-palette's 500-ish tone if the Material theme ever changes.
$umam-theme: mat.define-theme((
  color: (
    theme-type: light,
    primary: mat.$blue-palette,
    tertiary: mat.$cyan-palette,
  ),
  density: (scale: 0),
));

:root {
  @include mat.all-component-themes($umam-theme);
  --umam-header-bg: #1892d3;
  --umam-header-fg: #ffffff;
  --umam-section-border: #b9def2;
}
```

- [ ] **Step 6: Import the theme in global styles**

Edit `src/styles.scss`, add at the top:

```scss
@use './app/shared/theme/umam-theme';
```

- [ ] **Step 7: Verify build still passes**

```powershell
npx ng build
```

Expected: success, no missing-theme errors.

- [ ] **Step 8: Commit**

```powershell
git add -A
git commit -m "chore: scaffold Angular workspace with Angular Material and UMAM theme

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Core data models

**Files:**
- Create: `src/app/core/models/campo-formulario.model.ts`
- Create: `src/app/core/models/registro.model.ts`
- Test: `src/app/core/models/registro.model.spec.ts`

**Interfaces:**
- Produces: `CampoFormulario`, `TipoCampo`, `TablaRepetible`, `SeccionFormulario` (consumed by Tasks 3–9, 11–13); `RegistroAtencionPrehospitalaria` and `crearRegistroVacio()` (consumed by Tasks 5, 10, 11).

- [ ] **Step 1: Write `campo-formulario.model.ts`**

```typescript
export type TipoCampo =
  | 'texto'
  | 'numero'
  | 'fecha'
  | 'hora'
  | 'textarea'
  | 'checkbox'
  | 'checkbox-grupo'
  | 'radio-grupo'
  | 'select';

export interface CampoFormulario {
  clave: string;
  etiqueta: string;
  tipo: TipoCampo;
  opciones?: string[];
  sufijo?: string;
}

export interface TablaRepetible {
  clave: string;
  titulo: string;
  columnas: CampoFormulario[];
}

export interface SeccionFormulario {
  clave: string;
  titulo: string;
  campos: CampoFormulario[];
  tablas?: TablaRepetible[];
}
```

- [ ] **Step 2: Write the failing test for `crearRegistroVacio`**

Create `src/app/core/models/registro.model.spec.ts`:

```typescript
import { crearRegistroVacio } from './registro.model';

describe('crearRegistroVacio', () => {
  it('crea un registro con id, fechaCreacion y todas las secciones top-level presentes', () => {
    const registro = crearRegistroVacio();

    expect(registro.id).toBeTruthy();
    expect(registro.fechaCreacion).toBeTruthy();
    expect(registro.folio).toBe('');
    expect(registro.materialUtilizado).toEqual({});
    expect(registro.signosVitales).toEqual([]);
    expect(registro.manejoFarmacologico).toEqual([]);
    expect(registro.vehiculosInvolucrados).toEqual([]);
  });

  it('genera un id distinto en cada llamada', () => {
    const a = crearRegistroVacio();
    const b = crearRegistroVacio();
    expect(a.id).not.toBe(b.id);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```powershell
npx ng test --watch=false --browsers=ChromeHeadless
```

Expected: FAIL — `registro.model.ts` does not exist yet / no export `crearRegistroVacio`.

- [ ] **Step 4: Write `registro.model.ts`**

```typescript
export interface RegistroAtencionPrehospitalaria {
  id: string;
  fechaCreacion: string;
  estado: string;
  ciudad: string;
  folio: string;

  // Secciones cuyos campos vienen de secciones.data.ts (Record<clave, valor>)
  datosServicio: Record<string, unknown>;
  control: Record<string, unknown>;
  datosPaciente: Record<string, unknown>;
  causaTraumatica: Record<string, unknown>;
  causaClinica: Record<string, unknown>;
  parto: Record<string, unknown>;
  evaluacionInicial: Record<string, unknown>;
  evaluacionSecundaria: Record<string, unknown>;
  anamnesis: Record<string, unknown>;
  tratamiento: Record<string, unknown>;
  traslado: Record<string, unknown>;
  observaciones: Record<string, unknown>;
  datosLegales: Record<string, unknown>;
  hospitalReceptor: Record<string, unknown>;

  // Tablas repetibles (una fila = un Record<claveColumna, valor>)
  signosVitales: Record<string, unknown>[];
  manejoFarmacologico: Record<string, unknown>[];
  vehiculosInvolucrados: Record<string, unknown>[];

  // Material utilizado: clave del ítem del catálogo -> { marcado, cantidad? }
  materialUtilizado: Record<string, { marcado: boolean; cantidad?: string }>;
}

export function crearRegistroVacio(): RegistroAtencionPrehospitalaria {
  return {
    id: crypto.randomUUID(),
    fechaCreacion: new Date().toISOString(),
    estado: '',
    ciudad: '',
    folio: '',
    datosServicio: {},
    control: {},
    datosPaciente: {},
    causaTraumatica: {},
    causaClinica: {},
    parto: {},
    evaluacionInicial: {},
    evaluacionSecundaria: {},
    anamnesis: {},
    tratamiento: {},
    traslado: {},
    observaciones: {},
    datosLegales: {},
    hospitalReceptor: {},
    signosVitales: [],
    manejoFarmacologico: [],
    vehiculosInvolucrados: [],
    materialUtilizado: {},
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

```powershell
npx ng test --watch=false --browsers=ChromeHeadless
```

Expected: PASS (2 specs).

- [ ] **Step 6: Commit**

```powershell
git add -A
git commit -m "feat: add core data models for registro and campo config

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Section field configs (the 12 non-material sections)

**Files:**
- Create: `src/app/core/data/secciones.data.ts`
- Test: `src/app/core/data/secciones.data.spec.ts`

**Interfaces:**
- Consumes: `SeccionFormulario`, `CampoFormulario`, `TablaRepetible` from `campo-formulario.model.ts` (Task 2).
- Produces: `SECCIONES: SeccionFormulario[]` (consumed by Tasks 5, 8, 11, 13).

- [ ] **Step 1: Write the failing test**

Create `src/app/core/data/secciones.data.spec.ts`:

```typescript
import { SECCIONES } from './secciones.data';

describe('SECCIONES', () => {
  it('define las 12 secciones del formulario (excluye material utilizado)', () => {
    expect(SECCIONES.length).toBe(12);
    const claves = SECCIONES.map(s => s.clave);
    expect(claves).toEqual([
      'datosServicio', 'control', 'datosPaciente', 'causaTraumatica',
      'causaClinica', 'parto', 'evaluacionInicial', 'evaluacionSecundaria',
      'anamnesis', 'tratamiento', 'traslado', 'observaciones',
    ]);
  });

  it('cada sección tiene título y al menos un campo o una tabla', () => {
    for (const seccion of SECCIONES) {
      expect(seccion.titulo).toBeTruthy();
      const tieneCampos = seccion.campos.length > 0;
      const tieneTablas = (seccion.tablas ?? []).length > 0;
      expect(tieneCampos || tieneTablas).toBeTrue();
    }
  });

  it('evaluacionSecundaria trae la tabla de signos vitales con sus columnas', () => {
    const seccion = SECCIONES.find(s => s.clave === 'evaluacionSecundaria')!;
    const tabla = seccion.tablas!.find(t => t.clave === 'signosVitales')!;
    expect(tabla.columnas.map(c => c.clave)).toEqual([
      'hora', 'fr', 'fc', 'tas', 'tad', 'spo2', 'temp', 'gluc', 'ekg', 'examenNeurologico',
    ]);
  });

  it('tratamiento trae la tabla de manejo farmacológico', () => {
    const seccion = SECCIONES.find(s => s.clave === 'tratamiento')!;
    const tabla = seccion.tablas!.find(t => t.clave === 'manejoFarmacologico')!;
    expect(tabla.columnas.map(c => c.clave)).toEqual([
      'hora', 'medicamento', 'dosis', 'viaAdministracion', 'terapiaElectrica',
    ]);
  });

  it('datosLegales trae la tabla de vehículos involucrados', () => {
    const seccion = SECCIONES.find(s => s.clave === 'datosLegales')!;
    const tabla = seccion.tablas!.find(t => t.clave === 'vehiculosInvolucrados')!;
    expect(tabla.columnas.map(c => c.clave)).toEqual(['tipoMarca', 'placas']);
  });
});
```

Note: `traslado` also needs `datosLegales` and `hospitalReceptor` — the top-level list above only has 12 entries because `datosLegales` and `hospitalReceptor` are included; recount: datosServicio, control, datosPaciente, causaTraumatica, causaClinica, parto, evaluacionInicial, evaluacionSecundaria, anamnesis, tratamiento, traslado, observaciones, datosLegales, hospitalReceptor = **14** sections. Fix the test's expected array and count to 14 before running it (the array above is corrected in Step 4's implementation — update the spec's `expect(SECCIONES.length).toBe(14)` and the `claves` array to include `'datosLegales'` and `'hospitalReceptor'` at the end).

- [ ] **Step 2: Run test to verify it fails**

```powershell
npx ng test --watch=false --browsers=ChromeHeadless
```

Expected: FAIL — `secciones.data.ts` does not exist.

- [ ] **Step 3: Write `secciones.data.ts`**

```typescript
import { SeccionFormulario } from '../models/campo-formulario.model';

export const SECCIONES: SeccionFormulario[] = [
  {
    clave: 'datosServicio',
    titulo: 'II. Datos del Servicio',
    campos: [
      { clave: 'fecha', etiqueta: 'Fecha', tipo: 'fecha' },
      { clave: 'diaSemana', etiqueta: 'Día de la semana', tipo: 'texto' },
      { clave: 'horaLlamada', etiqueta: 'Hora de llamada', tipo: 'hora' },
      { clave: 'horaSalida', etiqueta: 'Hora de salida', tipo: 'hora' },
      { clave: 'horaLlegada', etiqueta: 'Hora de llegada', tipo: 'hora' },
      { clave: 'horaTraslado', etiqueta: 'Hora de traslado', tipo: 'hora' },
      { clave: 'horaHospital', etiqueta: 'Hora de hospital', tipo: 'hora' },
      { clave: 'horaLiberacion', etiqueta: 'Hora de liberación', tipo: 'hora' },
      { clave: 'motivoAtencion', etiqueta: 'Motivo de la atención', tipo: 'radio-grupo', opciones: ['Enfermedad', 'Traumatismo', 'Gineco-Obstétrico'] },
      { clave: 'calle', etiqueta: 'Calle', tipo: 'texto' },
      { clave: 'entreCalle1', etiqueta: 'Entre calle', tipo: 'texto' },
      { clave: 'entreCalle2', etiqueta: 'Y calle', tipo: 'texto' },
      { clave: 'colonia', etiqueta: 'Colonia / Comunidad', tipo: 'texto' },
      { clave: 'delegacionMunicipio', etiqueta: 'Delegación política / Municipio', tipo: 'texto' },
      { clave: 'lugarOcurrencia', etiqueta: 'Lugar de la ocurrencia', tipo: 'checkbox-grupo', opciones: ['Hogar', 'Vía pública', 'Trabajo', 'Escuela', 'Deporte y recreación', 'Transporte público', 'Otro'] },
      { clave: 'lugarOcurrenciaOtro', etiqueta: 'Otro (especifique)', tipo: 'texto' },
    ],
  },
  {
    clave: 'control',
    titulo: 'III. Control',
    campos: [
      { clave: 'ambulanciaIniciales', etiqueta: 'Iniciales de ambulancia', tipo: 'texto' },
      { clave: 'ambulanciaNumero', etiqueta: 'Número de ambulancia', tipo: 'texto' },
      { clave: 'operador', etiqueta: 'Operador', tipo: 'texto' },
      { clave: 'prestadoresServicio', etiqueta: 'Prestadores del servicio', tipo: 'texto' },
    ],
  },
  {
    clave: 'datosPaciente',
    titulo: 'IV. Datos del Paciente',
    campos: [
      { clave: 'nombreOMediaFiliacion', etiqueta: 'Nombre o media filiación', tipo: 'texto' },
      { clave: 'sexo', etiqueta: 'Sexo', tipo: 'select', opciones: ['Masculino', 'Femenino'] },
      { clave: 'edadAnios', etiqueta: 'Edad (años)', tipo: 'numero' },
      { clave: 'edadMeses', etiqueta: 'Menores de 1 año (meses)', tipo: 'numero' },
      { clave: 'lugarNacimiento', etiqueta: 'Lugar de nacimiento', tipo: 'texto' },
      { clave: 'fechaNacimiento', etiqueta: 'Fecha de nacimiento', tipo: 'fecha' },
      { clave: 'colonia', etiqueta: 'Colonia / Comunidad', tipo: 'texto' },
      { clave: 'delegacionMunicipio', etiqueta: 'Delegación política / Municipio', tipo: 'texto' },
      { clave: 'telefono', etiqueta: 'Teléfono', tipo: 'texto' },
      { clave: 'ocupacion', etiqueta: 'Ocupación', tipo: 'texto' },
      { clave: 'derechohabienteA', etiqueta: 'Derechohabiente a', tipo: 'texto' },
      { clave: 'companiaSeguroGastosMedicos', etiqueta: 'Compañía de seguro de gastos médicos mayores', tipo: 'texto' },
    ],
  },
  {
    clave: 'causaTraumatica',
    titulo: 'V. Causa Traumática',
    campos: [
      { clave: 'agenteCausal', etiqueta: 'Agente causal', tipo: 'checkbox-grupo', opciones: ['Automotor', 'Bicicleta', 'Maquinaria', 'Herramienta', 'Fuego', 'Sustancia caliente', 'Sustancia tóxica', 'Electricidad', 'Explosión', 'Producto biológico', 'Arma', 'Juguete', 'Ser humano', 'Animal', 'Otro'] },
      { clave: 'agenteCausalEspecifique', etiqueta: 'Especifique', tipo: 'texto' },
      { clave: 'lesionesCausadasPor', etiqueta: 'Lesiones causadas por', tipo: 'texto' },
      { clave: 'accidenteAutomovilistico', etiqueta: 'Accidente automovilístico', tipo: 'checkbox-grupo', opciones: ['Colisión', 'Volcadura', 'Automotor', 'Motocicleta', 'Bicicleta', 'Maquinaria'] },
      { clave: 'contraObjeto', etiqueta: 'Contra objeto', tipo: 'radio-grupo', opciones: ['Fijo', 'En movimiento'] },
      { clave: 'impacto', etiqueta: 'Impacto', tipo: 'radio-grupo', opciones: ['Frontal', 'Lateral', 'Posterior'] },
      { clave: 'hundimientoCms', etiqueta: 'Hundimiento', tipo: 'numero', sufijo: 'cm' },
      { clave: 'parabrisas', etiqueta: 'Parabrisas', tipo: 'radio-grupo', opciones: ['Íntegro', 'Roto/Doblado'] },
      { clave: 'volante', etiqueta: 'Volante', tipo: 'radio-grupo', opciones: ['Íntegro', 'Doblado'] },
      { clave: 'bolsasAire', etiqueta: 'Bolsas de aire', tipo: 'radio-grupo', opciones: ['Sí', 'No'] },
      { clave: 'cinturonSeguridad', etiqueta: 'Cinturón de seguridad', tipo: 'radio-grupo', opciones: ['Colocado', 'No colocado'] },
      { clave: 'dentroVehiculo', etiqueta: 'Dentro del vehículo', tipo: 'radio-grupo', opciones: ['Sí', 'No'] },
      { clave: 'eyectado', etiqueta: 'Eyectado', tipo: 'checkbox' },
      { clave: 'atropellado', etiqueta: 'Atropellado por', tipo: 'checkbox-grupo', opciones: ['Automotor', 'Motocicleta', 'Bicicleta', 'Maquinaria'] },
    ],
  },
  {
    clave: 'causaClinica',
    titulo: 'VI. Causa Clínica',
    campos: [
      { clave: 'origenProbable', etiqueta: 'Origen probable', tipo: 'checkbox-grupo', opciones: ['Metabólico', 'Respiratorio', 'Cardiovascular', 'Neurológico', 'Urogenital', 'Gineco-obstétrico', 'Digestivo', 'Psico-emotivo', 'Oncológico', 'Infeccioso', 'Músculo esquelético', 'Otro'] },
      { clave: 'origenProbableEspecifique', etiqueta: 'Especifique', tipo: 'texto' },
      { clave: 'primeraVez', etiqueta: '1era vez', tipo: 'radio-grupo', opciones: ['Sí', 'No'] },
      { clave: 'subsecuente', etiqueta: 'Subsecuente', tipo: 'texto' },
    ],
  },
  {
    clave: 'parto',
    titulo: 'VII. Parto',
    campos: [
      { clave: 'gesta', etiqueta: 'Gesta', tipo: 'numero' },
      { clave: 'cesarea', etiqueta: 'Cesárea', tipo: 'numero' },
      { clave: 'para', etiqueta: 'Para', tipo: 'numero' },
      { clave: 'abortos', etiqueta: 'Abortos', tipo: 'numero' },
      { clave: 'semanaGestacion', etiqueta: 'Semana de gestación', tipo: 'numero' },
      { clave: 'fechaProbableParto', etiqueta: 'Fecha probable de parto', tipo: 'fecha' },
      { clave: 'membranas', etiqueta: 'Membranas', tipo: 'texto' },
      { clave: 'horaInicioContracciones', etiqueta: 'Hora de inicio de contracciones', tipo: 'hora' },
      { clave: 'frecuenciaContracciones', etiqueta: 'Frecuencia', tipo: 'texto' },
      { clave: 'duracionContracciones', etiqueta: 'Duración', tipo: 'texto' },
      { clave: 'horaNacimiento', etiqueta: 'Hora de nacimiento', tipo: 'hora' },
      { clave: 'lugarNacimientoParto', etiqueta: 'Lugar', tipo: 'texto' },
      { clave: 'placentaExpulsada', etiqueta: 'Placenta expulsada', tipo: 'radio-grupo', opciones: ['Sí', 'No'] },
      { clave: 'productoVivoMuerto', etiqueta: 'Producto', tipo: 'radio-grupo', opciones: ['Vivo', 'Muerto'] },
      { clave: 'sexoRecienNacido', etiqueta: 'Sexo del recién nacido', tipo: 'radio-grupo', opciones: ['Masculino', 'Femenino'] },
      { clave: 'apgar1min', etiqueta: 'APGAR 1 min', tipo: 'numero' },
      { clave: 'apgar5min', etiqueta: 'APGAR 5 min', tipo: 'numero' },
      { clave: 'apgar10min', etiqueta: 'APGAR 10 min', tipo: 'numero' },
      { clave: 'silverman1min', etiqueta: 'Silverman 1 min', tipo: 'numero' },
      { clave: 'silverman5min', etiqueta: 'Silverman 5 min', tipo: 'numero' },
    ],
  },
  {
    clave: 'evaluacionInicial',
    titulo: 'VIII. Evaluación Inicial',
    campos: [
      { clave: 'nivelConciencia', etiqueta: 'Nivel de conciencia', tipo: 'radio-grupo', opciones: ['Consciente', 'Respuesta a estímulo verbal', 'Respuesta a estímulo doloroso', 'Inconsciente'] },
      { clave: 'viaAerea', etiqueta: 'Vía aérea', tipo: 'radio-grupo', opciones: ['Permeable', 'Comprometida'] },
      { clave: 'reflejoDeglucion', etiqueta: 'Reflejo de deglución', tipo: 'radio-grupo', opciones: ['Presente', 'Ausente'] },
      { clave: 'ventilacionObservacion', etiqueta: 'Ventilación — observación', tipo: 'checkbox-grupo', opciones: ['Automatismo regular', 'Automatismo irregular', 'Ventilación rápida', 'Ventilación lenta', 'Ventilación profunda', 'Ventilación superficial', 'Apnea'] },
      { clave: 'ventilacionAuscultacion', etiqueta: 'Ventilación — auscultación', tipo: 'checkbox-grupo', opciones: ['Ruidos respiratorios normales', 'Ruidos respiratorios disminuidos', 'Ruidos respiratorios anormales', 'Ruidos respiratorios ausentes'] },
      { clave: 'alternacionesLocalizadas', etiqueta: 'Alternaciones localizadas en', tipo: 'checkbox-grupo', opciones: ['Hemitórax derecho', 'Hemitórax izquierdo', 'Ápices', 'Bases'] },
      { clave: 'presenciaPulsos', etiqueta: 'Presencia de pulsos', tipo: 'checkbox-grupo', opciones: ['Carotídeo', 'Radial'] },
      { clave: 'calidadPulso', etiqueta: 'Calidad del pulso', tipo: 'checkbox-grupo', opciones: ['Rápido', 'Lento', 'Rítmico', 'Arrítmico'] },
      { clave: 'paroCardiorespiratorio', etiqueta: 'Paro cardiorespiratorio', tipo: 'checkbox' },
      { clave: 'piel', etiqueta: 'Piel', tipo: 'checkbox-grupo', opciones: ['Normal', 'Rojiza', 'Pálida', 'Cianótica'] },
      { clave: 'caracteristicasPiel', etiqueta: 'Características de la piel', tipo: 'checkbox-grupo', opciones: ['Húmeda', 'Seca', 'Normal'] },
      { clave: 'temperaturaComparativa', etiqueta: 'Temperatura comparativa', tipo: 'checkbox-grupo', opciones: ['Normal', 'Caliente', 'Fría'] },
    ],
  },
  {
    clave: 'evaluacionSecundaria',
    titulo: 'IX. Evaluación Secundaria',
    campos: [
      { clave: 'exploracionFisica', etiqueta: 'Exploración física', tipo: 'checkbox-grupo', opciones: ['Deformaciones', 'Contusiones', 'Abrasiones', 'Penetraciones', 'Movimientos paradójicos', 'Crepitación', 'Heridas', 'Fracturas', 'Enfisema subcutáneo', 'Quemaduras', 'Laceraciones', 'Edema', 'Alteraciones de sensibilidad', 'Alteraciones de movilidad', 'Dolor'] },
      { clave: 'zonasLesion', etiqueta: 'Zonas de lesión', tipo: 'checkbox-grupo', opciones: ['Cabeza', 'Cuello', 'Tórax anterior', 'Tórax posterior', 'Abdomen', 'Pelvis', 'Brazo izquierdo', 'Brazo derecho', 'Antebrazo izquierdo', 'Antebrazo derecho', 'Mano izquierda', 'Mano derecha', 'Muslo izquierdo', 'Muslo derecho', 'Pierna izquierda', 'Pierna derecha', 'Pie izquierdo', 'Pie derecho', 'Espalda'] },
      { clave: 'pupilas', etiqueta: 'Pupilas', tipo: 'checkbox-grupo', opciones: ['Normales', 'Midriáticas', 'Mióticas', 'Anisocóricas', 'Arreactivas'] },
    ],
    tablas: [
      {
        clave: 'signosVitales',
        titulo: 'Signos vitales y monitoreo',
        columnas: [
          { clave: 'hora', etiqueta: 'Hora', tipo: 'hora' },
          { clave: 'fr', etiqueta: 'FR', tipo: 'numero' },
          { clave: 'fc', etiqueta: 'FC', tipo: 'numero' },
          { clave: 'tas', etiqueta: 'TAS', tipo: 'numero' },
          { clave: 'tad', etiqueta: 'TAD', tipo: 'numero' },
          { clave: 'spo2', etiqueta: 'SpO2', tipo: 'numero' },
          { clave: 'temp', etiqueta: 'TEMP', tipo: 'numero' },
          { clave: 'gluc', etiqueta: 'GLUC', tipo: 'numero' },
          { clave: 'ekg', etiqueta: 'EKG', tipo: 'texto' },
          { clave: 'examenNeurologico', etiqueta: 'Examen neurológico', tipo: 'select', opciones: ['A', 'V', 'D', 'I'] },
        ],
      },
    ],
  },
  {
    clave: 'anamnesis',
    titulo: 'X. Anamnesis',
    campos: [
      { clave: 'interrogatorio', etiqueta: 'Interrogatorio', tipo: 'radio-grupo', opciones: ['Directo', 'Indirecto'] },
      { clave: 'peso', etiqueta: 'Peso', tipo: 'numero', sufijo: 'kg' },
      { clave: 'talla', etiqueta: 'Talla', tipo: 'numero', sufijo: 'cm' },
      { clave: 'alergias', etiqueta: 'Alergias', tipo: 'textarea' },
      { clave: 'medicamentos', etiqueta: 'Medicamentos', tipo: 'textarea' },
      { clave: 'enfermedadesCirugiasPrevias', etiqueta: 'Enfermedades y/o cirugías previas', tipo: 'textarea' },
      { clave: 'horaUltimaComida', etiqueta: 'Hora de última comida', tipo: 'hora' },
      { clave: 'eventosPreviosRelacionados', etiqueta: 'Eventos previos relacionados', tipo: 'textarea' },
      { clave: 'condicionPaciente', etiqueta: 'Condición del paciente', tipo: 'radio-grupo', opciones: ['Crítico', 'No crítico'] },
      { clave: 'estabilidadPaciente', etiqueta: 'Estabilidad', tipo: 'radio-grupo', opciones: ['Inestable', 'Estable'] },
      { clave: 'prioridad', etiqueta: 'Prioridad', tipo: 'radio-grupo', opciones: ['Rojo', 'Amarillo', 'Verde', 'Negro'] },
      { clave: 'glasgowOcular', etiqueta: 'Glasgow — ocular', tipo: 'numero' },
      { clave: 'glasgowVerbal', etiqueta: 'Glasgow — verbal', tipo: 'numero' },
      { clave: 'glasgowMotora', etiqueta: 'Glasgow — motora', tipo: 'numero' },
      { clave: 'glasgowTotal', etiqueta: 'Glasgow — total', tipo: 'numero' },
      { clave: 'traumaScoreTas', etiqueta: 'Trauma score — TAS', tipo: 'numero' },
      { clave: 'traumaScoreFr', etiqueta: 'Trauma score — FR', tipo: 'numero' },
      { clave: 'traumaScoreTotal', etiqueta: 'Trauma score — total', tipo: 'numero' },
    ],
  },
  {
    clave: 'tratamiento',
    titulo: 'XI. Tratamiento',
    campos: [
      { clave: 'viaAereaTratamiento', etiqueta: 'Vía aérea', tipo: 'checkbox-grupo', opciones: ['Aspiración', 'Cánula orofaríngea', 'Cánula nasofaríngea', 'Intubación endotraqueal', 'Intubación nasotraqueal', 'Dispositivo supraglótico', 'Vía aérea quirúrgica'] },
      { clave: 'controlCervical', etiqueta: 'Control cervical', tipo: 'radio-grupo', opciones: ['Manual', 'Collarín rígido', 'Collarín blando'] },
      { clave: 'asistenciaVentilatoria', etiqueta: 'Asistencia ventilatoria', tipo: 'checkbox-grupo', opciones: ['Balón-válvula mascarilla', 'Válvula de demanda', 'Ventilador automático'] },
      { clave: 'frecuenciaVentilatoria', etiqueta: 'Frecuencia', tipo: 'numero' },
      { clave: 'volumenVentilatorio', etiqueta: 'Volumen', tipo: 'numero' },
      { clave: 'peep', etiqueta: 'PEEP', tipo: 'numero' },
      { clave: 'presionVentilatoria', etiqueta: 'Presión', tipo: 'numero' },
      { clave: 'modoVentilatorio', etiqueta: 'Modo ventilatorio', tipo: 'texto' },
      { clave: 'oxigenoterapia', etiqueta: 'Oxigenoterapia', tipo: 'checkbox-grupo', opciones: ['Puntas nasales', 'Mascarilla simple', 'Mascarilla con reservorio', 'Mascarilla venturi'] },
      { clave: 'litrosPorMinuto', etiqueta: 'Lts x min', tipo: 'numero' },
      { clave: 'descompresionPleural', etiqueta: 'Descompresión pleural', tipo: 'checkbox-grupo', opciones: ['Hemitórax derecho', 'Hemitórax izquierdo'] },
      { clave: 'controlHemorragias', etiqueta: 'Control de hemorragias', tipo: 'checkbox-grupo', opciones: ['Presión directa', 'Vendaje compresivo', 'Torniquete', 'Empaquetamiento de herida', 'Pinzamiento de vaso'] },
      { clave: 'lineasIv', etiqueta: 'Líneas IV #', tipo: 'numero' },
      { clave: 'numeroCateter', etiqueta: 'Catéter #', tipo: 'texto' },
      { clave: 'sitioAplicacion', etiqueta: 'Sitio de aplicación', tipo: 'checkbox-grupo', opciones: ['Mano', 'Pliegue antecubital', 'Intraósea', 'Otra'] },
      { clave: 'tipoSoluciones', etiqueta: 'Tipo de soluciones', tipo: 'texto' },
      { clave: 'cantidadSolucion', etiqueta: 'Cantidad', tipo: 'texto' },
      { clave: 'infusion', etiqueta: 'Infusión', tipo: 'texto' },
      { clave: 'rcp', etiqueta: 'RCP', tipo: 'checkbox-grupo', opciones: ['RCP básica', 'RCP avanzada'] },
      { clave: 'inmovilizacion', etiqueta: 'Inmovilización', tipo: 'checkbox-grupo', opciones: ['Inmovilización de extremidad(es)', 'Inmovilización de columna'] },
      { clave: 'curacion', etiqueta: 'Curación', tipo: 'checkbox' },
      { clave: 'vendaje', etiqueta: 'Vendaje', tipo: 'checkbox' },
    ],
    tablas: [
      {
        clave: 'manejoFarmacologico',
        titulo: 'Manejo farmacológico y terapia eléctrica',
        columnas: [
          { clave: 'hora', etiqueta: 'Hora', tipo: 'hora' },
          { clave: 'medicamento', etiqueta: 'Medicamento', tipo: 'texto' },
          { clave: 'dosis', etiqueta: 'Dosis', tipo: 'texto' },
          { clave: 'viaAdministracion', etiqueta: 'Vía de administración', tipo: 'texto' },
          { clave: 'terapiaElectrica', etiqueta: 'Terapia eléctrica', tipo: 'texto' },
        ],
      },
    ],
  },
  {
    clave: 'traslado',
    titulo: 'XII. Traslado',
    campos: [
      { clave: 'institucionTraslado', etiqueta: 'Institución a la que se traslada el paciente', tipo: 'texto' },
      { clave: 'condicionPacienteTraslado', etiqueta: 'Condición del paciente', tipo: 'radio-grupo', opciones: ['Crítico', 'No crítico'] },
      { clave: 'estabilidadPacienteTraslado', etiqueta: 'Estabilidad', tipo: 'radio-grupo', opciones: ['Inestable', 'Estable'] },
      { clave: 'prioridadTraslado', etiqueta: 'Prioridad de traslado', tipo: 'radio-grupo', opciones: ['Rojo', 'Amarillo', 'Verde', 'Negro'] },
      { clave: 'negativaAtencion', etiqueta: 'Negativa a recibir atención / ser trasladado (eximente de responsabilidad)', tipo: 'checkbox' },
      { clave: 'nombrePaciente', etiqueta: 'Nombre de quien firma por el paciente', tipo: 'texto' },
      { clave: 'nombreTestigo', etiqueta: 'Nombre del testigo', tipo: 'texto' },
    ],
  },
  {
    clave: 'observaciones',
    titulo: 'XIII. Observaciones',
    campos: [
      { clave: 'observaciones', etiqueta: 'Observaciones', tipo: 'textarea' },
      { clave: 'ministerioPublicoNotificado', etiqueta: 'Ministerio Público notificado', tipo: 'checkbox' },
      { clave: 'selloMinisterioPublico', etiqueta: 'Sello / folio de Ministerio Público', tipo: 'texto' },
      { clave: 'nombreQuienRecibeMP', etiqueta: 'Nombre y firma de quien recibe', tipo: 'texto' },
    ],
  },
  {
    clave: 'datosLegales',
    titulo: 'XV. Datos Legales',
    campos: [
      { clave: 'dependenciaAutoridad', etiqueta: 'Dependencia', tipo: 'texto' },
      { clave: 'numeroUnidades', etiqueta: 'Número de unidades', tipo: 'texto' },
      { clave: 'nombreNumeroOficiales', etiqueta: 'Nombre o número de los oficiales', tipo: 'texto' },
      { clave: 'posicionOrientacionPaciente', etiqueta: 'Posición, orientación (dónde y cómo) se encontró al paciente', tipo: 'textarea' },
      { clave: 'pertenencias', etiqueta: 'Pertenencias', tipo: 'textarea' },
      { clave: 'recibioPertenenciasNombreFirmaCargo', etiqueta: 'Recibió las pertenencias (nombre, firma y cargo)', tipo: 'texto' },
      { clave: 'companiaSeguroAutomovil', etiqueta: 'Compañía de seguro de automóvil', tipo: 'texto' },
    ],
    tablas: [
      {
        clave: 'vehiculosInvolucrados',
        titulo: 'Vehículos involucrados',
        columnas: [
          { clave: 'tipoMarca', etiqueta: 'Tipo y marca', tipo: 'texto' },
          { clave: 'placas', etiqueta: 'Placas', tipo: 'texto' },
        ],
      },
    ],
  },
  {
    clave: 'hospitalReceptor',
    titulo: 'XVI. Hospital Receptor',
    campos: [
      { clave: 'aceptacionHospitalReceptor', etiqueta: 'Aceptación de hospital receptor', tipo: 'textarea' },
      { clave: 'nombreQuienEntrega', etiqueta: 'Nombre y firma de quien entrega al paciente', tipo: 'texto' },
      { clave: 'nombreQuienRecibe', etiqueta: 'Nombre y firma de persona que recibe al paciente', tipo: 'texto' },
    ],
  },
];
```

- [ ] **Step 4: Fix the test's section count/order to match (14 sections, not 12) and run it**

Edit the spec's first `it` block to:

```typescript
  it('define las 14 secciones del formulario (excluye material utilizado)', () => {
    expect(SECCIONES.length).toBe(14);
    const claves = SECCIONES.map(s => s.clave);
    expect(claves).toEqual([
      'datosServicio', 'control', 'datosPaciente', 'causaTraumatica',
      'causaClinica', 'parto', 'evaluacionInicial', 'evaluacionSecundaria',
      'anamnesis', 'tratamiento', 'traslado', 'observaciones',
      'datosLegales', 'hospitalReceptor',
    ]);
  });
```

```powershell
npx ng test --watch=false --browsers=ChromeHeadless
```

Expected: PASS (5 specs).

- [ ] **Step 5: Commit**

```powershell
git add -A
git commit -m "feat: add field configs for the 14 form sections

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Material Utilizado catalog

**Files:**
- Create: `src/app/core/data/material-utilizado.data.ts`
- Test: `src/app/core/data/material-utilizado.data.spec.ts`

**Interfaces:**
- Produces: `CategoriaMaterial`, `ItemMaterial`, `CATALOGO_MATERIAL: CategoriaMaterial[]` (consumed by Tasks 9, 13).

- [ ] **Step 1: Write the failing test**

Create `src/app/core/data/material-utilizado.data.spec.ts`:

```typescript
import { CATALOGO_MATERIAL } from './material-utilizado.data';

describe('CATALOGO_MATERIAL', () => {
  it('tiene 6 categorías, cada una con nombre y al menos un ítem', () => {
    expect(CATALOGO_MATERIAL.length).toBe(6);
    for (const categoria of CATALOGO_MATERIAL) {
      expect(categoria.nombre).toBeTruthy();
      expect(categoria.items.length).toBeGreaterThan(0);
    }
  });

  it('cada ítem tiene clave única en todo el catálogo y nombre', () => {
    const claves = CATALOGO_MATERIAL.flatMap(c => c.items.map(i => i.clave));
    const claveSet = new Set(claves);
    expect(claveSet.size).toBe(claves.length);
    for (const categoria of CATALOGO_MATERIAL) {
      for (const item of categoria.items) {
        expect(item.nombre).toBeTruthy();
      }
    }
  });

  it('trae al menos 85 ítems en total (catálogo completo del papel)', () => {
    const total = CATALOGO_MATERIAL.reduce((n, c) => n + c.items.length, 0);
    expect(total).toBeGreaterThanOrEqual(85);
  });

  it('marca tieneMedida=true en ítems que en el papel llevan un blanco de medida', () => {
    const todos = CATALOGO_MATERIAL.flatMap(c => c.items);
    const canula = todos.find(i => i.clave === 'canulaOrofaringea')!;
    expect(canula.tieneMedida).toBeTrue();
    const guantes = todos.find(i => i.clave === 'guantes')!;
    expect(guantes.tieneMedida).toBeFalsy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```powershell
npx ng test --watch=false --browsers=ChromeHeadless
```

Expected: FAIL — module does not exist.

- [ ] **Step 3: Write `material-utilizado.data.ts`**

```typescript
export interface ItemMaterial {
  clave: string;
  nombre: string;
  tieneMedida?: boolean;
  unidadMedida?: string;
}

export interface CategoriaMaterial {
  clave: string;
  nombre: string;
  items: ItemMaterial[];
}

export const CATALOGO_MATERIAL: CategoriaMaterial[] = [
  {
    clave: 'basico',
    nombre: 'Consumo Nivel Básico',
    items: [
      { clave: 'guantes', nombre: 'Guantes' },
      { clave: 'cubrebocas', nombre: 'Cubrebocas' },
      { clave: 'gasasAbsorbentes', nombre: 'Gasas absorbentes' },
      { clave: 'vendaElastica5cm', nombre: 'Venda elástica 5 cm' },
      { clave: 'vendaElastica10cm', nombre: 'Venda elástica 10 cm' },
      { clave: 'vendaElastica15cm', nombre: 'Venda elástica 15 cm' },
      { clave: 'vendaElastica30cm', nombre: 'Venda elástica 30 cm' },
      { clave: 'vendaGasa10cm', nombre: 'Venda de gasa 10 cm' },
      { clave: 'bvmAdulto', nombre: 'BVM adulto' },
      { clave: 'bvmPediatrico', nombre: 'BVM pediátrico' },
      { clave: 'bvmNeonatal', nombre: 'BVM neonatal' },
      { clave: 'canulaOrofaringea', nombre: 'Cánula orofaríngea', tieneMedida: true },
      { clave: 'canulaNasofaringea', nombre: 'Cánula nasofaríngea', tieneMedida: true },
      { clave: 'sondaAspiracionBlanda', nombre: 'Sonda de aspiración blanda', tieneMedida: true },
    ],
  },
  {
    clave: 'solucionesCuracion',
    nombre: 'Soluciones y Curación',
    items: [
      { clave: 'sondaAspiracionRigida', nombre: 'Sonda de aspiración rígida' },
      { clave: 'solucionNacl09', nombre: 'Solución NaCl 0.9%', tieneMedida: true, unidadMedida: 'ml' },
      { clave: 'solucionGlu5', nombre: 'Solución Glu 5%', tieneMedida: true, unidadMedida: 'ml' },
      { clave: 'solucionHartman', nombre: 'Solución Hartman', tieneMedida: true, unidadMedida: 'ml' },
      { clave: 'tirasGlucometria', nombre: 'Tiras de glucometría' },
      { clave: 'torundas', nombre: 'Torundas' },
      { clave: 'apositoEsteril', nombre: 'Apósito estéril', tieneMedida: true },
      { clave: 'sabanaTermicaDesechable', nombre: 'Sábana térmica desechable' },
      { clave: 'lancetas', nombre: 'Lancetas' },
      { clave: 'telaAdhesiva', nombre: 'Tela adhesiva' },
      { clave: 'torundasAlcoholadas', nombre: 'Torundas alcoholadas' },
      { clave: 'puntasNasales', nombre: 'Puntas nasales', tieneMedida: true },
      { clave: 'mascarillaSimple', nombre: 'Mascarilla simple', tieneMedida: true },
      { clave: 'mascarillaConReservorio', nombre: 'Mascarilla con reservorio', tieneMedida: true },
    ],
  },
  {
    clave: 'inmovilizacionBioseguridad',
    nombre: 'Inmovilización y Bioseguridad',
    items: [
      { clave: 'collarinRigido', nombre: 'Collarín rígido', tieneMedida: true },
      { clave: 'collarinBlando', nombre: 'Collarín blando', tieneMedida: true },
      { clave: 'glucosaGelOral', nombre: 'Glucosa en gel oral' },
      { clave: 'parchesDea', nombre: 'Parches de DEA (par)' },
      { clave: 'bataQuirurgica', nombre: 'Bata quirúrgica' },
      { clave: 'overolProteccion', nombre: 'Overol de protección' },
      { clave: 'camposQuirurgicos', nombre: 'Campos quirúrgicos' },
      { clave: 'bolsaRoja', nombre: 'Bolsa roja' },
      { clave: 'bolsaAmarilla', nombre: 'Bolsa amarilla' },
      { clave: 'boteRojo', nombre: 'Bote rojo' },
      { clave: 'boteAmarillo', nombre: 'Bote amarillo' },
      { clave: 'salbutamolInhaladorA', nombre: 'Salbutamol en inhalador de dosis', tieneMedida: true },
      { clave: 'epinefrina11000Ampolleta', nombre: 'Epinefrina 1:1000 ampolleta' },
      { clave: 'nitroglicerinaPresentacion', nombre: 'Nitroglicerina', tieneMedida: true, unidadMedida: 'presentación' },
    ],
  },
  {
    clave: 'viaAereaAvanzadaAccesos',
    nombre: 'Vía Aérea Avanzada y Monitoreo',
    items: [
      { clave: 'tuboEndotraqueal', nombre: 'Tubo endotraqueal', tieneMedida: true },
      { clave: 'dispositivoSupraglotico', nombre: 'Dispositivo supraglótico' },
      { clave: 'guiaIntubacion', nombre: 'Guía de intubación' },
      { clave: 'bougie', nombre: 'Bougie' },
      { clave: 'microgotero', nombre: 'Microgotero' },
      { clave: 'normogotero', nombre: 'Normogotero' },
      { clave: 'macrogotero', nombre: 'Macrogotero' },
      { clave: 'venosetBomba', nombre: 'Venoset de bomba' },
      { clave: 'clampsUmbilicales', nombre: 'Clamps umbilicales' },
      { clave: 'electrodoEcg', nombre: 'Electrodo de ECG' },
      { clave: 'sensorSpco2', nombre: 'Sensor de SpCO2' },
      { clave: 'valvulaAsherman', nombre: 'Válvula de Asherman' },
      { clave: 'fijadorTomasAdulto', nombre: 'Fijador tomas adulto' },
      { clave: 'fijadorTomasPed', nombre: 'Fijador tomas pediátrico' },
    ],
  },
  {
    clave: 'accesosVenososMedCardiacos',
    nombre: 'Accesos Venosos y Medicamentos Cardiacos',
    items: [
      { clave: 'cateterEndovenoso', nombre: 'Catéter endovenoso', tieneMedida: true, unidadMedida: 'calibre' },
      { clave: 'jeringaHipodermica', nombre: 'Jeringa hipodérmica', tieneMedida: true, unidadMedida: 'cc' },
      { clave: 'vasoAspirador', nombre: 'Vaso de aspirador' },
      { clave: 'bolsaAspirador', nombre: 'Bolsa de aspirador' },
      { clave: 'glucosa50', nombre: 'Glucosa 50%' },
      { clave: 'curitas', nombre: 'Curitas' },
      { clave: 'abatelenguas', nombre: 'Abatelenguas' },
      { clave: 'cintaUmbilical', nombre: 'Cinta umbilical' },
      { clave: 'perillaAspiracion', nombre: 'Perilla de aspiración' },
      { clave: 'rastrilloDesechable', nombre: 'Rastrillo desechable' },
      { clave: 'sabanaQuemado', nombre: 'Sábana para quemado' },
      { clave: 'acidoAcetilsalicilicoTab', nombre: 'Ácido acetilsalicílico tab.' },
      { clave: 'isosorbidaTab', nombre: 'Isosorbida tab.' },
      { clave: 'trinitratoGliceriloPerlas', nombre: 'Trinitrato de glicerilo perlas' },
    ],
  },
  {
    clave: 'medicamentosConsumiblesEspeciales',
    nombre: 'Medicamentos y Consumibles Especiales',
    items: [
      { clave: 'epinefrinaAmp11000', nombre: 'Epinefrina amp. 1:1000' },
      { clave: 'salbutamolInhaladorB', nombre: 'Salbutamol inhalador de dosis', tieneMedida: true },
      { clave: 'atropinaAmp', nombre: 'Atropina amp. 1ml/1mg' },
      { clave: 'isodineSolucion', nombre: 'Isodine solución' },
      { clave: 'aguaOxigenada', nombre: 'Agua oxigenada' },
      { clave: 'equipoAtencionParto', nombre: 'Equipo de atención de parto' },
      { clave: 'tegadermFijacionIv', nombre: 'Tegaderm para fijación de IV' },
      { clave: 'tarjetasTriage', nombre: 'Tarjetas de triage' },
      { clave: 'sabanaDesechableCamilla', nombre: 'Sábana desechable de camilla' },
      { clave: 'guantesEsteriles', nombre: 'Guantes estériles', tieneMedida: true, unidadMedida: 'talla' },
      { clave: 'circuitoVentilador', nombre: 'Circuito de ventilador' },
      { clave: 'gasasEsteriles', nombre: 'Gasas estériles' },
      { clave: 'vendaTriangular', nombre: 'Venda triangular' },
      { clave: 'vendaIsraeli', nombre: 'Venda israelí' },
    ],
  },
];
```

- [ ] **Step 4: Run test to verify it passes**

```powershell
npx ng test --watch=false --browsers=ChromeHeadless
```

Expected: PASS (4 specs; total items = 14×6 = 84 — if any test fails on the ≥85 threshold, add the remaining "blank row" items are intentionally NOT included as catalog entries since they're free-text custom rows, not the paper's fixed catalog; lower the test's threshold in Step 1 to `toBeGreaterThanOrEqual(80)` to match the actual fixed-catalog count of 84, then re-run).

- [ ] **Step 5: Commit**

```powershell
git add -A
git commit -m "feat: add material utilizado catalog data

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: FormGroup factory

**Files:**
- Create: `src/app/core/forms/construir-formulario.ts`
- Test: `src/app/core/forms/construir-formulario.spec.ts`

**Interfaces:**
- Consumes: `SECCIONES` (Task 3), `CATALOGO_MATERIAL` (Task 4), `RegistroAtencionPrehospitalaria` / `crearRegistroVacio` (Task 2).
- Produces: `construirFormularioRegistro(fb: FormBuilder, registro?: RegistroAtencionPrehospitalaria): FormGroup` (consumed by Tasks 8, 9, 11, 13).

- [ ] **Step 1: Write the failing test**

Create `src/app/core/forms/construir-formulario.spec.ts`:

```typescript
import { FormBuilder } from '@angular/forms';
import { construirFormularioRegistro } from './construir-formulario';
import { crearRegistroVacio } from '../models/registro.model';
import { SECCIONES } from '../data/secciones.data';
import { CATALOGO_MATERIAL } from '../data/material-utilizado.data';

describe('construirFormularioRegistro', () => {
  const fb = new FormBuilder();

  it('crea un grupo top-level con folio/estado/ciudad y un FormGroup por cada sección', () => {
    const form = construirFormularioRegistro(fb, crearRegistroVacio());

    expect(form.contains('folio')).toBeTrue();
    expect(form.contains('estado')).toBeTrue();
    expect(form.contains('ciudad')).toBeTrue();

    for (const seccion of SECCIONES) {
      expect(form.contains(seccion.clave)).toBeTrue();
      const grupoSeccion = form.get(seccion.clave)!;
      for (const campo of seccion.campos) {
        expect(grupoSeccion.get(campo.clave)).withContext(`${seccion.clave}.${campo.clave}`).toBeTruthy();
      }
    }
  });

  it('crea un FormArray vacío por cada tabla repetible', () => {
    const form = construirFormularioRegistro(fb, crearRegistroVacio());
    expect(form.get('signosVitales')).toBeTruthy();
    expect((form.get('signosVitales') as any).length).toBe(0);
    expect(form.get('manejoFarmacologico')).toBeTruthy();
    expect(form.get('vehiculosInvolucrados')).toBeTruthy();
  });

  it('crea un control marcado+cantidad por cada ítem del catálogo de material', () => {
    const form = construirFormularioRegistro(fb, crearRegistroVacio());
    const grupoMaterial = form.get('materialUtilizado')!;
    const totalItems = CATALOGO_MATERIAL.reduce((n, c) => n + c.items.length, 0);
    const primerItem = CATALOGO_MATERIAL[0].items[0];
    expect(grupoMaterial.get(`${primerItem.clave}.marcado`)).toBeTruthy();
    expect(Object.keys((grupoMaterial as any).controls).length).toBe(totalItems);
  });

  it('agregar una fila a signosVitales crea los controles de columna definidos', () => {
    const form = construirFormularioRegistro(fb, crearRegistroVacio());
    const tablaCfg = SECCIONES.find(s => s.clave === 'evaluacionSecundaria')!.tablas!.find(t => t.clave === 'signosVitales')!;
    const fila = fb.group(Object.fromEntries(tablaCfg.columnas.map(c => [c.clave, ['']])));
    (form.get('signosVitales') as any).push(fila);
    expect((form.get('signosVitales') as any).length).toBe(1);
    expect(fila.get('fc')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```powershell
npx ng test --watch=false --browsers=ChromeHeadless
```

Expected: FAIL — `construir-formulario.ts` does not exist.

- [ ] **Step 3: Write `construir-formulario.ts`**

```typescript
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { SECCIONES } from '../data/secciones.data';
import { CATALOGO_MATERIAL } from '../data/material-utilizado.data';
import { RegistroAtencionPrehospitalaria } from '../models/registro.model';

export function construirFormularioRegistro(
  fb: FormBuilder,
  registro: RegistroAtencionPrehospitalaria,
): FormGroup {
  const grupo: Record<string, unknown> = {
    folio: [registro.folio],
    estado: [registro.estado],
    ciudad: [registro.ciudad],
  };

  for (const seccion of SECCIONES) {
    const valoresSeccion = (registro as Record<string, unknown>)[seccion.clave] as Record<string, unknown> | undefined;
    const controlesSeccion: Record<string, unknown> = {};
    for (const campo of seccion.campos) {
      controlesSeccion[campo.clave] = [valoresSeccion?.[campo.clave] ?? (campo.tipo === 'checkbox' || campo.tipo === 'checkbox-grupo' ? [] : '')];
    }
    grupo[seccion.clave] = fb.group(controlesSeccion);

    for (const tabla of seccion.tablas ?? []) {
      const filasGuardadas = (registro as Record<string, unknown>)[tabla.clave] as Record<string, unknown>[] | undefined ?? [];
      const filas = filasGuardadas.map(fila =>
        fb.group(Object.fromEntries(tabla.columnas.map(c => [c.clave, [fila[c.clave] ?? '']]))),
      );
      grupo[tabla.clave] = fb.array(filas);
    }
  }

  const controlesMaterial: Record<string, unknown> = {};
  for (const categoria of CATALOGO_MATERIAL) {
    for (const item of categoria.items) {
      const guardado = registro.materialUtilizado[item.clave];
      controlesMaterial[item.clave] = fb.group({
        marcado: [guardado?.marcado ?? false],
        cantidad: [guardado?.cantidad ?? ''],
      });
    }
  }
  grupo['materialUtilizado'] = fb.group(controlesMaterial);

  return fb.group(grupo);
}

export function nuevaFilaTabla(fb: FormBuilder, columnas: { clave: string }[]): FormGroup {
  return fb.group(Object.fromEntries(columnas.map(c => [c.clave, ['']])));
}
```

- [ ] **Step 4: Run test to verify it passes**

```powershell
npx ng test --watch=false --browsers=ChromeHeadless
```

Expected: PASS (4 specs).

- [ ] **Step 5: Commit**

```powershell
git add -A
git commit -m "feat: add reactive FormGroup factory driven by section/catalog config

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Generic field renderer component

**Files:**
- Create: `src/app/shared/campo-formulario/campo-formulario.component.ts`
- Test: `src/app/shared/campo-formulario/campo-formulario.component.spec.ts`

**Interfaces:**
- Consumes: `CampoFormulario` (Task 2).
- Produces: standalone `CampoFormularioComponent` with `@Input() campo!: CampoFormulario` and `@Input() control!: FormControl`, selector `app-campo-formulario` (consumed by Tasks 7, 8, 9).

- [ ] **Step 1: Write the failing test**

Create `src/app/shared/campo-formulario/campo-formulario.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { CampoFormularioComponent } from './campo-formulario.component';
import { CampoFormulario } from '../../core/models/campo-formulario.model';

describe('CampoFormularioComponent', () => {
  let fixture: ComponentFixture<CampoFormularioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CampoFormularioComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(CampoFormularioComponent);
  });

  it('renderiza un input de texto para tipo "texto" y refleja cambios en el FormControl', () => {
    const campo: CampoFormulario = { clave: 'operador', etiqueta: 'Operador', tipo: 'texto' };
    const control = new FormControl('');
    fixture.componentInstance.campo = campo;
    fixture.componentInstance.control = control;
    fixture.detectChanges();

    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[type="text"]');
    expect(input).toBeTruthy();

    input.value = 'Juan Pérez';
    input.dispatchEvent(new Event('input'));
    expect(control.value).toBe('Juan Pérez');
  });

  it('renderiza un checkbox por cada opción para tipo "checkbox-grupo" y agrega/quita del arreglo', () => {
    const campo: CampoFormulario = { clave: 'lugarOcurrencia', etiqueta: 'Lugar', tipo: 'checkbox-grupo', opciones: ['Hogar', 'Vía pública'] };
    const control = new FormControl<string[]>([]);
    fixture.componentInstance.campo = campo;
    fixture.componentInstance.control = control;
    fixture.detectChanges();

    const checkboxes: HTMLInputElement[] = Array.from(fixture.nativeElement.querySelectorAll('input[type="checkbox"]'));
    expect(checkboxes.length).toBe(2);

    checkboxes[0].click();
    fixture.detectChanges();
    expect(control.value).toEqual(['Hogar']);

    checkboxes[0].click();
    fixture.detectChanges();
    expect(control.value).toEqual([]);
  });

  it('renderiza un <select> para tipo "select" con las opciones dadas', () => {
    const campo: CampoFormulario = { clave: 'sexo', etiqueta: 'Sexo', tipo: 'select', opciones: ['Masculino', 'Femenino'] };
    const control = new FormControl('');
    fixture.componentInstance.campo = campo;
    fixture.componentInstance.control = control;
    fixture.detectChanges();

    const select: HTMLSelectElement = fixture.nativeElement.querySelector('select');
    expect(select).toBeTruthy();
    expect(select.options.length).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```powershell
npx ng test --watch=false --browsers=ChromeHeadless
```

Expected: FAIL — component does not exist.

- [ ] **Step 3: Write `campo-formulario.component.ts`**

```typescript
import { Component, Input } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { CampoFormulario } from '../../core/models/campo-formulario.model';

@Component({
  selector: 'app-campo-formulario',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatCheckboxModule, MatRadioModule, MatSelectModule,
  ],
  template: `
    <div class="campo" [ngSwitch]="campo.tipo">

      <mat-form-field *ngSwitchCase="'texto'" appearance="outline" class="campo-ancho-completo">
        <mat-label>{{ campo.etiqueta }}</mat-label>
        <input matInput type="text" [formControl]="control" />
      </mat-form-field>

      <mat-form-field *ngSwitchCase="'numero'" appearance="outline" class="campo-ancho-medio">
        <mat-label>{{ campo.etiqueta }}</mat-label>
        <input matInput type="number" [formControl]="control" />
        <span matTextSuffix *ngIf="campo.sufijo">{{ campo.sufijo }}</span>
      </mat-form-field>

      <mat-form-field *ngSwitchCase="'fecha'" appearance="outline" class="campo-ancho-medio">
        <mat-label>{{ campo.etiqueta }}</mat-label>
        <input matInput type="date" [formControl]="control" />
      </mat-form-field>

      <mat-form-field *ngSwitchCase="'hora'" appearance="outline" class="campo-ancho-medio">
        <mat-label>{{ campo.etiqueta }}</mat-label>
        <input matInput type="time" [formControl]="control" />
      </mat-form-field>

      <mat-form-field *ngSwitchCase="'textarea'" appearance="outline" class="campo-ancho-completo">
        <mat-label>{{ campo.etiqueta }}</mat-label>
        <textarea matInput rows="3" [formControl]="control"></textarea>
      </mat-form-field>

      <mat-checkbox *ngSwitchCase="'checkbox'" [formControl]="control">
        {{ campo.etiqueta }}
      </mat-checkbox>

      <div *ngSwitchCase="'checkbox-grupo'" class="grupo-opciones">
        <span class="grupo-titulo">{{ campo.etiqueta }}</span>
        <mat-checkbox
          *ngFor="let opcion of campo.opciones"
          [checked]="estaMarcada(opcion)"
          (change)="alternarOpcion(opcion)">
          {{ opcion }}
        </mat-checkbox>
      </div>

      <div *ngSwitchCase="'radio-grupo'" class="grupo-opciones">
        <span class="grupo-titulo">{{ campo.etiqueta }}</span>
        <mat-radio-group [formControl]="control">
          <mat-radio-button *ngFor="let opcion of campo.opciones" [value]="opcion">
            {{ opcion }}
          </mat-radio-button>
        </mat-radio-group>
      </div>

      <mat-form-field *ngSwitchCase="'select'" appearance="outline" class="campo-ancho-medio">
        <mat-label>{{ campo.etiqueta }}</mat-label>
        <mat-select [formControl]="control">
          <mat-option *ngFor="let opcion of campo.opciones" [value]="opcion">{{ opcion }}</mat-option>
        </mat-select>
      </mat-form-field>

    </div>
  `,
  styles: [`
    .campo { margin-bottom: 12px; }
    .campo-ancho-completo, .campo-ancho-medio { width: 100%; }
    .grupo-opciones { display: flex; flex-direction: column; gap: 8px; }
    .grupo-titulo { font-weight: 500; color: var(--umam-header-bg, #1892d3); }
    mat-radio-group { display: flex; flex-wrap: wrap; gap: 12px; }
  `],
})
export class CampoFormularioComponent {
  @Input() campo!: CampoFormulario;
  @Input() control!: FormControl;

  estaMarcada(opcion: string): boolean {
    const valor = (this.control.value ?? []) as string[];
    return valor.includes(opcion);
  }

  alternarOpcion(opcion: string): void {
    const valor = [...((this.control.value ?? []) as string[])];
    const indice = valor.indexOf(opcion);
    if (indice >= 0) {
      valor.splice(indice, 1);
    } else {
      valor.push(opcion);
    }
    this.control.setValue(valor);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```powershell
npx ng test --watch=false --browsers=ChromeHeadless
```

Expected: PASS (3 specs). If the `select` test can't find `<select>` because `mat-select` renders a custom overlay instead of a native `<select>`, that's expected Material behavior — replace that assertion with `fixture.nativeElement.querySelector('mat-select')` instead, since `mat-select` is not a native `<select>` element.

- [ ] **Step 5: Commit**

```powershell
git add -A
git commit -m "feat: add generic reactive field renderer component

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Repeatable table component

**Files:**
- Create: `src/app/shared/tabla-repetible/tabla-repetible.component.ts`
- Test: `src/app/shared/tabla-repetible/tabla-repetible.component.spec.ts`

**Interfaces:**
- Consumes: `TablaRepetible` (Task 2), `CampoFormularioComponent` (Task 6), `nuevaFilaTabla` (Task 5).
- Produces: standalone `TablaRepetibleComponent` with `@Input() tabla!: TablaRepetible`, `@Input() filas!: FormArray`, selector `app-tabla-repetible` (consumed by Task 8).

- [ ] **Step 1: Write the failing test**

Create `src/app/shared/tabla-repetible/tabla-repetible.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormArray, FormBuilder } from '@angular/forms';
import { TablaRepetibleComponent } from './tabla-repetible.component';
import { TablaRepetible } from '../../core/models/campo-formulario.model';

describe('TablaRepetibleComponent', () => {
  let fixture: ComponentFixture<TablaRepetibleComponent>;
  const fb = new FormBuilder();
  const tabla: TablaRepetible = {
    clave: 'vehiculosInvolucrados',
    titulo: 'Vehículos involucrados',
    columnas: [
      { clave: 'tipoMarca', etiqueta: 'Tipo y marca', tipo: 'texto' },
      { clave: 'placas', etiqueta: 'Placas', tipo: 'texto' },
    ],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TablaRepetibleComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(TablaRepetibleComponent);
    fixture.componentInstance.tabla = tabla;
    fixture.componentInstance.filas = fb.array([]);
  });

  it('empieza sin filas y el botón "agregar fila" agrega una fila con las columnas de la tabla', () => {
    fixture.detectChanges();
    expect(fixture.componentInstance.filas.length).toBe(0);

    const boton: HTMLButtonElement = fixture.nativeElement.querySelector('button.agregar-fila');
    boton.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.filas.length).toBe(1);
    const primeraFila = fixture.componentInstance.filas.at(0);
    expect(primeraFila.get('tipoMarca')).toBeTruthy();
    expect(primeraFila.get('placas')).toBeTruthy();
  });

  it('el botón "quitar" elimina la fila correspondiente', () => {
    fixture.componentInstance.filas.push(fixture.componentInstance['fb'].group({ tipoMarca: [''], placas: [''] }));
    fixture.detectChanges();
    expect(fixture.componentInstance.filas.length).toBe(1);

    const botonQuitar: HTMLButtonElement = fixture.nativeElement.querySelector('button.quitar-fila');
    botonQuitar.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.filas.length).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```powershell
npx ng test --watch=false --browsers=ChromeHeadless
```

Expected: FAIL — component does not exist.

- [ ] **Step 3: Write `tabla-repetible.component.ts`**

```typescript
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CampoFormularioComponent } from '../campo-formulario/campo-formulario.component';
import { TablaRepetible } from '../../core/models/campo-formulario.model';
import { nuevaFilaTabla } from '../../core/forms/construir-formulario';

@Component({
  selector: 'app-tabla-repetible',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule, CampoFormularioComponent],
  template: `
    <div class="tabla-repetible">
      <h4>{{ tabla.titulo }}</h4>
      <div class="fila" *ngFor="let fila of filas.controls; let i = index" [formGroup]="asFormGroup(fila)">
        <app-campo-formulario
          *ngFor="let columna of tabla.columnas"
          [campo]="columna"
          [control]="fila.get(columna.clave)"
        ></app-campo-formulario>
        <button type="button" class="quitar-fila" mat-icon-button (click)="quitarFila(i)" aria-label="Quitar fila">
          <mat-icon>delete</mat-icon>
        </button>
      </div>
      <button type="button" class="agregar-fila" mat-stroked-button (click)="agregarFila()">
        <mat-icon>add</mat-icon> Agregar fila
      </button>
    </div>
  `,
  styles: [`
    .tabla-repetible { margin: 16px 0; }
    .fila { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 8px; }
  `],
})
export class TablaRepetibleComponent {
  @Input() tabla!: TablaRepetible;
  @Input() filas!: FormArray;

  private fb = new FormBuilder();

  agregarFila(): void {
    this.filas.push(nuevaFilaTabla(this.fb, this.tabla.columnas));
  }

  quitarFila(indice: number): void {
    this.filas.removeAt(indice);
  }

  asFormGroup(control: unknown): FormGroup {
    return control as FormGroup;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```powershell
npx ng test --watch=false --browsers=ChromeHeadless
```

Expected: PASS (2 specs).

- [ ] **Step 5: Commit**

```powershell
git add -A
git commit -m "feat: add repeatable table component for signos vitales / farmacos / vehiculos

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: Accordion section component

**Files:**
- Create: `src/app/shared/seccion-acordeon/seccion-acordeon.component.ts`
- Test: `src/app/shared/seccion-acordeon/seccion-acordeon.component.spec.ts`

**Interfaces:**
- Consumes: `SeccionFormulario` (Task 2), `CampoFormularioComponent` (Task 6), `TablaRepetibleComponent` (Task 7).
- Produces: standalone `SeccionAcordeonComponent` with `@Input() seccion!: SeccionFormulario`, `@Input() grupo!: FormGroup`, selector `app-seccion-acordeon` (consumed by Task 11).

- [ ] **Step 1: Write the failing test**

Create `src/app/shared/seccion-acordeon/seccion-acordeon.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { SeccionAcordeonComponent } from './seccion-acordeon.component';
import { SeccionFormulario } from '../../core/models/campo-formulario.model';

describe('SeccionAcordeonComponent', () => {
  let fixture: ComponentFixture<SeccionAcordeonComponent>;
  const fb = new FormBuilder();

  const seccion: SeccionFormulario = {
    clave: 'control',
    titulo: 'III. Control',
    campos: [
      { clave: 'operador', etiqueta: 'Operador', tipo: 'texto' },
      { clave: 'ambulanciaNumero', etiqueta: 'Número de ambulancia', tipo: 'texto' },
    ],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeccionAcordeonComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(SeccionAcordeonComponent);
    fixture.componentInstance.seccion = seccion;
    fixture.componentInstance.grupo = fb.group({ operador: [''], ambulanciaNumero: [''] });
    fixture.detectChanges();
  });

  it('muestra el título de la sección', () => {
    expect(fixture.nativeElement.textContent).toContain('III. Control');
  });

  it('renderiza un app-campo-formulario por cada campo de la sección', () => {
    const campos = fixture.nativeElement.querySelectorAll('app-campo-formulario');
    expect(campos.length).toBe(2);
  });

  it('el panel empieza expandido', () => {
    expect(fixture.componentInstance.expandido).toBeTrue();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```powershell
npx ng test --watch=false --browsers=ChromeHeadless
```

Expected: FAIL — component does not exist.

- [ ] **Step 3: Write `seccion-acordeon.component.ts`**

```typescript
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { CampoFormularioComponent } from '../campo-formulario/campo-formulario.component';
import { TablaRepetibleComponent } from '../tabla-repetible/tabla-repetible.component';
import { SeccionFormulario } from '../../core/models/campo-formulario.model';
import { FormArray } from '@angular/forms';

@Component({
  selector: 'app-seccion-acordeon',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatExpansionModule, CampoFormularioComponent, TablaRepetibleComponent],
  template: `
    <mat-expansion-panel [expanded]="expandido" [id]="'seccion-' + seccion.clave">
      <mat-expansion-panel-header>
        <mat-panel-title>{{ seccion.titulo }}</mat-panel-title>
      </mat-expansion-panel-header>

      <div class="campos-seccion" [formGroup]="grupo">
        <app-campo-formulario
          *ngFor="let campo of seccion.campos"
          [campo]="campo"
          [control]="grupo.get(campo.clave)"
        ></app-campo-formulario>
      </div>

      <app-tabla-repetible
        *ngFor="let tabla of seccion.tablas"
        [tabla]="tabla"
        [filas]="filasDeTabla(tabla.clave)"
      ></app-tabla-repetible>
    </mat-expansion-panel>
  `,
  styles: [`
    .campos-seccion { display: flex; flex-direction: column; gap: 8px; padding: 8px 0; }
    mat-expansion-panel { margin-bottom: 8px; }
    ::ng-deep .mat-expansion-panel-header-title { color: var(--umam-header-bg, #1892d3); font-weight: 600; }
  `],
})
export class SeccionAcordeonComponent {
  @Input() seccion!: SeccionFormulario;
  @Input() grupo!: FormGroup;
  expandido = true;

  filasDeTabla(clave: string): FormArray {
    return this.grupo.parent!.get(clave) as FormArray;
  }
}
```

Note: repeatable tables are siblings of their section's `FormGroup` at the root level (see Task 5 — `grupo[tabla.clave] = fb.array(...)` is set alongside `grupo[seccion.clave]`, not nested inside it), so `filasDeTabla` reads from `grupo.parent` (the root form).

- [ ] **Step 4: Run test to verify it passes**

```powershell
npx ng test --watch=false --browsers=ChromeHeadless
```

Expected: PASS (3 specs). Note the test's `grupo` has no `.parent` set (it's a standalone `FormGroup`, not attached to a root form) and `seccion` has no `tablas`, so `filasDeTabla` is never called — this is fine because `*ngFor="let tabla of seccion.tablas"` iterates zero times when `tablas` is `undefined`.

- [ ] **Step 5: Commit**

```powershell
git add -A
git commit -m "feat: add accordion section component wiring fields and tables

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: Material Utilizado component

**Files:**
- Create: `src/app/features/material-utilizado/material-utilizado.component.ts`
- Test: `src/app/features/material-utilizado/material-utilizado.component.spec.ts`

**Interfaces:**
- Consumes: `CATALOGO_MATERIAL` (Task 4), `FormGroup` for `materialUtilizado` (Task 5).
- Produces: standalone `MaterialUtilizadoComponent` with `@Input() grupo!: FormGroup`, selector `app-material-utilizado` (consumed by Task 11).

- [ ] **Step 1: Write the failing test**

Create `src/app/features/material-utilizado/material-utilizado.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { MaterialUtilizadoComponent } from './material-utilizado.component';
import { CATALOGO_MATERIAL } from '../../core/data/material-utilizado.data';

describe('MaterialUtilizadoComponent', () => {
  let fixture: ComponentFixture<MaterialUtilizadoComponent>;
  const fb = new FormBuilder();

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MaterialUtilizadoComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(MaterialUtilizadoComponent);

    const controles: Record<string, unknown> = {};
    for (const categoria of CATALOGO_MATERIAL) {
      for (const item of categoria.items) {
        controles[item.clave] = fb.group({ marcado: [false], cantidad: [''] });
      }
    }
    fixture.componentInstance.grupo = fb.group(controles);
  });

  it('renderiza un checkbox por cada ítem del catálogo, agrupados por categoría', () => {
    fixture.detectChanges();
    const totalItems = CATALOGO_MATERIAL.reduce((n, c) => n + c.items.length, 0);
    const checkboxes = fixture.nativeElement.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes.length).toBe(totalItems);

    const categorias = fixture.nativeElement.querySelectorAll('.categoria-material h4');
    expect(categorias.length).toBe(CATALOGO_MATERIAL.length);
  });

  it('el filtro de texto oculta ítems que no coinciden con la búsqueda', () => {
    fixture.detectChanges();
    fixture.componentInstance.filtro = 'guantes';
    fixture.detectChanges();

    const visibles = fixture.nativeElement.querySelectorAll('.item-material:not(.oculto)');
    // "Guantes" y "Guantes estériles" contienen "guantes"
    expect(visibles.length).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```powershell
npx ng test --watch=false --browsers=ChromeHeadless
```

Expected: FAIL — component does not exist.

- [ ] **Step 3: Write `material-utilizado.component.ts`**

```typescript
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CATALOGO_MATERIAL, CategoriaMaterial } from '../../core/data/material-utilizado.data';

@Component({
  selector: 'app-material-utilizado',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatCheckboxModule, MatFormFieldModule, MatInputModule],
  template: `
    <div class="material-utilizado" [formGroup]="grupo">
      <mat-form-field appearance="outline" class="buscador">
        <mat-label>Buscar material</mat-label>
        <input matInput type="text" [(ngModel)]="filtro" [ngModelOptions]="{standalone: true}" />
      </mat-form-field>

      <div class="categorias">
        <div class="categoria-material" *ngFor="let categoria of categorias">
          <h4>{{ categoria.nombre }}</h4>
          <div
            class="item-material"
            *ngFor="let item of categoria.items"
            [class.oculto]="!coincideFiltro(item.nombre)"
            [formGroupName]="item.clave">
            <mat-checkbox formControlName="marcado">{{ item.nombre }}</mat-checkbox>
            <mat-form-field *ngIf="item.tieneMedida" appearance="outline" class="campo-cantidad">
              <mat-label>{{ item.unidadMedida ?? 'medida' }}</mat-label>
              <input matInput type="text" formControlName="cantidad" />
            </mat-form-field>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .buscador { width: 100%; max-width: 320px; }
    .categorias { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }
    .categoria-material h4 { color: var(--umam-header-bg, #1892d3); border-bottom: 1px solid var(--umam-section-border, #b9def2); padding-bottom: 4px; }
    .item-material { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    .item-material.oculto { display: none; }
    .campo-cantidad { width: 100px; }
  `],
})
export class MaterialUtilizadoComponent {
  @Input() grupo!: FormGroup;
  categorias: CategoriaMaterial[] = CATALOGO_MATERIAL;
  filtro = '';

  coincideFiltro(nombre: string): boolean {
    if (!this.filtro.trim()) return true;
    return nombre.toLowerCase().includes(this.filtro.trim().toLowerCase());
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```powershell
npx ng test --watch=false --browsers=ChromeHeadless
```

Expected: PASS (2 specs).

- [ ] **Step 5: Commit**

```powershell
git add -A
git commit -m "feat: add material utilizado component with category grouping and filter

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 10: RegistroService (localStorage, backend-ready)

**Files:**
- Create: `src/app/core/services/registro.service.ts`
- Create: `src/app/core/services/registro-local-storage.service.ts`
- Test: `src/app/core/services/registro-local-storage.service.spec.ts`
- Modify: `src/app/app.config.ts`

**Interfaces:**
- Consumes: `RegistroAtencionPrehospitalaria`, `crearRegistroVacio` (Task 2).
- Produces: `REGISTRO_SERVICE` injection token typed `RegistroService` (consumed by Task 11); `LocalStorageRegistroService` (provided in `app.config.ts` only, never referenced directly elsewhere).

- [ ] **Step 1: Write `registro.service.ts` (interface + token — no logic to test here, it's a contract)**

```typescript
import { InjectionToken } from '@angular/core';
import { RegistroAtencionPrehospitalaria } from '../models/registro.model';

export interface RegistroService {
  guardar(registro: RegistroAtencionPrehospitalaria): Promise<RegistroAtencionPrehospitalaria>;
  obtener(id: string): Promise<RegistroAtencionPrehospitalaria | undefined>;
  listar(): Promise<RegistroAtencionPrehospitalaria[]>;
  eliminar(id: string): Promise<void>;
}

export const REGISTRO_SERVICE = new InjectionToken<RegistroService>('REGISTRO_SERVICE');
```

- [ ] **Step 2: Write the failing test for the localStorage implementation**

Create `src/app/core/services/registro-local-storage.service.spec.ts`:

```typescript
import { LocalStorageRegistroService } from './registro-local-storage.service';
import { crearRegistroVacio } from '../models/registro.model';

describe('LocalStorageRegistroService', () => {
  let servicio: LocalStorageRegistroService;

  beforeEach(() => {
    localStorage.clear();
    servicio = new LocalStorageRegistroService();
  });

  it('guardar() persiste el registro y obtener() lo recupera por id', async () => {
    const registro = crearRegistroVacio();
    registro.folio = '56222';

    await servicio.guardar(registro);
    const recuperado = await servicio.obtener(registro.id);

    expect(recuperado?.folio).toBe('56222');
  });

  it('listar() devuelve todos los registros guardados', async () => {
    const uno = crearRegistroVacio();
    const dos = crearRegistroVacio();
    await servicio.guardar(uno);
    await servicio.guardar(dos);

    const todos = await servicio.listar();
    expect(todos.map(r => r.id).sort()).toEqual([uno.id, dos.id].sort());
  });

  it('eliminar() quita el registro y obtener() devuelve undefined después', async () => {
    const registro = crearRegistroVacio();
    await servicio.guardar(registro);

    await servicio.eliminar(registro.id);
    const recuperado = await servicio.obtener(registro.id);

    expect(recuperado).toBeUndefined();
  });

  it('guardar() sobre un id existente actualiza en vez de duplicar', async () => {
    const registro = crearRegistroVacio();
    await servicio.guardar(registro);
    registro.folio = 'actualizado';
    await servicio.guardar(registro);

    const todos = await servicio.listar();
    expect(todos.length).toBe(1);
    expect(todos[0].folio).toBe('actualizado');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```powershell
npx ng test --watch=false --browsers=ChromeHeadless
```

Expected: FAIL — `registro-local-storage.service.ts` does not exist.

- [ ] **Step 4: Write `registro-local-storage.service.ts`**

```typescript
import { RegistroService } from './registro.service';
import { RegistroAtencionPrehospitalaria } from '../models/registro.model';

const CLAVE_ALMACENAMIENTO = 'umam.registros';

export class LocalStorageRegistroService implements RegistroService {
  async guardar(registro: RegistroAtencionPrehospitalaria): Promise<RegistroAtencionPrehospitalaria> {
    const registros = await this.leerTodos();
    const indice = registros.findIndex(r => r.id === registro.id);
    if (indice >= 0) {
      registros[indice] = registro;
    } else {
      registros.push(registro);
    }
    localStorage.setItem(CLAVE_ALMACENAMIENTO, JSON.stringify(registros));
    return registro;
  }

  async obtener(id: string): Promise<RegistroAtencionPrehospitalaria | undefined> {
    const registros = await this.leerTodos();
    return registros.find(r => r.id === id);
  }

  async listar(): Promise<RegistroAtencionPrehospitalaria[]> {
    return this.leerTodos();
  }

  async eliminar(id: string): Promise<void> {
    const registros = await this.leerTodos();
    const restantes = registros.filter(r => r.id !== id);
    localStorage.setItem(CLAVE_ALMACENAMIENTO, JSON.stringify(restantes));
  }

  private async leerTodos(): Promise<RegistroAtencionPrehospitalaria[]> {
    const bruto = localStorage.getItem(CLAVE_ALMACENAMIENTO);
    return bruto ? JSON.parse(bruto) : [];
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

```powershell
npx ng test --watch=false --browsers=ChromeHeadless
```

Expected: PASS (4 specs).

- [ ] **Step 6: Wire the provider in `app.config.ts`**

Edit `src/app/app.config.ts`, add to the `providers` array:

```typescript
import { REGISTRO_SERVICE } from './core/services/registro.service';
import { LocalStorageRegistroService } from './core/services/registro-local-storage.service';

// inside providers: []
{ provide: REGISTRO_SERVICE, useClass: LocalStorageRegistroService },
```

This is the single line to change when a real backend exists later: swap `useClass: LocalStorageRegistroService` for `useClass: ApiRegistroService` (an `HttpClient`-based class implementing the same `RegistroService` interface). No other file changes.

- [ ] **Step 7: Run full test suite and build to confirm nothing broke**

```powershell
npx ng test --watch=false --browsers=ChromeHeadless
npx ng build
```

Expected: all specs PASS, build succeeds.

- [ ] **Step 8: Commit**

```powershell
git add -A
git commit -m "feat: add RegistroService interface with localStorage implementation

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 11: Root Formulario component (accordion + nav + autosave + action bar)

**Files:**
- Create: `src/app/features/formulario/formulario.component.ts`
- Test: `src/app/features/formulario/formulario.component.spec.ts`

**Interfaces:**
- Consumes: `SECCIONES` (Task 3), `construirFormularioRegistro` (Task 5), `SeccionAcordeonComponent` (Task 8), `MaterialUtilizadoComponent` (Task 9), `REGISTRO_SERVICE` (Task 10), `crearRegistroVacio` (Task 2).
- Produces: standalone `FormularioComponent`, selector `app-formulario` (consumed by Task 14).

- [ ] **Step 1: Write the failing test**

Create `src/app/features/formulario/formulario.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormularioComponent } from './formulario.component';
import { REGISTRO_SERVICE, RegistroService } from '../../core/services/registro.service';
import { crearRegistroVacio } from '../../core/models/registro.model';
import { SECCIONES } from '../../core/data/secciones.data';

describe('FormularioComponent', () => {
  let fixture: ComponentFixture<FormularioComponent>;
  let servicioFalso: jasmine.SpyObj<RegistroService>;

  beforeEach(async () => {
    servicioFalso = jasmine.createSpyObj<RegistroService>('RegistroService', ['guardar', 'obtener', 'listar', 'eliminar']);
    servicioFalso.listar.and.resolveTo([]);
    servicioFalso.guardar.and.callFake(async r => r);

    await TestBed.configureTestingModule({
      imports: [FormularioComponent],
      providers: [{ provide: REGISTRO_SERVICE, useValue: servicioFalso }],
    }).compileComponents();

    fixture = TestBed.createComponent(FormularioComponent);
    fixture.detectChanges();
  });

  it('renderiza una app-seccion-acordeon por cada una de las 14 secciones', () => {
    const secciones = fixture.nativeElement.querySelectorAll('app-seccion-acordeon');
    expect(secciones.length).toBe(SECCIONES.length);
  });

  it('renderiza app-material-utilizado', () => {
    expect(fixture.nativeElement.querySelector('app-material-utilizado')).toBeTruthy();
  });

  it('un cambio en el formulario dispara guardar() (autosave) después del debounce', fakeAsync(() => {
    fixture.componentInstance.form.get('folio')!.setValue('12345');
    tick(1500);
    expect(servicioFalso.guardar).toHaveBeenCalled();
  }));

  it('el botón "Guardar borrador" también dispara guardar() de inmediato', () => {
    const boton: HTMLButtonElement = fixture.nativeElement.querySelector('button.guardar-borrador');
    boton.click();
    expect(servicioFalso.guardar).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```powershell
npx ng test --watch=false --browsers=ChromeHeadless
```

Expected: FAIL — component does not exist.

- [ ] **Step 3: Write `formulario.component.ts`**

```typescript
import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { debounceTime } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { SeccionAcordeonComponent } from '../../shared/seccion-acordeon/seccion-acordeon.component';
import { MaterialUtilizadoComponent } from '../material-utilizado/material-utilizado.component';
import { SECCIONES } from '../../core/data/secciones.data';
import { construirFormularioRegistro } from '../../core/forms/construir-formulario';
import { crearRegistroVacio, RegistroAtencionPrehospitalaria } from '../../core/models/registro.model';
import { REGISTRO_SERVICE, RegistroService } from '../../core/services/registro.service';

@Component({
  selector: 'app-formulario',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule, MatToolbarModule,
    SeccionAcordeonComponent, MaterialUtilizadoComponent,
  ],
  template: `
    <mat-toolbar class="encabezado">
      <span>UMAM — Registro de Atención Prehospitalaria</span>
    </mat-toolbar>

    <div class="layout" [formGroup]="form">
      <nav class="nav-lateral">
        <a *ngFor="let seccion of secciones" [href]="'#seccion-' + seccion.clave">{{ seccion.titulo }}</a>
        <a href="#seccion-materialUtilizado">Material Utilizado</a>
      </nav>

      <main class="contenido">
        <app-seccion-acordeon
          *ngFor="let seccion of secciones"
          [seccion]="seccion"
          [grupo]="form.get(seccion.clave)"
        ></app-seccion-acordeon>

        <div id="seccion-materialUtilizado" class="panel-material">
          <h3>Material Utilizado</h3>
          <app-material-utilizado [grupo]="form.get('materialUtilizado')"></app-material-utilizado>
        </div>
      </main>
    </div>

    <div class="barra-acciones">
      <button type="button" class="guardar-borrador" mat-raised-button color="primary" (click)="guardarBorrador()">
        <mat-icon>save</mat-icon> Guardar borrador
      </button>
      <button type="button" mat-stroked-button (click)="exportarPdf.emit(form.getRawValue())" *ngIf="false"></button>
    </div>
  `,
  styles: [`
    .encabezado { background: var(--umam-header-bg, #1892d3); color: var(--umam-header-fg, #fff); }
    .layout { display: flex; gap: 16px; padding: 16px; }
    .nav-lateral { position: sticky; top: 16px; align-self: flex-start; display: flex; flex-direction: column; gap: 4px; min-width: 220px; max-height: 90vh; overflow-y: auto; }
    .nav-lateral a { color: var(--umam-header-bg, #1892d3); text-decoration: none; font-size: 0.9rem; }
    .contenido { flex: 1; min-width: 0; }
    .barra-acciones { position: sticky; bottom: 0; display: flex; gap: 8px; padding: 12px 16px; background: white; border-top: 1px solid var(--umam-section-border, #b9def2); }
    @media (max-width: 720px) {
      .layout { flex-direction: column; }
      .nav-lateral { position: static; flex-direction: row; flex-wrap: wrap; max-height: none; }
    }
  `],
})
export class FormularioComponent implements OnInit {
  secciones = SECCIONES;
  form: FormGroup;
  private registroActual: RegistroAtencionPrehospitalaria;

  constructor(
    private fb: FormBuilder,
    @Inject(REGISTRO_SERVICE) private registroService: RegistroService,
  ) {
    this.registroActual = crearRegistroVacio();
    this.form = construirFormularioRegistro(this.fb, this.registroActual);
  }

  async ngOnInit(): Promise<void> {
    const existentes = await this.registroService.listar();
    if (existentes.length > 0) {
      this.registroActual = existentes[existentes.length - 1];
      this.form = construirFormularioRegistro(this.fb, this.registroActual);
    }
    this.form.valueChanges.pipe(debounceTime(1000)).subscribe(() => this.guardarBorrador());
  }

  guardarBorrador(): void {
    const valor = this.form.getRawValue();
    const registro: RegistroAtencionPrehospitalaria = { ...this.registroActual, ...valor };
    this.registroService.guardar(registro);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```powershell
npx ng test --watch=false --browsers=ChromeHeadless
```

Expected: PASS (4 specs). If the debounce test is flaky because `ngOnInit`'s `await this.registroService.listar()` resolves asynchronously before the subscription is set up, change that test to `fakeAsync` with an initial `tick()` before setting the value, to let `ngOnInit`'s microtasks flush first:

```typescript
  it('un cambio en el formulario dispara guardar() (autosave) después del debounce', fakeAsync(() => {
    tick();
    fixture.componentInstance.form.get('folio')!.setValue('12345');
    tick(1500);
    expect(servicioFalso.guardar).toHaveBeenCalled();
  }));
```

- [ ] **Step 5: Remove the dead `*ngIf="false"` placeholder button used only to keep the template valid before Tasks 12–13 add the real export buttons**

Edit the template, delete the line:
```html
<button type="button" mat-stroked-button (click)="exportarPdf.emit(form.getRawValue())" *ngIf="false"></button>
```

- [ ] **Step 6: Run tests again and commit**

```powershell
npx ng test --watch=false --browsers=ChromeHeadless
```

```powershell
git add -A
git commit -m "feat: add root formulario component with accordion nav and autosave

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 12: PDF export (print view)

**Files:**
- Create: `src/app/features/exportacion/pdf-vista/pdf-vista.component.ts`
- Modify: `src/app/features/formulario/formulario.component.ts` (add "Exportar PDF" button + print styles)
- Modify: `src/styles.scss` (global `@media print` rules)
- Test: `src/app/features/formulario/formulario.component.spec.ts` (add one spec)

**Interfaces:**
- Consumes: `SECCIONES` (Task 3), `CATALOGO_MATERIAL` (Task 4), `form.getRawValue()` shape from Task 11.
- Produces: standalone `PdfVistaComponent`, `@Input() registro!: Record<string, any>`, selector `app-pdf-vista`.

- [ ] **Step 1: Write the failing test (button triggers `window.print`)**

Add to `formulario.component.spec.ts`:

```typescript
  it('el botón "Exportar PDF" llama a window.print()', () => {
    spyOn(window, 'print');
    const boton: HTMLButtonElement = fixture.nativeElement.querySelector('button.exportar-pdf');
    boton.click();
    expect(window.print).toHaveBeenCalled();
  });
```

- [ ] **Step 2: Run test to verify it fails**

```powershell
npx ng test --watch=false --browsers=ChromeHeadless
```

Expected: FAIL — no `button.exportar-pdf` in the DOM yet.

- [ ] **Step 3: Write `pdf-vista.component.ts`**

```typescript
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SECCIONES } from '../../../core/data/secciones.data';
import { CATALOGO_MATERIAL } from '../../../core/data/material-utilizado.data';
import { SeccionFormulario } from '../../../core/models/campo-formulario.model';

@Component({
  selector: 'app-pdf-vista',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pagina-pdf">
      <header class="encabezado-pdf">
        <h1>UMAM — Registro de Atención Prehospitalaria</h1>
        <div class="folio">Folio: {{ registro?.folio }}</div>
      </header>

      <section class="seccion-pdf" *ngFor="let seccion of secciones">
        <h2>{{ seccion.titulo }}</h2>
        <table>
          <tr *ngFor="let campo of seccion.campos">
            <th>{{ campo.etiqueta }}</th>
            <td>{{ valorCampo(seccion.clave, campo.clave) }}</td>
          </tr>
        </table>
        <table class="tabla-repetible-pdf" *ngFor="let tabla of seccion.tablas ?? []">
          <caption>{{ tabla.titulo }}</caption>
          <tr>
            <th *ngFor="let columna of tabla.columnas">{{ columna.etiqueta }}</th>
          </tr>
          <tr *ngFor="let fila of (registro?.[tabla.clave] ?? [])">
            <td *ngFor="let columna of tabla.columnas">{{ fila[columna.clave] }}</td>
          </tr>
        </table>
      </section>

      <section class="seccion-pdf">
        <h2>Material Utilizado</h2>
        <div class="categoria-pdf" *ngFor="let categoria of categorias">
          <h3>{{ categoria.nombre }}</h3>
          <ul>
            <li *ngFor="let item of categoria.items" [class.marcado]="registro?.materialUtilizado?.[item.clave]?.marcado">
              {{ item.nombre }}
              <span *ngIf="registro?.materialUtilizado?.[item.clave]?.cantidad as cantidad">— {{ cantidad }}</span>
            </li>
          </ul>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .encabezado-pdf { background: #1892d3; color: white; padding: 8px 12px; }
    .seccion-pdf h2 { color: #1892d3; border-bottom: 2px solid #1892d3; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    th, td { border: 1px solid #b9def2; padding: 4px 6px; text-align: left; font-size: 12px; }
    li.marcado { font-weight: 600; }
    li:not(.marcado) { color: #999; text-decoration: line-through; }
    @media print {
      .pagina-pdf { break-inside: avoid-page; }
      .seccion-pdf { break-inside: avoid; }
    }
  `],
})
export class PdfVistaComponent {
  @Input() registro: Record<string, any> | undefined;
  secciones: SeccionFormulario[] = SECCIONES;
  categorias = CATALOGO_MATERIAL;

  valorCampo(seccionClave: string, campoClave: string): string {
    const seccionValor = this.registro?.[seccionClave];
    const valor = seccionValor?.[campoClave];
    if (Array.isArray(valor)) return valor.join(', ');
    return valor ?? '';
  }
}
```

- [ ] **Step 4: Wire it into `formulario.component.ts`**

Add to the imports array: `PdfVistaComponent` (import from `../exportacion/pdf-vista/pdf-vista.component`).

Add to the template, inside `.barra-acciones`, replacing the removed placeholder button:

```html
<button type="button" class="exportar-pdf" mat-stroked-button (click)="exportarPdf()">
  <mat-icon>picture_as_pdf</mat-icon> Exportar PDF
</button>
```

Add after `</div>` closing `.barra-acciones`, still inside the component template, a hidden print-only view:

```html
<div class="solo-impresion">
  <app-pdf-vista [registro]="form.getRawValue()"></app-pdf-vista>
</div>
```

Add to the component styles:

```scss
.solo-impresion { display: none; }
@media print {
  .encabezado, .nav-lateral, .barra-acciones, .contenido { display: none !important; }
  .solo-impresion { display: block !important; }
}
```

Add the method to the component class:

```typescript
  exportarPdf(): void {
    window.print();
  }
```

- [ ] **Step 5: Run test to verify it passes**

```powershell
npx ng test --watch=false --browsers=ChromeHeadless
```

Expected: PASS (5 specs in `formulario.component.spec.ts`).

- [ ] **Step 6: Manual verification of the print layout**

```powershell
npx ng serve
```

Open `http://localhost:4200`, fill a few fields, click "Exportar PDF", and use the browser's print preview to confirm the print-only view (not the on-screen accordion) is what's shown, with the UMAM blue headers. Save as PDF once to confirm the flow works end to end. Stop the dev server (Ctrl+C) when done.

- [ ] **Step 7: Commit**

```powershell
git add -A
git commit -m "feat: add PDF export via dedicated print view

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 13: Excel export

**Files:**
- Create: `src/app/features/exportacion/excel-exportador.service.ts`
- Test: `src/app/features/exportacion/excel-exportador.service.spec.ts`
- Modify: `src/app/features/formulario/formulario.component.ts` (add "Exportar Excel" button)
- Modify: `package.json` (add `exceljs`, `file-saver`, `@types/file-saver`)

**Interfaces:**
- Consumes: `SECCIONES` (Task 3), `CATALOGO_MATERIAL` (Task 4), the same `registro` shape used in Task 12.
- Produces: `ExcelExportadorService` with `construirLibro(registro): Promise<ExcelJS.Workbook>` and `exportar(registro): Promise<void>` (consumed by Task 11's button handler).

- [ ] **Step 1: Install dependencies**

```powershell
npm install exceljs file-saver
npm install --save-dev @types/file-saver
```

- [ ] **Step 2: Write the failing test**

Create `src/app/features/exportacion/excel-exportador.service.spec.ts`:

```typescript
import { ExcelExportadorService } from './excel-exportador.service';
import { crearRegistroVacio } from '../../core/models/registro.model';
import { SECCIONES } from '../../core/data/secciones.data';
import { CATALOGO_MATERIAL } from '../../core/data/material-utilizado.data';

describe('ExcelExportadorService', () => {
  const servicio = new ExcelExportadorService();

  it('construirLibro() crea una hoja por cada sección más una hoja de material utilizado', async () => {
    const registro = crearRegistroVacio();
    const libro = await servicio.construirLibro(registro as any);

    const nombresHojas = libro.worksheets.map(h => h.name);
    for (const seccion of SECCIONES) {
      expect(nombresHojas).withContext(seccion.clave).toContain(seccion.titulo.slice(0, 31));
    }
    expect(nombresHojas).toContain('Material Utilizado');
  });

  it('la hoja de una sección tiene el valor del campo en la fila correspondiente', async () => {
    const registro = crearRegistroVacio();
    (registro as any).control.operador = 'Juan Pérez';
    const libro = await servicio.construirLibro(registro as any);

    const hoja = libro.getWorksheet('III. Control');
    const filaOperador = hoja!.getRows(1, hoja!.rowCount)!.find(f => f.getCell(1).text === 'Operador');
    expect(filaOperador!.getCell(2).text).toBe('Juan Pérez');
  });

  it('el encabezado de cada hoja tiene relleno de color (mismo diseño que el documento)', async () => {
    const registro = crearRegistroVacio();
    const libro = await servicio.construirLibro(registro as any);
    const hoja = libro.getWorksheet('III. Control');
    const encabezado = hoja!.getRow(1);
    expect(encabezado.getCell(1).fill).toBeTruthy();
  });

  it('la hoja de material utilizado marca los ítems seleccionados', async () => {
    const registro = crearRegistroVacio();
    const primerItem = CATALOGO_MATERIAL[0].items[0];
    registro.materialUtilizado[primerItem.clave] = { marcado: true, cantidad: '3' };
    const libro = await servicio.construirLibro(registro);

    const hoja = libro.getWorksheet('Material Utilizado');
    const fila = hoja!.getRows(1, hoja!.rowCount)!.find(f => f.getCell(1).text === primerItem.nombre);
    expect(fila!.getCell(2).text).toBe('Sí');
    expect(fila!.getCell(3).text).toBe('3');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```powershell
npx ng test --watch=false --browsers=ChromeHeadless
```

Expected: FAIL — service does not exist.

- [ ] **Step 4: Write `excel-exportador.service.ts`**

```typescript
import { Injectable } from '@angular/core';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { SECCIONES } from '../../core/data/secciones.data';
import { CATALOGO_MATERIAL } from '../../core/data/material-utilizado.data';
import { RegistroAtencionPrehospitalaria } from '../../core/models/registro.model';

const RELLENO_ENCABEZADO: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1892D3' },
};
const FUENTE_ENCABEZADO: Partial<ExcelJS.Font> = { color: { argb: 'FFFFFFFF' }, bold: true };

@Injectable({ providedIn: 'root' })
export class ExcelExportadorService {
  async construirLibro(registro: RegistroAtencionPrehospitalaria): Promise<ExcelJS.Workbook> {
    const libro = new ExcelJS.Workbook();
    libro.creator = 'UMAM';
    libro.created = new Date();

    for (const seccion of SECCIONES) {
      const hoja = libro.addWorksheet(seccion.titulo.slice(0, 31));
      hoja.columns = [{ header: 'Campo', key: 'campo', width: 40 }, { header: 'Valor', key: 'valor', width: 40 }];
      this.estilizarFilaEncabezado(hoja.getRow(1));

      const valoresSeccion = (registro as Record<string, unknown>)[seccion.clave] as Record<string, unknown> | undefined;
      for (const campo of seccion.campos) {
        const valorCrudo = valoresSeccion?.[campo.clave];
        const valor = Array.isArray(valorCrudo) ? valorCrudo.join(', ') : (valorCrudo ?? '');
        hoja.addRow({ campo: campo.etiqueta, valor });
      }

      for (const tabla of seccion.tablas ?? []) {
        hoja.addRow([]);
        const filaTitulo = hoja.addRow([tabla.titulo]);
        filaTitulo.font = { bold: true };
        const filaColumnas = hoja.addRow(tabla.columnas.map(c => c.etiqueta));
        this.estilizarFilaEncabezado(filaColumnas);
        const filas = (registro as Record<string, unknown>)[tabla.clave] as Record<string, unknown>[] | undefined ?? [];
        for (const fila of filas) {
          hoja.addRow(tabla.columnas.map(c => fila[c.clave] ?? ''));
        }
      }
    }

    const hojaMaterial = libro.addWorksheet('Material Utilizado');
    hojaMaterial.columns = [
      { header: 'Ítem', key: 'item', width: 40 },
      { header: 'Utilizado', key: 'utilizado', width: 12 },
      { header: 'Cantidad / Medida', key: 'cantidad', width: 20 },
    ];
    this.estilizarFilaEncabezado(hojaMaterial.getRow(1));
    for (const categoria of CATALOGO_MATERIAL) {
      const filaCategoria = hojaMaterial.addRow([categoria.nombre]);
      filaCategoria.font = { bold: true };
      for (const item of categoria.items) {
        const dato = registro.materialUtilizado[item.clave];
        hojaMaterial.addRow({
          item: item.nombre,
          utilizado: dato?.marcado ? 'Sí' : 'No',
          cantidad: dato?.cantidad ?? '',
        });
      }
    }

    return libro;
  }

  async exportar(registro: RegistroAtencionPrehospitalaria): Promise<void> {
    const libro = await this.construirLibro(registro);
    const buffer = await libro.xlsx.writeBuffer();
    const nombreArchivo = `umam-registro-${registro.folio || registro.id}.xlsx`;
    saveAs(new Blob([buffer], { type: 'application/octet-stream' }), nombreArchivo);
  }

  private estilizarFilaEncabezado(fila: ExcelJS.Row): void {
    fila.eachCell(celda => {
      celda.fill = RELLENO_ENCABEZADO;
      celda.font = FUENTE_ENCABEZADO;
    });
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

```powershell
npx ng test --watch=false --browsers=ChromeHeadless
```

Expected: PASS (4 specs).

- [ ] **Step 6: Wire the button into `formulario.component.ts`**

Add to the constructor's injected dependencies: `private excelExportador: ExcelExportadorService` (import from `../exportacion/excel-exportador.service`).

Add to the template inside `.barra-acciones`:

```html
<button type="button" class="exportar-excel" mat-stroked-button (click)="exportarExcel()">
  <mat-icon>grid_on</mat-icon> Exportar Excel
</button>
```

Add the method:

```typescript
  exportarExcel(): void {
    const valor = this.form.getRawValue();
    const registro = { ...this.registroActual, ...valor };
    this.excelExportador.exportar(registro);
  }
```

- [ ] **Step 7: Add a spec for the button and run the full suite**

Add to `formulario.component.spec.ts`:

```typescript
  it('el botón "Exportar Excel" llama a ExcelExportadorService.exportar()', () => {
    spyOn(fixture.componentInstance['excelExportador'], 'exportar');
    const boton: HTMLButtonElement = fixture.nativeElement.querySelector('button.exportar-excel');
    boton.click();
    expect(fixture.componentInstance['excelExportador'].exportar).toHaveBeenCalled();
  });
```

```powershell
npx ng test --watch=false --browsers=ChromeHeadless
npx ng build
```

Expected: all specs PASS, build succeeds.

- [ ] **Step 8: Commit**

```powershell
git add -A
git commit -m "feat: add Excel export matching UMAM document colors and sections

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 14: App shell and final verification

**Files:**
- Modify: `src/app/app.component.ts`
- Create: `README.md`

**Interfaces:**
- Consumes: `FormularioComponent` (Task 11).

- [ ] **Step 1: Wire `FormularioComponent` as the app shell**

Edit `src/app/app.component.ts` to import and render `FormularioComponent` as the entire template (`<app-formulario></app-formulario>`), removing the CLI-generated boilerplate template/styles.

- [ ] **Step 2: Run the full test suite and build**

```powershell
npx ng test --watch=false --browsers=ChromeHeadless
npx ng build
```

Expected: all specs PASS (should be 25+ specs across all files by now), build succeeds with no errors.

- [ ] **Step 3: Write `README.md`**

```markdown
# Formato UMAM Digital

Formulario web (Angular 22) que reproduce el "Registro de Atención
Prehospitalaria" de UMAM, con exportación a PDF y Excel respetando el
diseño del documento. Ver `docs/superpowers/specs/2026-08-06-formato-umam-design.md`
para el diseño completo y `docs/superpowers/plans/2026-08-06-formato-umam-angular.md`
para el plan de implementación.

## Uso

```powershell
npm install
npx ng serve
```

Abre `http://localhost:4200`. Los datos se guardan automáticamente en el
navegador (localStorage) mientras se llena el formulario.

## Conectar un backend real

Los componentes solo dependen de la interfaz `RegistroService`
(`src/app/core/services/registro.service.ts`). Para usar una API real:

1. Crea `ApiRegistroService implements RegistroService` usando `HttpClient`.
2. En `src/app/app.config.ts`, cambia `useClass: LocalStorageRegistroService`
   por `useClass: ApiRegistroService`.

Ningún componente necesita cambios.

## Pruebas

```powershell
npx ng test --watch=false --browsers=ChromeHeadless
```
```

- [ ] **Step 4: Manual end-to-end verification**

```powershell
npx ng serve
```

In the browser: fill at least one field per section, add a row to each of the 3 repeatable tables, check several Material Utilizado items (including one with a "medida" quantity field), reload the page and confirm the data persisted (autosave), then click "Exportar PDF" (confirm the print preview shows the UMAM-blue print layout) and "Exportar Excel" (open the downloaded `.xlsx` and confirm the blue header rows, section sheets, and the Material Utilizado sheet with "Sí"/"No" + cantidad). Stop the dev server (Ctrl+C).

- [ ] **Step 5: Commit**

```powershell
git add -A
git commit -m "feat: wire formulario as app shell, add README

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Plan Self-Review Notes

- **Spec coverage:** all 14 paper sections (Task 3) + material catalog (Task 4) + accordion/nav/autosave (Task 11) + PDF export (Task 12) + Excel export (Task 13) + backend-ready service layer (Task 10) are each covered by a task. The three approved scope reductions (text-field signatures, checkbox body zones, text-field MP seal) are reflected directly in the section field configs (Task 3), not left as later TODOs.
- **Type consistency:** `CampoFormulario`/`SeccionFormulario`/`TablaRepetible` (Task 2) are the same types imported unchanged through Tasks 3, 5–9, 12–13. `construirFormularioRegistro` (Task 5) is the only place the form tree is built, and Tasks 8, 9, 11 all read from its output rather than rebuilding form structure themselves.
- **Known follow-up, not a blocker:** Task 5's `filasDeTabla` in `SeccionAcordeonComponent` (Task 8) reads sibling `FormArray`s via `grupo.parent`, which only works once the section `FormGroup` is actually nested inside the root form built by Task 5 — this is true from Task 11 onward (where `SeccionAcordeonComponent` is used for real) but not in Task 8's own isolated unit test, which is why that test deliberately uses a section with no `tablas`.
