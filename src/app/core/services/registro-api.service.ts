import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { RegistroService } from './registro.service';
import { RegistroAtencionPrehospitalaria } from '../models/registro.model';

/**
 * URL del backend NestJS (carpeta backend/). Si el backend se despliega en
 * otro servidor, este es el único lugar que hay que cambiar.
 */
export const API_REGISTROS_URL = 'http://localhost:3000/api/registros';

/**
 * Implementación de RegistroService que guarda los registros en el backend
 * (PostgreSQL) en lugar de localStorage. Los componentes no saben cuál de las
 * dos se usa: solo piden REGISTRO_SERVICE y app.config.ts decide.
 *
 * HttpClient devuelve Observables; firstValueFrom() los convierte en Promesas
 * porque la interfaz RegistroService trabaja con async/await.
 */
@Injectable()
export class ApiRegistroService implements RegistroService {
  private http = inject(HttpClient);

  /**
   * PUT /api/registros/:id — crea el registro si es nuevo o lo actualiza si
   * ya existe. Lo llama el autoguardado del formulario cada vez que cambia algo.
   */
  guardar(registro: RegistroAtencionPrehospitalaria): Promise<RegistroAtencionPrehospitalaria> {
    return firstValueFrom(
      this.http.put<RegistroAtencionPrehospitalaria>(`${API_REGISTROS_URL}/${registro.id}`, registro),
    );
  }

  /**
   * GET /api/registros/:id — el backend responde 404 cuando no existe; aquí
   * se traduce a `undefined` para cumplir el contrato de RegistroService
   * (igual que hace LocalStorageRegistroService). Cualquier otro error
   * (sin conexión, 500, etc.) se deja propagar.
   */
  async obtener(id: string): Promise<RegistroAtencionPrehospitalaria | undefined> {
    try {
      return await firstValueFrom(this.http.get<RegistroAtencionPrehospitalaria>(`${API_REGISTROS_URL}/${id}`));
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 404) return undefined;
      throw error;
    }
  }

  /**
   * GET /api/registros — todos los registros, del más antiguo al más reciente
   * (el backend ya los devuelve ordenados). Lo usan el Historial y el
   * formulario al iniciar para recuperar el último borrador.
   */
  listar(): Promise<RegistroAtencionPrehospitalaria[]> {
    return firstValueFrom(this.http.get<RegistroAtencionPrehospitalaria[]>(API_REGISTROS_URL));
  }

  /** DELETE /api/registros/:id — elimina el registro (botón "Eliminar" del Historial). */
  async eliminar(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${API_REGISTROS_URL}/${id}`));
  }
}
