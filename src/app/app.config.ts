import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { MAT_DATE_LOCALE, provideNativeDateAdapter } from '@angular/material/core';
import { provideHttpClient } from '@angular/common/http';
import { REGISTRO_SERVICE } from './core/services/registro.service';
import { ApiRegistroService } from './core/services/registro-api.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    // Habilita HttpClient en toda la app; ApiRegistroService lo usa para
    // hablar con el backend.
    provideHttpClient(),
    // Decide dónde se guardan los registros: ApiRegistroService los manda al
    // backend NestJS + PostgreSQL (carpeta backend/, debe estar corriendo).
    // Para volver a guardar solo en el navegador: useClass: LocalStorageRegistroService
    // (importándolo de './core/services/registro-local-storage.service').
    { provide: REGISTRO_SERVICE, useClass: ApiRegistroService },
    // Fecha del calendario (mat-datepicker) y del selector de hora (mat-timepicker)
    // en español; los campos siguen guardando texto plano 'YYYY-MM-DD'/'HH:mm'
    // (ver CampoFormularioComponent), este adaptador solo alimenta la UI.
    provideNativeDateAdapter(),
    { provide: MAT_DATE_LOCALE, useValue: 'es-MX' },
  ]
};
