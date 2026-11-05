import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminService, FilaActividad, RegistroEliminado, UsuarioAdmin } from '../../core/services/admin.service';
import { Pagina } from '../../core/models/registro.model';
import { ActividadComponent } from './actividad.component';
import { EliminadosComponent } from './eliminados.component';
import { UsuariosComponent } from './usuarios.component';

const PARAMEDICO: UsuarioAdmin = { id: 2, usuario: 'paramedico', nombre: 'Paramédico', rol: 'usuario', activo: true };

function pagina<T>(items: T[], total = items.length): Pagina<T> {
  return { items, total, pagina: 1, porPagina: 20 };
}

describe('AdminService', () => {
  let servicio: AdminService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servicio = TestBed.inject(AdminService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('usa las rutas de la API', async () => {
    const usuarios = servicio.usuarios();
    http.expectOne('api/usuarios').flush([]);
    await usuarios;

    const crear = servicio.crearUsuario({ usuario: 'x', nombre: 'X', clave: 'clave-larga', rol: 'usuario' });
    const reqCrear = http.expectOne('api/usuarios');
    expect(reqCrear.request.method).toBe('POST');
    reqCrear.flush(PARAMEDICO);
    await crear;

    const editar = servicio.editarUsuario(2, { activo: false });
    const reqEditar = http.expectOne('api/usuarios/2');
    expect(reqEditar.request.method).toBe('POST');
    expect(reqEditar.request.body).toEqual({ activo: false });
    reqEditar.flush(PARAMEDICO);
    await editar;

    const actividad = servicio.actividad(2, 'ana');
    const reqActividad = http.expectOne(r => r.url === 'api/actividad');
    expect(reqActividad.request.params.get('pagina')).toBe('2');
    expect(reqActividad.request.params.get('q')).toBe('ana');
    reqActividad.flush(pagina([]));
    await actividad;

    const eliminados = servicio.eliminados(3);
    const reqEliminados = http.expectOne(r => r.url === 'api/registros/eliminados');
    expect(reqEliminados.request.params.get('pagina')).toBe('3');
    reqEliminados.flush(pagina([]));
    await eliminados;

    const restaurar = servicio.restaurar('abc');
    const reqRestaurar = http.expectOne('api/registros/abc/restaurar');
    expect(reqRestaurar.request.method).toBe('POST');
    reqRestaurar.flush({ ok: true });
    await restaurar;
  });
});

describe('Pantallas de administración', () => {
  let admin: jasmine.SpyObj<AdminService>;

  beforeEach(() => {
    admin = jasmine.createSpyObj<AdminService>('AdminService', ['usuarios', 'crearUsuario', 'editarUsuario', 'actividad', 'eliminados', 'restaurar']);
    TestBed.configureTestingModule({ providers: [{ provide: AdminService, useValue: admin }] });
  });

  function iniciar<T>(fixture: ComponentFixture<T>): void {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
  }

  describe('UsuariosComponent', () => {
    let fixture: ComponentFixture<UsuariosComponent>;
    const texto = () => fixture.nativeElement.textContent as string;

    function llenar(valores: Record<string, string>): void {
      for (const [nombre, valor] of Object.entries(valores)) {
        const campo: HTMLInputElement = fixture.nativeElement.querySelector(`.alta [name="${nombre}"]`);
        campo.value = valor;
        campo.dispatchEvent(new Event('input'));
        campo.dispatchEvent(new Event('change'));
      }
      fixture.detectChanges();
    }
    const crear = () => {
      fixture.nativeElement.querySelector('form.alta').dispatchEvent(new Event('submit', { cancelable: true }));
      tick();
      fixture.detectChanges();
    };

    beforeEach(() => {
      admin.usuarios.and.resolveTo([PARAMEDICO]);
      fixture = TestBed.createComponent(UsuariosComponent);
    });

    it('lista los usuarios', fakeAsync(() => {
      iniciar(fixture);
      expect(texto()).toContain('paramedico');
      expect(texto()).toContain('Activo');
    }));

    it('crea usuario y lo muestra en la lista', fakeAsync(() => {
      const nuevo: UsuarioAdmin = { id: 3, usuario: 'ana', nombre: 'Ana', rol: 'admin', activo: true };
      admin.crearUsuario.and.resolveTo(nuevo);
      iniciar(fixture);
      llenar({ usuario: 'ana', nombre: 'Ana', clave: 'clave-segura', rol: 'admin' });
      admin.usuarios.and.resolveTo([PARAMEDICO, nuevo]);
      crear();
      expect(admin.crearUsuario).toHaveBeenCalledOnceWith({ usuario: 'ana', nombre: 'Ana', clave: 'clave-segura', rol: 'admin' });
      expect(texto()).toContain('ana');
      expect((fixture.nativeElement.querySelector('.alta [name="clave"]') as HTMLInputElement).value).toBe('');
    }));

    it('muestra el error de usuario repetido', fakeAsync(() => {
      admin.crearUsuario.and.rejectWith(new HttpErrorResponse({ status: 409, error: { error: 'Ese usuario ya existe.' } }));
      iniciar(fixture);
      llenar({ usuario: 'paramedico', nombre: 'Otro', clave: 'clave-segura' });
      crear();
      expect(texto()).toContain('Ese usuario ya existe.');
    }));

    it('desactivar llama a editarUsuario', fakeAsync(() => {
      admin.editarUsuario.and.resolveTo({ ...PARAMEDICO, activo: false });
      iniciar(fixture);
      admin.usuarios.and.resolveTo([{ ...PARAMEDICO, activo: false }]);
      fixture.nativeElement.querySelector('button.alternar-activo').click();
      tick();
      fixture.detectChanges();
      expect(admin.editarUsuario).toHaveBeenCalledOnceWith(2, { activo: false });
      expect(texto()).toContain('Inactivo');
    }));

    it('cambiar clave llama a editarUsuario', fakeAsync(() => {
      admin.editarUsuario.and.resolveTo(PARAMEDICO);
      iniciar(fixture);
      spyOn(window, 'prompt').and.returnValue('clave-nueva-1');
      fixture.nativeElement.querySelector('button.cambiar-clave').click();
      tick();
      fixture.detectChanges();
      expect(admin.editarUsuario).toHaveBeenCalledOnceWith(2, { clave: 'clave-nueva-1' });
      expect(texto()).toContain('Contraseña actualizada');
    }));

    it('editar nombre llama a editarUsuario', fakeAsync(() => {
      admin.editarUsuario.and.resolveTo(PARAMEDICO);
      iniciar(fixture);
      spyOn(window, 'prompt').and.returnValue('Nombre Nuevo');
      fixture.nativeElement.querySelector('button.editar-nombre').click();
      tick();
      expect(admin.editarUsuario).toHaveBeenCalledOnceWith(2, { nombre: 'Nombre Nuevo' });
    }));

    it('cambiar rol llama a editarUsuario', fakeAsync(() => {
      admin.editarUsuario.and.resolveTo(PARAMEDICO);
      iniciar(fixture);
      fixture.nativeElement.querySelector('button.alternar-rol').click();
      tick();
      expect(admin.editarUsuario).toHaveBeenCalledOnceWith(2, { rol: 'admin' });
    }));

    it('cancelar el cambio de clave no llama a editarUsuario', fakeAsync(() => {
      iniciar(fixture);
      spyOn(window, 'prompt').and.returnValue(null);
      fixture.nativeElement.querySelector('button.cambiar-clave').click();
      tick();
      expect(admin.editarUsuario).not.toHaveBeenCalled();
    }));

    it('muestra el error del servidor al editar', fakeAsync(() => {
      admin.editarUsuario.and.rejectWith(new HttpErrorResponse({ status: 409, error: { error: 'Debe quedar al menos un administrador activo.' } }));
      iniciar(fixture);
      fixture.nativeElement.querySelector('button.alternar-activo').click();
      tick();
      fixture.detectChanges();
      expect(texto()).toContain('Debe quedar al menos un administrador activo.');
    }));
  });

  describe('ActividadComponent', () => {
    const fila: FilaActividad = {
      usuario: 'paramedico', accion: 'edito', folio: 'F-1', inicio: '2026-01-01T10:00:00.000Z', fin: '2026-01-01T10:20:00.000Z',
    };

    it('actividad muestra quién, acción, folio, inicio y fin, y pagina', fakeAsync(() => {
      admin.actividad.and.resolveTo(pagina([fila], 45));
      const fixture = TestBed.createComponent(ActividadComponent);
      iniciar(fixture);
      const texto = fixture.nativeElement.textContent as string;
      expect(texto).toContain('paramedico');
      expect(texto).toContain('Editó');
      expect(texto).toContain('F-1');
      expect(texto).toContain('01/01/2026');
      expect(texto).toContain('Página 1 de 3');

      fixture.nativeElement.querySelector('.paginador-siguiente').click();
      tick();
      expect(admin.actividad).toHaveBeenCalledWith(2, '');
    }));

    it('buscar espera y vuelve a la página 1', fakeAsync(() => {
      admin.actividad.and.resolveTo(pagina([fila], 45));
      const fixture = TestBed.createComponent(ActividadComponent);
      iniciar(fixture);
      admin.actividad.calls.reset();
      const entrada: HTMLInputElement = fixture.nativeElement.querySelector('.buscador input');
      entrada.value = 'ana';
      entrada.dispatchEvent(new Event('input'));
      tick(299);
      expect(admin.actividad).not.toHaveBeenCalled();
      tick(1);
      expect(admin.actividad).toHaveBeenCalledOnceWith(1, 'ana');
    }));

    it('muestra un error si no carga', fakeAsync(() => {
      admin.actividad.and.rejectWith(new Error('sin conexión'));
      const fixture = TestBed.createComponent(ActividadComponent);
      iniciar(fixture);
      expect(fixture.nativeElement.textContent).toContain('No se pudo cargar la actividad');
    }));
  });

  describe('EliminadosComponent', () => {
    const fila: RegistroEliminado = {
      id: 'abc', folio: 'F-1', ciudad: 'Puebla', paciente: 'Ana', fechaCreacion: '2026-01-01T10:00:00.000Z',
      eliminadoPor: 'paramedico', eliminadoEn: '2026-02-01T10:00:00.000Z',
    };

    it('lista quién eliminó y cuándo', fakeAsync(() => {
      admin.eliminados.and.resolveTo(pagina([fila]));
      const fixture = TestBed.createComponent(EliminadosComponent);
      iniciar(fixture);
      const texto = fixture.nativeElement.textContent as string;
      expect(texto).toContain('F-1');
      expect(texto).toContain('paramedico');
      expect(texto).toContain('01/02/2026');
    }));

    it('restaurar quita la fila de eliminados', fakeAsync(() => {
      admin.eliminados.and.resolveTo(pagina([fila]));
      admin.restaurar.and.resolveTo();
      const fixture = TestBed.createComponent(EliminadosComponent);
      iniciar(fixture);
      admin.eliminados.and.resolveTo(pagina([]));
      fixture.nativeElement.querySelector('button.restaurar').click();
      tick();
      fixture.detectChanges();
      expect(admin.restaurar).toHaveBeenCalledOnceWith('abc');
      expect(fixture.nativeElement.textContent).toContain('No hay trámites eliminados');
    }));

    it('restaurar la última fila de la última página carga la anterior', fakeAsync(() => {
      admin.eliminados.and.callFake(async n => ({ ...pagina([fila], 21), pagina: n }));
      admin.restaurar.and.resolveTo();
      const fixture = TestBed.createComponent(EliminadosComponent);
      iniciar(fixture);
      fixture.nativeElement.querySelector('.paginador-siguiente').click();
      tick();
      fixture.detectChanges();

      admin.eliminados.and.callFake(async n => (n === 2 ? { ...pagina<RegistroEliminado>([], 20), pagina: 2 } : pagina([fila], 20)));
      fixture.nativeElement.querySelector('button.restaurar').click();
      tick();
      expect(admin.eliminados.calls.mostRecent().args[0]).toBe(1);
    }));

    it('si restaurar falla muestra el aviso y conserva la fila', fakeAsync(() => {
      admin.eliminados.and.resolveTo(pagina([fila]));
      admin.restaurar.and.rejectWith(new Error('sin conexión'));
      const fixture = TestBed.createComponent(EliminadosComponent);
      iniciar(fixture);
      fixture.nativeElement.querySelector('button.restaurar').click();
      tick();
      fixture.detectChanges();
      const texto = fixture.nativeElement.textContent as string;
      expect(texto).toContain('No se pudo restaurar');
      expect(texto).toContain('F-1');
    }));
  });
});
