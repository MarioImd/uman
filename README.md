# Formato UMAM Digital

Formulario web (Angular 20) que reproduce el "Registro de Atención
Prehospitalaria" de UMAM, con exportación a PDF y Excel respetando el
diseño del documento. Ver `docs/superpowers/specs/2026-08-06-formato-umam-design.md`
para el diseño completo y `docs/superpowers/plans/2026-08-06-formato-umam-angular.md`
para el plan de implementación.

## Uso

```powershell
npm install
npx ng serve
```

Abre `http://localhost:4200`. Los datos se guardan automáticamente en el
backend (PostgreSQL) mientras se llena el formulario, así que el backend
debe estar corriendo — ver `backend/README.md`.

## Backend

Los componentes solo dependen de la interfaz `RegistroService`
(`src/app/core/services/registro.service.ts`), inyectada mediante el
token `REGISTRO_SERVICE`. En `src/app/app.config.ts` se usa
`ApiRegistroService` (habla con la API NestJS en `backend/`; la URL está en
`API_REGISTROS_URL`). Para volver a guardar solo en el navegador, cambia a
`useClass: LocalStorageRegistroService`.

## Pruebas

```powershell
npx ng test --watch=false --browsers=ChromeHeadless
```

## Build de producción

```powershell
npx ng build
```

El resultado se genera en `dist/app-tmp/`.
