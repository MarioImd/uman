import { RegistroService } from './registro.service';
import { RegistroAtencionPrehospitalaria } from '../models/registro.model';

const CLAVE_ALMACENAMIENTO = 'umam.registros';

export class LocalStorageRegistroService implements RegistroService {
  async guardar(registro: RegistroAtencionPrehospitalaria): Promise<RegistroAtencionPrehospitalaria> {
    const registros = await this.leerTodos();
    const indice = registros.findIndex(r => r.id === registro.id);
    if (indice >= 0) {
      registros[indice] = registro;
    } else {
      registros.push(registro);
    }
    localStorage.setItem(CLAVE_ALMACENAMIENTO, JSON.stringify(registros));
    return registro;
  }

  async obtener(id: string): Promise<RegistroAtencionPrehospitalaria | undefined> {
    const registros = await this.leerTodos();
    return registros.find(r => r.id === id);
  }

  async listar(): Promise<RegistroAtencionPrehospitalaria[]> {
    return this.leerTodos();
  }

  async eliminar(id: string): Promise<void> {
    const registros = await this.leerTodos();
    const restantes = registros.filter(r => r.id !== id);
    localStorage.setItem(CLAVE_ALMACENAMIENTO, JSON.stringify(restantes));
  }

  private async leerTodos(): Promise<RegistroAtencionPrehospitalaria[]> {
    const bruto = localStorage.getItem(CLAVE_ALMACENAMIENTO);
    if (!bruto) return [];
    try {
      return JSON.parse(bruto);
    } catch {
      // localStorage corrupto (JSON inválido): lo tratamos como "sin registros
      // guardados" en vez de dejar que listar() rechace la promesa — si no,
      // ngOnInit() nunca llega a suscribir el autosave y el formulario deja de
      // guardar en silencio para el resto de la sesión.
      return [];
    }
  }
}
