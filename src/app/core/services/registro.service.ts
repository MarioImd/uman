import { InjectionToken } from '@angular/core';
import { Pagina, RegistroAtencionPrehospitalaria, RegistroResumen } from '../models/registro.model';

export interface RegistroService {
  guardar(registro: RegistroAtencionPrehospitalaria): Promise<{ version: number }>;
  obtener(id: string): Promise<RegistroAtencionPrehospitalaria | undefined>;
  ultimo(): Promise<RegistroAtencionPrehospitalaria | undefined>;
  listar(pagina: number, q: string): Promise<Pagina<RegistroResumen>>;
  eliminar(id: string): Promise<void>;
}

export const REGISTRO_SERVICE = new InjectionToken<RegistroService>('REGISTRO_SERVICE');
