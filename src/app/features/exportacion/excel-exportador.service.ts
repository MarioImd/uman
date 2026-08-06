import { Injectable } from '@angular/core';
import * as ExcelJS from 'exceljs';
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

      const valoresSeccion = (registro as unknown as Record<string, unknown>)[seccion.clave] as Record<string, unknown> | undefined;
      for (const campo of seccion.campos) {
        const valorCrudo = valoresSeccion?.[campo.clave];
        const valor = typeof valorCrudo === 'boolean'
          ? (valorCrudo ? 'Sí' : 'No')
          : Array.isArray(valorCrudo) ? valorCrudo.join(', ') : (valorCrudo ?? '');
        hoja.addRow({ campo: campo.etiqueta, valor });
      }

      for (const tabla of seccion.tablas ?? []) {
        hoja.addRow([]);
        const filaTitulo = hoja.addRow([tabla.titulo]);
        filaTitulo.font = { bold: true };
        const filaColumnas = hoja.addRow(tabla.columnas.map(c => c.etiqueta));
        this.estilizarFilaEncabezado(filaColumnas);
        const filas = (registro as unknown as Record<string, unknown>)[tabla.clave] as Record<string, unknown>[] | undefined ?? [];
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
