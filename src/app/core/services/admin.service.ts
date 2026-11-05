import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Pagina, RegistroResumen } from '../models/registro.model';

export interface UsuarioAdmin {
  id: number;
  usuario: string;
  nombre: string;
  rol: 'admin' | 'usuario';
  activo: boolean;
}

export interface NuevoUsuario {
  usuario: string;
  nombre: string;
  clave: string;
  rol: 'admin' | 'usuario';
}

export interface CambiosUsuario {
  nombre?: string;
  rol?: 'admin' | 'usuario';
  activo?: boolean;
  clave?: string;
}

export interface FilaActividad {
  usuario: string;
  accion: 'creo' | 'edito' | 'elimino' | 'restauro';
  folio: string;
  inicio: string;
  fin: string;
}

export interface RegistroEliminado extends RegistroResumen {
  eliminadoPor: string | null;
  eliminadoEn: string;
}

/** Operaciones que solo puede hacer el administrador. */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);

  usuarios(): Promise<UsuarioAdmin[]> {
    return firstValueFrom(this.http.get<UsuarioAdmin[]>('api/usuarios'));
  }

  crearUsuario(datos: NuevoUsuario): Promise<UsuarioAdmin> {
    return firstValueFrom(this.http.post<UsuarioAdmin>('api/usuarios', datos));
  }

  editarUsuario(id: number, cambios: CambiosUsuario): Promise<UsuarioAdmin> {
    return firstValueFrom(this.http.post<UsuarioAdmin>(`api/usuarios/${id}`, cambios));
  }

  actividad(pagina: number, q: string): Promise<Pagina<FilaActividad>> {
    return firstValueFrom(this.http.get<Pagina<FilaActividad>>('api/actividad', { params: { pagina, q } }));
  }

  eliminados(pagina: number, q = ''): Promise<Pagina<RegistroEliminado>> {
    return firstValueFrom(this.http.get<Pagina<RegistroEliminado>>('api/registros/eliminados', { params: { pagina, q } }));
  }

  async restaurar(id: string): Promise<void> {
    await firstValueFrom(this.http.post(`api/registros/${id}/restaurar`, {}));
  }
}
