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
navegador (localStorage) mientras se llena el formulario.

## Conectar un backend real

Los componentes solo dependen de la interfaz `RegistroService`
(`src/app/core/services/registro.service.ts`), inyectada mediante el
token `REGISTRO_SERVICE`. Para usar una API real:

1. Crea `ApiRegistroService implements RegistroService` usando `HttpClient`.
2. En `src/app/app.config.ts`, cambia `useClass: LocalStorageRegistroService`
   por `useClass: ApiRegistroService`.

Ningún componente necesita cambios.

## Pruebas

```powershell
npx ng test --watch=false --browsers=ChromeHeadless
```

## Build de producción

```powershell
npx ng build
```

El resultado se genera en `dist/app-tmp/`.
