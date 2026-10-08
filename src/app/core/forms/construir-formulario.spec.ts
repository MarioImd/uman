import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { construirFormularioRegistro } from './construir-formulario';
import { crearRegistroVacio } from '../models/registro.model';
import { SECCIONES } from '../data/secciones.data';

describe('construirFormularioRegistro', () => {
  const fb = new FormBuilder();

  it('crea un FormGroup por cada sección, incluyendo datosGenerales con folio/estado/ciudad', () => {
    const form = construirFormularioRegistro(fb, crearRegistroVacio());

    const datosGenerales = form.get('datosGenerales') as FormGroup;
    expect(datosGenerales.contains('folio')).toBeTrue();
    expect(datosGenerales.contains('estado')).toBeTrue();
    expect(datosGenerales.contains('ciudad')).toBeTrue();

    for (const seccion of SECCIONES) {
      expect(form.contains(seccion.clave)).toBeTrue();
      const grupoSeccion = form.get(seccion.clave)!;
      for (const campo of seccion.campos) {
        expect(grupoSeccion.get(campo.clave)).withContext(`${seccion.clave}.${campo.clave}`).toBeTruthy();
      }
    }
  });

  it('siembra datosGenerales.folio/estado/ciudad desde los campos planos del registro', () => {
    const registro = { ...crearRegistroVacio(), folio: 'F-100', estado: 'Chihuahua', ciudad: 'Cd. Juárez' };
    const form = construirFormularioRegistro(fb, registro);
    expect(form.get('datosGenerales')!.get('folio')!.value).toBe('F-100');
    expect(form.get('datosGenerales')!.get('estado')!.value).toBe('Chihuahua');
    expect(form.get('datosGenerales')!.get('ciudad')!.value).toBe('Cd. Juárez');
  });

  it('crea un FormArray vacío por cada tabla repetible', () => {
    const form = construirFormularioRegistro(fb, crearRegistroVacio());
    expect(form.get('signosVitales')).toBeTruthy();
    expect((form.get('signosVitales') as any).length).toBe(0);
    expect(form.get('manejoFarmacologico')).toBeTruthy();
    expect(form.get('vehiculosInvolucrados')).toBeTruthy();
  });

  it('un campo tipo "imagenes" tiene valor por defecto [] (arreglo de imágenes)', () => {
    const form = construirFormularioRegistro(fb, crearRegistroVacio());
    const control = form.get('hospitalReceptor')!.get('imagenesEkgRxLaboratorios')!;
    expect(control.value).toEqual([]);
  });

  it('un campo tipo "checkbox" (booleano simple) tiene valor por defecto false, no []', () => {
    const form = construirFormularioRegistro(fb, crearRegistroVacio());
    // causaTraumatica.eyectado es un campo tipo 'checkbox' (booleano simple, no checkbox-grupo).
    const control = form.get('causaTraumatica')!.get('eyectado')!;
    expect(control.value).toBe(false);
    expect(Array.isArray(control.value)).toBeFalse();
  });

  it('un campo tipo "checkbox-grupo" sigue teniendo valor por defecto []', () => {
    const form = construirFormularioRegistro(fb, crearRegistroVacio());
    const control = form.get('causaTraumatica')!.get('agenteCausal')!;
    expect(control.value).toEqual([]);
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

describe('construirFormularioRegistro — rangos numéricos', () => {
  it('marca como inválido un valor fuera del rango definido en secciones.data.ts', () => {
    const form = construirFormularioRegistro(new FormBuilder(), crearRegistroVacio());
    const glasgow = form.get('anamnesis')!.get('glasgowOcular')!;

    glasgow.setValue(5);
    expect(glasgow.hasError('max')).toBeTrue();
    glasgow.setValue(0);
    expect(glasgow.hasError('min')).toBeTrue();
    glasgow.setValue(4);
    expect(glasgow.valid).toBeTrue();
    glasgow.setValue('');
    expect(glasgow.valid).withContext('vacío es válido (borrador)').toBeTrue();
  });

  it('las filas de tablas repetibles también validan su rango (SpO2 0–100)', () => {
    const registro = { ...crearRegistroVacio(), signosVitales: [{ spo2: 120 }] };
    const form = construirFormularioRegistro(new FormBuilder(), registro);
    const spo2 = (form.get('signosVitales') as FormArray).at(0).get('spo2')!;
    expect(spo2.hasError('max')).toBeTrue();
  });
});
