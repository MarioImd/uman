import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { MAT_DATE_LOCALE, provideNativeDateAdapter } from '@angular/material/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { REGISTRO_SERVICE } from './core/services/registro.service';
import { ApiRegistroService } from './core/services/registro-api.service';
import { sesionInterceptor } from './core/services/sesion.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    // HttpClient para hablar con la API; el interceptor detecta la sesión vencida.
    provideHttpClient(withInterceptors([sesionInterceptor])),
    { provide: REGISTRO_SERVICE, useClass: ApiRegistroService },
    // Fecha del calendario (mat-datepicker) y del selector de hora (mat-timepicker)
    // en español; los campos siguen guardando texto plano 'YYYY-MM-DD'/'HH:mm'
    // (ver CampoFormularioComponent), este adaptador solo alimenta la UI.
    provideNativeDateAdapter(),
    { provide: MAT_DATE_LOCALE, useValue: 'es-MX' },
  ]
};
