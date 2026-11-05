import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaginadorComponent } from './paginador.component';

describe('PaginadorComponent', () => {
  let fixture: ComponentFixture<PaginadorComponent>;

  const configurar = (pagina: number, total: number) => {
    fixture.componentRef.setInput('pagina', pagina);
    fixture.componentRef.setInput('total', total);
    fixture.componentRef.setInput('porPagina', 20);
    fixture.detectChanges();
  };
  const boton = (clase: string): HTMLButtonElement => fixture.nativeElement.querySelector(clase);

  beforeEach(() => {
    fixture = TestBed.createComponent(PaginadorComponent);
  });

  it('muestra la página actual y el total de páginas', () => {
    configurar(2, 45);
    expect(fixture.nativeElement.textContent).toContain('Página 2 de 3');
  });

  it('no se muestra si todo cabe en una página', () => {
    configurar(1, 20);
    expect(fixture.nativeElement.querySelector('.paginador')).toBeFalsy();
  });

  it('deshabilita Anterior en la primera y Siguiente en la última', () => {
    configurar(1, 45);
    expect(boton('.paginador-anterior').disabled).toBeTrue();
    expect(boton('.paginador-siguiente').disabled).toBeFalse();
    configurar(3, 45);
    expect(boton('.paginador-anterior').disabled).toBeFalse();
    expect(boton('.paginador-siguiente').disabled).toBeTrue();
  });

  it('avisa la página elegida', () => {
    configurar(2, 45);
    const elegidas: number[] = [];
    fixture.componentInstance.cambiar.subscribe(p => elegidas.push(p));
    boton('.paginador-siguiente').click();
    boton('.paginador-anterior').click();
    expect(elegidas).toEqual([3, 1]);
  });
});
