import { SECCIONES } from './secciones.data';

describe('SECCIONES', () => {
  it('define las 15 secciones del formulario (excluye material utilizado)', () => {
    expect(SECCIONES.length).toBe(15);
    const claves = SECCIONES.map(s => s.clave);
    expect(claves).toEqual([
      'datosGenerales', 'datosServicio', 'control', 'datosPaciente', 'causaTraumatica',
      'causaClinica', 'parto', 'evaluacionInicial', 'evaluacionSecundaria',
      'anamnesis', 'tratamiento', 'traslado', 'observaciones',
      'datosLegales', 'hospitalReceptor',
    ]);
  });

  it('datosGenerales es la primera sección y trae los campos folio/estado/ciudad', () => {
    const seccion = SECCIONES[0];
    expect(seccion.clave).toBe('datosGenerales');
    expect(seccion.campos.map(c => c.clave)).toEqual(['folio', 'estado', 'ciudad']);
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
