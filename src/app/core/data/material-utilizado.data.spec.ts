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

  it('trae al menos 80 ítems en total (catálogo completo del papel)', () => {
    const total = CATALOGO_MATERIAL.reduce((n, c) => n + c.items.length, 0);
    expect(total).toBeGreaterThanOrEqual(80);
  });

  it('marca tieneMedida=true en ítems que en el papel llevan un blanco de medida', () => {
    const todos = CATALOGO_MATERIAL.flatMap(c => c.items);
    const canula = todos.find(i => i.clave === 'canulaOrofaringea')!;
    expect(canula.tieneMedida).toBeTrue();
    const guantes = todos.find(i => i.clave === 'guantes')!;
    expect(guantes.tieneMedida).toBeFalsy();
  });
});
