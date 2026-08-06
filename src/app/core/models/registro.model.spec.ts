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
