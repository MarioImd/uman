import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { SECCIONES } from '../data/secciones.data';
import { RegistroAtencionPrehospitalaria } from '../models/registro.model';

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
      controlesSeccion[campo.clave] = [valoresSeccion?.[campo.clave] ?? valorPorDefecto];
    }
    grupo[seccion.clave] = fb.group(controlesSeccion);

    for (const tabla of seccion.tablas ?? []) {
      const filasGuardadas = (registro as unknown as Record<string, unknown>)[tabla.clave] as Record<string, unknown>[] | undefined ?? [];
      const filas = filasGuardadas.map(fila =>
        fb.group(Object.fromEntries(tabla.columnas.map(c => [c.clave, [fila[c.clave] ?? '']]))),
      );
      grupo[tabla.clave] = fb.array(filas);
    }
  }

  return fb.group(grupo);
}

export function nuevaFilaTabla(fb: FormBuilder, columnas: { clave: string }[]): FormGroup {
  return fb.group(Object.fromEntries(columnas.map(c => [c.clave, ['']])));
}
