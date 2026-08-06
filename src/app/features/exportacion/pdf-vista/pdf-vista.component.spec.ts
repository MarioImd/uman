import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PdfVistaComponent } from './pdf-vista.component';

describe('PdfVistaComponent (réplica de la hoja física)', () => {
  let fixture: ComponentFixture<PdfVistaComponent>;

  function render(registro: Record<string, any> | undefined): HTMLElement {
    // setInput dispara ngOnChanges (asignar la propiedad directamente no lo hace)
    fixture.componentRef.setInput('registro', registro);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PdfVistaComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(PdfVistaComponent);
  });

  it('renderiza el encabezado oficial con teléfonos, correo y el folio del registro', () => {
    const el = render({ datosGenerales: { folio: '56222', estado: 'Chihuahua', ciudad: 'Cd. Juárez' } });
    expect(el.textContent).toContain('REGISTRO DE ATENCIÓN PREHOSPITALARIA');
    expect(el.textContent).toContain('(656) 625-9472');
    expect(el.textContent).toContain('(656) 625-9473');
    expect(el.textContent).toContain('ambulanciasumam@yahoo.com');
    expect(el.querySelector('.folio-valor')!.textContent).toContain('56222');
    expect(el.textContent).toContain('Chihuahua');
    expect(el.textContent).toContain('Cd. Juárez');
  });

  it('renderiza las pestañas laterales de sección de la página 1', () => {
    const el = render({});
    const pestanas = Array.from(el.querySelectorAll('.pagina-1 .tab-seccion')).map(p => p.textContent!.trim());
    for (const esperada of [
      'II DATOS DEL SERVICIO', 'III CONTROL', 'IV DATOS DEL PACIENTE', 'V CAUSA TRAUMÁTICA',
      'VI CAUSA CLÍNICA', 'VII PARTO', 'VIII EVALUACIÓN INICIAL', 'IX EVALUACIÓN SECUNDARIA',
      'X ANAMNESIS', 'XI TRATAMIENTO',
    ]) {
      expect(pestanas).toContain(esperada);
    }
  });

  it('renderiza la tabla de cronometría con las 6 horas', () => {
    const el = render({ datosServicio: { horaLlamada: '10:15' } });
    const cronometria = el.querySelector('.cronometria')!;
    for (const columna of ['LLAMADA', 'SALIDA', 'LLEGADA', 'TRASLADO', 'HOSPITAL', 'LIBERACIÓN']) {
      expect(cronometria.textContent).toContain(columna);
    }
    expect(cronometria.textContent).toContain('10:15');
  });

  it('marca la casilla de una opción seleccionada y deja vacías las demás', () => {
    const el = render({ datosServicio: { motivoAtencion: 'Enfermedad' } });
    const casillas = Array.from(el.querySelectorAll('.motivo-atencion .opcion')) as HTMLElement[];
    const enfermedad = casillas.find(c => c.textContent!.includes('ENFERMEDAD'))!;
    const traumatismo = casillas.find(c => c.textContent!.includes('TRAUMATISMO'))!;
    expect(enfermedad.querySelector('.casilla')!.classList).toContain('marcada');
    expect(traumatismo.querySelector('.casilla')!.classList).not.toContain('marcada');
  });

  it('marca opciones de un checkbox-grupo (arreglo de valores)', () => {
    const el = render({ evaluacionInicial: { presenciaPulsos: ['Radial'] } });
    const opciones = Array.from(el.querySelectorAll('.presencia-pulsos .opcion')) as HTMLElement[];
    const radial = opciones.find(c => c.textContent!.includes('RADIAL'))!;
    const carotideo = opciones.find(c => c.textContent!.includes('CAROTÍDEO'))!;
    expect(radial.querySelector('.casilla')!.classList).toContain('marcada');
    expect(carotideo.querySelector('.casilla')!.classList).not.toContain('marcada');
  });

  it('la tabla de signos vitales siempre muestra al menos 3 filas (vacías si no hay datos)', () => {
    const el = render({});
    const filas = el.querySelectorAll('.signos-vitales tbody tr');
    expect(filas.length).toBeGreaterThanOrEqual(3);
  });

  it('la tabla de signos vitales muestra los valores capturados', () => {
    const el = render({ signosVitales: [{ hora: '10:30', fr: '18', fc: '80', tas: '120', tad: '80', spo2: '97', temp: '36.5', gluc: '90', ekg: 'Sinusal', examenNeurologico: 'A' }] });
    const primeraFila = el.querySelector('.signos-vitales tbody tr')!;
    expect(primeraFila.textContent).toContain('10:30');
    expect(primeraFila.textContent).toContain('120');
    expect(primeraFila.textContent).toContain('Sinusal');
  });

  it('renderiza sin errores cuando registro es undefined (hoja en blanco imprimible)', () => {
    const el = render(undefined);
    expect(el.querySelector('.pagina-1')).toBeTruthy();
    expect(el.querySelectorAll('.casilla.marcada').length).toBe(0);
  });
});
