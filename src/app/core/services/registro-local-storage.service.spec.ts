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
    expect(todos.map((r) => r.id).sort()).toEqual([uno.id, dos.id].sort());
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

  it('listar() devuelve [] (no lanza) cuando localStorage contiene JSON inválido', async () => {
    localStorage.setItem('umam.registros', '{esto no es JSON valido');

    const todos = await servicio.listar();

    expect(todos).toEqual([]);
  });
});
