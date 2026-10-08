import { FormBuilder, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { SECCIONES } from '../data/secciones.data';
import { CampoFormulario } from '../models/campo-formulario.model';
import { RegistroAtencionPrehospitalaria } from '../models/registro.model';

/**
 * Validadores de rango para campos numéricos (min/max definidos en
 * secciones.data.ts). Un valor fuera de rango no se bloquea — el registro es
 * un borrador y se sigue autoguardando —, pero el campo se marca en rojo con
 * un mensaje para que el paramédico lo revise.
 */
function validadoresDe(campo: CampoFormulario): ValidatorFn[] {
  const validadores: ValidatorFn[] = [];
  if (campo.min !== undefined) validadores.push(Validators.min(campo.min));
  if (campo.max !== undefined) validadores.push(Validators.max(campo.max));
  return validadores;
}

export function construirFormularioRegistro(
  fb: FormBuilder,
  registro: RegistroAtencionPrehospitalaria,
): FormGroup {
  const grupo: Record<string, unknown> = {};

  for (const seccion of SECCIONES) {
    // 'datosGenerales' es una sección normal en SECCIONES (para que el acordeón y
    // ambos exportadores la recorran igual que cualquier otra), pero sus valores
    // guardados viven como campos planos en la raíz del modelo (registro.folio,
    // registro.estado, registro.ciudad) en vez de bajo registro.datosGenerales
    // — así que sembramos el grupo desde ahí en vez de leer registro[seccion.clave].
    const valoresSeccion = seccion.clave === 'datosGenerales'
      ? { folio: registro.folio, estado: registro.estado, ciudad: registro.ciudad }
      : (registro as unknown as Record<string, unknown>)[seccion.clave] as Record<string, unknown> | undefined;
    const controlesSeccion: Record<string, unknown> = {};
    for (const campo of seccion.campos) {
      const valorPorDefecto = campo.tipo === 'checkbox'
        ? false
        : campo.tipo === 'checkbox-grupo' || campo.tipo === 'imagenes'
          ? []
          : '';
      controlesSeccion[campo.clave] = [valoresSeccion?.[campo.clave] ?? valorPorDefecto, validadoresDe(campo)];
    }
    grupo[seccion.clave] = fb.group(controlesSeccion);

    for (const tabla of seccion.tablas ?? []) {
      const filasGuardadas = (registro as unknown as Record<string, unknown>)[tabla.clave] as Record<string, unknown>[] | undefined ?? [];
      const filas = filasGuardadas.map(fila => nuevaFilaTabla(fb, tabla.columnas, fila));
      grupo[tabla.clave] = fb.array(filas);
    }
  }

  return fb.group(grupo);
}

/** Una fila de tabla repetible (vacía, o con los valores guardados de `fila`). */
export function nuevaFilaTabla(
  fb: FormBuilder,
  columnas: CampoFormulario[],
  fila: Record<string, unknown> = {},
): FormGroup {
  return fb.group(Object.fromEntries(columnas.map(c => [c.clave, [fila[c.clave] ?? '', validadoresDe(c)]])));
}
