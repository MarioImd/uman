import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { SesionService } from './sesion.service';

/** Si la API responde 401 con la app en uso, avisa que la sesión venció. */
export const sesionInterceptor: HttpInterceptorFn = (peticion, siguiente) => {
  const sesion = inject(SesionService);
  return siguiente(peticion).pipe(
    catchError((error: unknown) => {
      const esRutaDeSesion = peticion.url.startsWith('api/sesion');
      if (error instanceof HttpErrorResponse && error.status === 401 && !esRutaDeSesion) {
        sesion.sesionVencida.set(true);
      }
      return throwError(() => error);
    }),
  );
};
