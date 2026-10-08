import { ExcelExportadorService } from './excel-exportador.service';
import { crearRegistroVacio } from '../../core/models/registro.model';
import { SECCIONES } from '../../core/data/secciones.data';

describe('ExcelExportadorService', () => {
  const servicio = new ExcelExportadorService();

  it('construirLibro() crea una hoja por cada sección', async () => {
    const registro = crearRegistroVacio();
    const libro = await servicio.construirLibro(registro as any);

    const nombresHojas = libro.worksheets.map(h => h.name);
    for (const seccion of SECCIONES) {
      expect(nombresHojas).withContext(seccion.clave).toContain(seccion.titulo.slice(0, 31));
    }
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

  it('un campo tipo checkbox (booleano) se imprime como "Sí"/"No", no como "true"/"false"', async () => {
    const registro = crearRegistroVacio();
    (registro as any).causaTraumatica.eyectado = true;
    (registro as any).observaciones.ministerioPublicoNotificado = false;
    const libro = await servicio.construirLibro(registro as any);

    const hojaCausaTraumatica = libro.getWorksheet('V. Causa Traumática');
    const filaEyectado = hojaCausaTraumatica!.getRows(1, hojaCausaTraumatica!.rowCount)!.find(f => f.getCell(1).text === 'Eyectado');
    expect(filaEyectado!.getCell(2).text).toBe('Sí');

    const hojaObservaciones = libro.getWorksheet('XIII. Observaciones');
    const filaMp = hojaObservaciones!.getRows(1, hojaObservaciones!.rowCount)!.find(f => f.getCell(1).text === 'Ministerio Público notificado');
    expect(filaMp!.getCell(2).text).toBe('No');
  });

  it('un campo tipo "imagenes" se resume como cantidad adjunta en vez de volcar el base64', async () => {
    const registro = crearRegistroVacio();
    (registro as any).hospitalReceptor.imagenesEkgRxLaboratorios = ['data:image/png;base64,AAA', 'data:image/png;base64,BBB'];
    const libro = await servicio.construirLibro(registro as any);

    const hoja = libro.getWorksheet('XVI. Hospital Receptor');
    const fila = hoja!.getRows(1, hoja!.rowCount)!.find(f => f.getCell(1).text === 'Imágenes de EKG, Rx y/o laboratorios');
    expect(fila!.getCell(2).text).toContain('2 imagen(es) adjunta(s)');
  });

  it('un campo tipo "firma" se resume como "Firmado"/"Sin firmar" en vez de volcar el base64', async () => {
    const registro = crearRegistroVacio();
    (registro as any).hospitalReceptor.firmaQuienEntrega = 'data:image/png;base64,FIRMAENTREGA';
    const libro = await servicio.construirLibro(registro as any);

    const hoja = libro.getWorksheet('XVI. Hospital Receptor');
    const filas = hoja!.getRows(1, hoja!.rowCount)!;
    const filaFirmada = filas.find(f => f.getCell(1).text === 'Firma de quien entrega al paciente');
    const filaSinFirmar = filas.find(f => f.getCell(1).text === 'Firma de persona que recibe al paciente');
    expect(filaFirmada!.getCell(2).text).toBe('Firmado — ver PDF');
    expect(filaSinFirmar!.getCell(2).text).toBe('Sin firmar');
  });
});

describe('ExcelExportadorService — Datos Generales', () => {
  it('llena la hoja "I. Datos Generales" con folio/estado/ciudad de la raíz del registro (registros leídos del servidor)', async () => {
    const registro = { ...crearRegistroVacio(), folio: 'F-77', estado: 'Chihuahua', ciudad: 'Juárez' };
    const libro = await new ExcelExportadorService().construirLibro(registro);
    const hoja = libro.getWorksheet('I. Datos Generales')!;
    const valor = (etiqueta: string) => hoja.getRows(1, hoja.rowCount)!.find(f => f.getCell(1).text === etiqueta)!.getCell(2).text;
    expect(valor('Folio')).toBe('F-77');
    expect(valor('Estado')).toBe('Chihuahua');
    expect(valor('Ciudad')).toBe('Juárez');
  });
});
