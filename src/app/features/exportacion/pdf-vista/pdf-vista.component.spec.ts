import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PdfVistaComponent } from './pdf-vista.component';

describe('PdfVistaComponent', () => {
  let fixture: ComponentFixture<PdfVistaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PdfVistaComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(PdfVistaComponent);
  });

  it('valorCampo() muestra "Sí" para un campo booleano en true y "No" para false', () => {
    fixture.componentInstance.registro = {
      causaTraumatica: { eyectado: true },
      observaciones: { ministerioPublicoNotificado: false },
    };
    expect(fixture.componentInstance.valorCampo('causaTraumatica', 'eyectado')).toBe('Sí');
    expect(fixture.componentInstance.valorCampo('observaciones', 'ministerioPublicoNotificado')).toBe('No');
  });
});
