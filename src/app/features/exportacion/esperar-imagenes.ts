/**
 * Espera a que las imágenes (firmas, fotos) estén listas. Angular crea los <img>
 * al instante, pero el navegador los decodifica después; si se imprime antes,
 * salen en blanco. Una imagen dañada no debe impedir la impresión.
 */
export async function esperarImagenes(raiz: HTMLElement): Promise<void> {
  const imagenes = Array.from(raiz.querySelectorAll('img'));
  await Promise.all(imagenes.map(imagen => imagen.decode().catch(() => undefined)));
}
