import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface UsuarioSesion {
  id: number;
  usuario: string;
  nombre: string;
  rol: 'admin' | 'usuario';
  /** Tamaño máximo de un registro, según los límites del servidor. */
  limiteBytes?: number;
}

const API_SESION_URL = 'api/sesion';

/** Sesión del usuario actual. */
@Injectable({ providedIn: 'root' })
export class SesionService {
  private http = inject(HttpClient);

  usuario = signal<UsuarioSesion | null>(null);
  /** La sesión venció con la app abierta: se pide entrar de nuevo sin perder lo capturado. */
  sesionVencida = signal(false);

  /** Al abrir la app: recupera la sesión si sigue vigente. */
  async cargar(): Promise<void> {
    try {
      this.usuario.set(await firstValueFrom(this.http.get<UsuarioSesion>(API_SESION_URL)));
    } catch {
      this.usuario.set(null);
    }
  }

  async entrar(usuario: string, clave: string): Promise<void> {
    const datos = await firstValueFrom(this.http.post<UsuarioSesion>(`${API_SESION_URL}/login`, { usuario, clave }));
    this.usuario.set(datos);
    this.sesionVencida.set(false);
  }

  async salir(): Promise<void> {
    await firstValueFrom(this.http.post(`${API_SESION_URL}/logout`, {}));
    this.usuario.set(null);
    this.sesionVencida.set(false);
  }
}
