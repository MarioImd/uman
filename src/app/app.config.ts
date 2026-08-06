import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { REGISTRO_SERVICE } from './core/services/registro.service';
import { LocalStorageRegistroService } from './core/services/registro-local-storage.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    { provide: REGISTRO_SERVICE, useClass: LocalStorageRegistroService },
  ]
};
