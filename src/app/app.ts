import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ActividadComponent } from './features/admin/actividad.component';
import { EliminadosComponent } from './features/admin/eliminados.component';
import { UsuariosComponent } from './features/admin/usuarios.component';
import { FormularioComponent } from './features/formulario/formulario.component';
import { HistorialComponent } from './features/historial/historial.component';
import { LoginComponent } from './features/login/login.component';
import { LogoUmamComponent } from './shared/logo-umam/logo-umam.component';
import { RegistroAtencionPrehospitalaria } from './core/models/registro.model';
import { SesionService } from './core/services/sesion.service';

type Vista = 'formulario' | 'historial' | 'usuarios' | 'actividad' | 'eliminados';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule, MatIconModule, FormularioComponent, HistorialComponent, LoginComponent, LogoUmamComponent,
    UsuariosComponent, ActividadComponent, EliminadosComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  sesion = inject(SesionService);

  vista: Vista = 'formulario';
  registroACargar?: RegistroAtencionPrehospitalaria;
  /** Todavía no se sabe si hay sesión: evita que el login aparezca un instante. */
  revisandoSesion = true;

  @ViewChild(FormularioComponent) private formulario?: FormularioComponent;

  async ngOnInit(): Promise<void> {
    await this.sesion.cargar();
    this.revisandoSesion = false;
  }

  irA(vista: Vista): void {
    this.vista = vista;
  }

  irAFormulario(): void {
    this.vista = 'formulario';
  }

  irAHistorial(): void {
    this.vista = 'historial';
  }

  /** El Historial pide abrir un trámite puntual: se lo pasamos al formulario y volvemos a esa vista. */
  abrirDesdeHistorial(registro: RegistroAtencionPrehospitalaria): void {
    this.registroACargar = registro;
    this.vista = 'formulario';
  }

  /** Cierra la sesión, guardando antes lo pendiente: después el servidor ya no lo aceptaría. */
  async salir(): Promise<void> {
    await this.formulario?.guardarPendientes();
    await this.sesion.salir();
    this.registroACargar = undefined;
    this.vista = 'formulario';
  }
}
