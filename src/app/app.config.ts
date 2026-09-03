import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { MAT_DATE_LOCALE, provideNativeDateAdapter } from '@angular/material/core';
import { REGISTRO_SERVICE } from './core/services/registro.service';
import { LocalStorageRegistroService } from './core/services/registro-local-storage.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    { provide: REGISTRO_SERVICE, useClass: LocalStorageRegistroService },
    // Fecha del calendario (mat-datepicker) y del selector de hora (mat-timepicker)
    // en español; los campos siguen guardando texto plano 'YYYY-MM-DD'/'HH:mm'
    // (ver CampoFormularioComponent), este adaptador solo alimenta la UI.
    provideNativeDateAdapter(),
    { provide: MAT_DATE_LOCALE, useValue: 'es-MX' },
  ]
};
