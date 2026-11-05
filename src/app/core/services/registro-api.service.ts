import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { RegistroService } from './registro.service';
import { Pagina, RegistroAtencionPrehospitalaria, RegistroResumen } from '../models/registro.model';

/**
 * URL de la API PHP (carpeta api/). Es relativa, sin barra inicial, para que la
 * app funcione igual en la raíz de un dominio o en una subcarpeta.
 */
export const API_REGISTROS_URL = 'api/registros';

/**
 * Guarda y lee los registros en la API. HttpClient devuelve Observables;
 * firstValueFrom() los convierte en Promesas porque la interfaz RegistroService
 * trabaja con async/await.
 */
@Injectable()
export class ApiRegistroService implements RegistroService {
  private http = inject(HttpClient);

  /** Crea o actualiza el registro. Lo llama el autoguardado cada vez que cambia algo. */
  guardar(registro: RegistroAtencionPrehospitalaria): Promise<{ version: number }> {
    return firstValueFrom(this.http.post<{ version: number }>(`${API_REGISTROS_URL}/${registro.id}`, registro));
  }

  /** Un registro completo, o undefined si no existe. */
  obtener(id: string): Promise<RegistroAtencionPrehospitalaria | undefined> {
    return this.registroOIndefinido(this.http.get<RegistroAtencionPrehospitalaria>(`${API_REGISTROS_URL}/${id}`));
  }

  /** El último registro del usuario actual, para retomar su captura al abrir la app. */
  ultimo(): Promise<RegistroAtencionPrehospitalaria | undefined> {
    return this.registroOIndefinido(this.http.get<RegistroAtencionPrehospitalaria>(`${API_REGISTROS_URL}/ultimo`));
  }

  /** Una página ligera del Historial, sin imágenes. */
  listar(pagina: number, q: string): Promise<Pagina<RegistroResumen>> {
    return firstValueFrom(this.http.get<Pagina<RegistroResumen>>(API_REGISTROS_URL, { params: { pagina, q } }));
  }

  /** Marca el registro como eliminado; el servidor no lo borra. */
  async eliminar(id: string): Promise<void> {
    await firstValueFrom(this.http.post(`${API_REGISTROS_URL}/${id}/eliminar`, {}));
  }

  /** Traduce un 404 a undefined; cualquier otro error (sin conexión, 500) se propaga. */
  private async registroOIndefinido(
    peticion: Observable<RegistroAtencionPrehospitalaria>,
  ): Promise<RegistroAtencionPrehospitalaria | undefined> {
    try {
      return await firstValueFrom(peticion);
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 404) return undefined;
      throw error;
    }
  }
}
