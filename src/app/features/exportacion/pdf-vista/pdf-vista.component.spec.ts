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

  it('renderiza las pestañas laterales de sección de la página 1 (frente)', () => {
    const el = render({});
    const pestanas = Array.from(el.querySelectorAll('.pagina-1 .tab-seccion')).map(p => p.textContent!.trim());
    for (const esperada of [
      'II DATOS DEL SERVICIO', 'III CONTROL', 'IV DATOS DEL PACIENTE', 'V CAUSA TRAUMÁTICA',
      'VI CAUSA CLÍNICA', 'VII PARTO', 'VIII EVALUACIÓN INICIAL', 'IX EVALUACIÓN SECUNDARIA',
      'X ANAMNESIS',
    ]) {
      expect(pestanas).toContain(esperada);
    }
    // XI Tratamiento se movió a la página 2 (reverso) para aprovechar el espacio
    // que dejó libre Material Utilizado y no desbordar la página 1 a una hoja aparte.
    expect(pestanas).not.toContain('XI TRATAMIENTO');
  });

  it('renderiza la tabla de cronometría con las 5 horas (sin hora de llamada)', () => {
    const el = render({ datosServicio: { horaSalida: '10:15' } });
    const cronometria = el.querySelector('.cronometria')!;
    for (const columna of ['SALIDA', 'LLEGADA', 'TRASLADO', 'HOSPITAL', 'LIBERACIÓN']) {
      expect(cronometria.textContent).toContain(columna);
    }
    expect(cronometria.textContent).not.toContain('LLAMADA');
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

  it('la tabla de signos vitales muestra los valores capturados (EtCO2 y hallazgos EKG)', () => {
    const el = render({ signosVitales: [{ hora: '10:30', fr: '18', fc: '80', tas: '120', tad: '80', spo2: '97', temp: '36.5', gluc: '90', etco2: '35', hallazgosEkg: 'Sinusal' }] });
    const primeraFila = el.querySelector('.signos-vitales tbody tr')!;
    expect(primeraFila.textContent).toContain('10:30');
    expect(primeraFila.textContent).toContain('120');
    expect(primeraFila.textContent).toContain('Sinusal');
  });

  it('renderiza sin errores cuando registro es undefined (hoja en blanco imprimible)', () => {
    const el = render(undefined);
    expect(el.querySelector('.pagina-1')).toBeTruthy();
    expect(el.querySelector('.pagina-2')).toBeTruthy();
    expect(el.querySelectorAll('.pagina').length).toBe(2);
    expect(el.querySelectorAll('.casilla.marcada').length).toBe(0);
  });

  describe('página 2 (reverso)', () => {
    it('renderiza el texto legal de la negativa y las firmas del paciente y testigo', () => {
      const el = render({ traslado: { nombrePaciente: 'Juan Pérez', nombreTestigo: 'Ana López' } });
      expect(el.textContent).toContain('NEGATIVA A RECIBIR ATENCIÓN / SER TRASLADADO');
      expect(el.textContent).toContain('me niego a aceptar el (tratamiento) / (traslado)');
      expect(el.textContent).toContain('Nombre y firma del paciente');
      expect(el.textContent).toContain('Nombre y firma del testigo');
      expect(el.textContent).toContain('Juan Pérez');
      expect(el.textContent).toContain('Ana López');
    });

    it('renderiza la firma dibujada del paciente y del testigo en la negativa de traslado', () => {
      const el = render({
        traslado: {
          nombrePaciente: 'Juan Pérez', firmaPaciente: 'data:image/png;base64,FIRMAPACIENTE',
          nombreTestigo: 'Ana López',
        },
      });
      const firmas = el.querySelectorAll('.firma .imagen-firma');
      expect(firmas.length).toBe(1);
      expect((firmas[0] as HTMLImageElement).src).toContain('data:image/png;base64,FIRMAPACIENTE');
    });

    it('la tabla de vehículos involucrados siempre tiene 4 filas', () => {
      const el = render({ vehiculosInvolucrados: [{ tipoMarca: 'Nissan Tsuru', placas: 'ABC-123' }] });
      const filas = el.querySelectorAll('.vehiculos tbody tr');
      expect(filas.length).toBe(4);
      expect(filas[0].textContent).toContain('Nissan Tsuru');
      expect(filas[0].textContent).toContain('ABC-123');
      expect(el.querySelector('.vehiculos')!.textContent).toContain('TIPO Y MARCA');
      expect(el.querySelector('.vehiculos')!.textContent).toContain('PLACAS');
    });

    it('renderiza las imágenes adjuntas de EKG/Rx/laboratorios en hospital receptor', () => {
      const el = render({ hospitalReceptor: { imagenesEkgRxLaboratorios: ['data:image/png;base64,AAA', 'data:image/png;base64,BBB'] } });
      const imagenes = el.querySelectorAll('.imagenes-adjuntas img');
      expect(imagenes.length).toBe(2);
      expect((imagenes[0] as HTMLImageElement).src).toContain('data:image/png;base64,AAA');
    });

    it('renderiza la firma dibujada de quien entrega/recibe cuando existe, y no un <img> vacío cuando no se firmó', () => {
      const el = render({
        hospitalReceptor: {
          nombreQuienEntrega: 'TUM Pedro', firmaQuienEntrega: 'data:image/png;base64,FIRMAENTREGA',
          nombreQuienRecibe: 'Enf. Ana',
        },
      });
      const firmas = el.querySelectorAll('.firma .imagen-firma');
      expect(firmas.length).toBe(1);
      expect((firmas[0] as HTMLImageElement).src).toContain('data:image/png;base64,FIRMAENTREGA');
    });

    it('renderiza el pie con la dirección y los teléfonos', () => {
      const el = render({});
      const pie = el.querySelector('.pie')!;
      expect(pie.textContent).toContain('Calle Quinta Amalia # 107');
      expect(pie.textContent).toContain('Fracc. Las Quintas');
      expect(pie.textContent).toContain('C. P. 32401');
      expect(pie.textContent).toContain('(656)625-9472');
    });

    it('renderiza las secciones XI a XVII (tratamiento se movió aquí, y consentimiento informado)', () => {
      const el = render({ hospitalReceptor: { nombreQuienEntrega: 'TUM Pedro' } });
      const pestanas = Array.from(el.querySelectorAll('.pagina-2 .tab-seccion')).map(p => p.textContent!.trim());
      for (const esperada of [
        'XI TRATAMIENTO', 'XII TRASLADO', 'XIII OBSERVACIONES', 'XV DATOS LEGALES',
        'XVI HOSPITAL RECEPTOR', 'XVII CONSENTIMIENTO INFORMADO',
      ]) {
        expect(pestanas).toContain(esperada);
      }
      expect(el.textContent).toContain('ACEPTACIÓN DE HOSPITAL RECEPTOR');
      expect(el.textContent).toContain('TUM Pedro');
    });

    it('renderiza el texto de consentimiento informado y las tres firmas', () => {
      const el = render({
        consentimientoInformado: {
          nombrePacienteConsentimiento: 'Juan Pérez',
          nombreResponsableConsentimiento: 'María Pérez',
          nombreParamedicoConsentimiento: 'TUM Pedro',
        },
      });
      const pagina2 = el.querySelector('.pagina-2')!;
      expect(pagina2.textContent).toContain('CONSENTIMIENTO INFORMADO');
      expect(pagina2.textContent).toContain('otorgo mi consentimiento');
      expect(pagina2.textContent).toContain('Juan Pérez');
      expect(pagina2.textContent).toContain('María Pérez');
      expect(pagina2.textContent).toContain('TUM Pedro');
      expect(pagina2.textContent).toContain('NOMBRE Y FIRMA DEL PACIENTE');
      expect(pagina2.textContent).toContain('NOMBRE Y FIRMA DEL FAMILIAR O RESPONSABLE');
      expect(pagina2.textContent).toContain('NOMBRE Y FIRMA DEL PARAMÉDICO');
    });

    it('renderiza las firmas dibujadas del paciente, responsable y paramédico en consentimiento informado', () => {
      const el = render({
        consentimientoInformado: {
          firmaPacienteConsentimiento: 'data:image/png;base64,FIRMAPACIENTE',
          firmaResponsableConsentimiento: 'data:image/png;base64,FIRMARESPONSABLE',
          firmaParamedicoConsentimiento: 'data:image/png;base64,FIRMAPARAMEDICO',
        },
      });
      const pagina2 = el.querySelector('.pagina-2')!;
      const firmas = Array.from(pagina2.querySelectorAll('.firma .imagen-firma')) as HTMLImageElement[];
      expect(firmas.length).toBe(3);
      expect(firmas.map(f => f.src)).toEqual([
        jasmine.stringContaining('FIRMAPACIENTE'),
        jasmine.stringContaining('FIRMARESPONSABLE'),
        jasmine.stringContaining('FIRMAPARAMEDICO'),
      ]);
    });
  });
});
