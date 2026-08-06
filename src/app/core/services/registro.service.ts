import { InjectionToken } from '@angular/core';
import { RegistroAtencionPrehospitalaria } from '../models/registro.model';

export interface RegistroService {
  guardar(registro: RegistroAtencionPrehospitalaria): Promise<RegistroAtencionPrehospitalaria>;
  obtener(id: string): Promise<RegistroAtencionPrehospitalaria | undefined>;
  listar(): Promise<RegistroAtencionPrehospitalaria[]>;
  eliminar(id: string): Promise<void>;
}

export const REGISTRO_SERVICE = new InjectionToken<RegistroService>('REGISTRO_SERVICE');
