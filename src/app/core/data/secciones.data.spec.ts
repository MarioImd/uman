import { SECCIONES } from './secciones.data';

describe('SECCIONES', () => {
  it('define las 16 secciones del formulario (excluye material utilizado, incluye consentimiento informado)', () => {
    expect(SECCIONES.length).toBe(16);
    const claves = SECCIONES.map(s => s.clave);
    expect(claves).toEqual([
      'datosGenerales', 'datosServicio', 'control', 'datosPaciente', 'causaTraumatica',
      'causaClinica', 'parto', 'evaluacionInicial', 'evaluacionSecundaria',
      'anamnesis', 'tratamiento', 'traslado', 'observaciones',
      'datosLegales', 'hospitalReceptor', 'consentimientoInformado',
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

  it('evaluacionSecundaria trae la tabla de signos vitales con sus columnas (EtCO2 y hallazgos EKG en vez de EKG/examen neurológico)', () => {
    const seccion = SECCIONES.find(s => s.clave === 'evaluacionSecundaria')!;
    const tabla = seccion.tablas!.find(t => t.clave === 'signosVitales')!;
    expect(tabla.columnas.map(c => c.clave)).toEqual([
      'hora', 'fr', 'fc', 'tas', 'tad', 'spo2', 'temp', 'gluc', 'etco2', 'hallazgosEkg',
    ]);
  });

  it('tratamiento trae la tabla de manejo farmacológico', () => {
    const seccion = SECCIONES.find(s => s.clave === 'tratamiento')!;
    const tabla = seccion.tablas!.find(t => t.clave === 'manejoFarmacologico')!;
    expect(tabla.columnas.map(c => c.clave)).toEqual([
      'hora', 'medicamento', 'dosis', 'viaAdministracion', 'terapiaElectrica',
    ]);
  });

  it('datosLegales trae la tabla de vehículos involucrados y ya no tiene posición/orientación ni compañía de seguro de automóvil', () => {
    const seccion = SECCIONES.find(s => s.clave === 'datosLegales')!;
    const tabla = seccion.tablas!.find(t => t.clave === 'vehiculosInvolucrados')!;
    expect(tabla.columnas.map(c => c.clave)).toEqual(['tipoMarca', 'placas']);
    const claves = seccion.campos.map(c => c.clave);
    expect(claves).not.toContain('posicionOrientacionPaciente');
    expect(claves).not.toContain('companiaSeguroAutomovil');
  });

  it('hospitalReceptor trae el campo de imágenes de EKG/Rx/laboratorios', () => {
    const seccion = SECCIONES.find(s => s.clave === 'hospitalReceptor')!;
    const campo = seccion.campos.find(c => c.clave === 'imagenesEkgRxLaboratorios')!;
    expect(campo).toBeTruthy();
    expect(campo.tipo).toBe('imagenes');
  });

  it('consentimientoInformado trae los campos de firma', () => {
    const seccion = SECCIONES.find(s => s.clave === 'consentimientoInformado')!;
    expect(seccion.campos.map(c => c.clave)).toEqual([
      'nombrePacienteConsentimiento', 'nombreResponsableConsentimiento', 'nombreParamedicoConsentimiento',
    ]);
  });

  it('datosServicio ya no tiene hora de llamada, calle ni entre calles, y sí responsable de entrega', () => {
    const seccion = SECCIONES.find(s => s.clave === 'datosServicio')!;
    const claves = seccion.campos.map(c => c.clave);
    expect(claves).not.toContain('horaLlamada');
    expect(claves).not.toContain('calle');
    expect(claves).not.toContain('entreCalle1');
    expect(claves).not.toContain('entreCalle2');
    expect(claves).toContain('responsableEntregaPaciente');
  });

  it('control ya no tiene iniciales de ambulancia', () => {
    const seccion = SECCIONES.find(s => s.clave === 'control')!;
    expect(seccion.campos.map(c => c.clave)).not.toContain('ambulanciaIniciales');
  });

  it('datosPaciente ya no tiene lugar de nacimiento y renombró derechohabiente/compañía de seguro', () => {
    const seccion = SECCIONES.find(s => s.clave === 'datosPaciente')!;
    const claves = seccion.campos.map(c => c.clave);
    expect(claves).not.toContain('lugarNacimiento');
    expect(claves).not.toContain('derechohabienteA');
    expect(claves).not.toContain('companiaSeguroGastosMedicos');
    expect(claves).toContain('numeroEmpleado');
    expect(claves).toContain('tipoServicioMedico');
  });

  it('anamnesis ya no tiene trauma score y sí NEWS2', () => {
    const seccion = SECCIONES.find(s => s.clave === 'anamnesis')!;
    const claves = seccion.campos.map(c => c.clave);
    expect(claves).not.toContain('traumaScoreTas');
    expect(claves).not.toContain('traumaScoreFr');
    expect(claves).not.toContain('traumaScoreTotal');
    expect(claves).toContain('news2Total');
  });

  it('tratamiento agrega ventilación mecánica y parámetros del ventilador, y quita opciones retiradas', () => {
    const seccion = SECCIONES.find(s => s.clave === 'tratamiento')!;
    const claves = seccion.campos.map(c => c.clave);
    expect(claves).toContain('ventilacionMecanica');
    expect(claves).toContain('relacionIE');
    expect(claves).toContain('fio2');
    expect(claves).toContain('ps');

    const viaAerea = seccion.campos.find(c => c.clave === 'viaAereaTratamiento')!;
    expect(viaAerea.opciones).not.toContain('Intubación nasotraqueal');

    const asistencia = seccion.campos.find(c => c.clave === 'asistenciaVentilatoria')!;
    expect(asistencia.opciones).not.toContain('Válvula de demanda');

    const oxigenoterapia = seccion.campos.find(c => c.clave === 'oxigenoterapia')!;
    expect(oxigenoterapia.opciones).toContain('Mascarilla para nebulizar');
    expect(oxigenoterapia.opciones).not.toContain('Mascarilla venturi');

    const hemorragias = seccion.campos.find(c => c.clave === 'controlHemorragias')!;
    expect(hemorragias.opciones).not.toContain('Pinzamiento de vaso');
  });
});
