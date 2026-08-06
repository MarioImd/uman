import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SECCIONES } from '../../../core/data/secciones.data';
import { CATALOGO_MATERIAL } from '../../../core/data/material-utilizado.data';

/**
 * Réplica imprimible de la hoja física oficial de UMAM (Registro de Atención
 * Prehospitalaria, 2 páginas carta). El template está pensado para que un
 * registro vacío imprima la hoja en blanco, igual que el papel.
 */
@Component({
  selector: 'app-pdf-vista',
  standalone: true,
  imports: [CommonModule],
  template: `
<div class="hoja">

  <!-- ============================ PÁGINA 1 (FRENTE) ============================ -->
  <div class="pagina pagina-1">

    <header class="encabezado">
      <div class="logo">
        <svg viewBox="0 0 40 40" class="logo-svg" aria-hidden="true">
          <circle cx="20" cy="20" r="18" fill="none" stroke="#0d3a5c" stroke-width="3"/>
          <path d="M20 6 L23 15 L32 12 L26 20 L32 28 L23 25 L20 34 L17 25 L8 28 L14 20 L8 12 L17 15 Z" fill="#0d3a5c"/>
          <path d="M20 11 L20 29 M15 14 C 25 17, 15 23, 25 26" stroke="#fff" stroke-width="1.6" fill="none"/>
        </svg>
        <div class="logo-texto">
          <span class="logo-umam">UMAM</span>
          <span class="logo-sub">UNIDAD MÓVIL DE<br />ATENCIÓN MÉDICA</span>
        </div>
      </div>
      <div class="titulo-principal">
        <h1>REGISTRO DE ATENCIÓN PREHOSPITALARIA</h1>
        <div class="telefonos">(656) 625-9472</div>
        <div class="telefonos">(656) 625-9473</div>
        <div class="telefonos">ambulanciasumam&#64;yahoo.com</div>
      </div>
      <div class="folio">
        <span class="folio-etiqueta">FOLIO:</span>
        <span class="folio-valor">{{ v('datosGenerales', 'folio') }}</span>
      </div>
    </header>

    <div class="renglon-estado">
      <span class="titulo-campo">ESTADO:</span>
      <span class="linea">{{ v('datosGenerales', 'estado') }}</span>
      <span class="titulo-campo">CIUDAD:</span>
      <span class="linea">{{ v('datosGenerales', 'ciudad') }}</span>
    </div>

    <div class="columnas">
      <!-- ============ COLUMNA IZQUIERDA ============ -->
      <div class="columna">

        <!-- II. DATOS DEL SERVICIO -->
        <div class="seccion">
          <div class="tab-seccion">II DATOS DEL SERVICIO</div>
          <div class="cuerpo-seccion">
            <div class="fila-lineas">
              <span class="titulo-campo">FECHA:</span><span class="linea">{{ v('datosServicio', 'fecha') }}</span>
              <span class="titulo-campo">DÍA DE LA SEMANA:</span><span class="linea">{{ v('datosServicio', 'diaSemana') }}</span>
            </div>
            <table class="tabla-mini cronometria">
              <caption>CRONOMETRÍA</caption>
              <thead>
                <tr>
                  <th>HORA DE LLAMADA</th><th>HORA DE SALIDA</th><th>HORA DE LLEGADA</th>
                  <th>HORA DE TRASLADO</th><th>HORA DE HOSPITAL</th><th>HORA DE LIBERACIÓN</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{{ v('datosServicio', 'horaLlamada') }}</td>
                  <td>{{ v('datosServicio', 'horaSalida') }}</td>
                  <td>{{ v('datosServicio', 'horaLlegada') }}</td>
                  <td>{{ v('datosServicio', 'horaTraslado') }}</td>
                  <td>{{ v('datosServicio', 'horaHospital') }}</td>
                  <td>{{ v('datosServicio', 'horaLiberacion') }}</td>
                </tr>
              </tbody>
            </table>
            <div class="grupo-opciones motivo-atencion">
              <span class="titulo-campo">MOTIVO DE LA ATENCIÓN:</span>
              <span class="opcion" *ngFor="let o of ops('datosServicio', 'motivoAtencion')">
                <span class="casilla" [class.marcada]="marcado('datosServicio', 'motivoAtencion', o)"></span>{{ o | uppercase }}
              </span>
            </div>
            <div class="titulo-campo">UBICACIÓN DEL SERVICIO:</div>
            <div class="fila-lineas"><span class="titulo-campo">CALLE:</span><span class="linea">{{ v('datosServicio', 'calle') }}</span></div>
            <div class="fila-lineas">
              <span class="titulo-campo">ENTRE:</span><span class="linea">{{ v('datosServicio', 'entreCalle1') }}</span>
              <span class="titulo-campo">Y</span><span class="linea">{{ v('datosServicio', 'entreCalle2') }}</span>
            </div>
            <div class="fila-lineas"><span class="titulo-campo">COLONIA / COMUNIDAD:</span><span class="linea">{{ v('datosServicio', 'colonia') }}</span></div>
            <div class="fila-lineas"><span class="titulo-campo">DELEGACIÓN POLÍTICA / MUNICIPIO:</span><span class="linea">{{ v('datosServicio', 'delegacionMunicipio') }}</span></div>
            <div class="grupo-opciones">
              <span class="titulo-campo">LUGAR DE LA OCURRENCIA:</span>
              <span class="opcion" *ngFor="let o of ops('datosServicio', 'lugarOcurrencia')">
                <span class="casilla" [class.marcada]="marcado('datosServicio', 'lugarOcurrencia', o)"></span>{{ o | uppercase }}
              </span>
              <span class="linea">{{ v('datosServicio', 'lugarOcurrenciaOtro') }}</span>
            </div>
          </div>
        </div>

        <!-- III. CONTROL -->
        <div class="seccion">
          <div class="tab-seccion">III CONTROL</div>
          <div class="cuerpo-seccion">
            <div class="fila-lineas">
              <span class="titulo-campo">NÚMERO DE AMBULANCIA — INICIALES:</span><span class="linea">{{ v('control', 'ambulanciaIniciales') }}</span>
              <span class="titulo-campo">NÚMERO:</span><span class="linea">{{ v('control', 'ambulanciaNumero') }}</span>
            </div>
            <div class="fila-lineas"><span class="titulo-campo">OPERADOR:</span><span class="linea">{{ v('control', 'operador') }}</span></div>
            <div class="fila-lineas"><span class="titulo-campo">PRESTADORES DEL SERVICIO:</span><span class="linea">{{ v('control', 'prestadoresServicio') }}</span></div>
          </div>
        </div>

        <!-- IV. DATOS DEL PACIENTE -->
        <div class="seccion">
          <div class="tab-seccion">IV DATOS DEL PACIENTE</div>
          <div class="cuerpo-seccion">
            <div class="fila-lineas"><span class="titulo-campo">NOMBRE O MEDIA FILIACIÓN:</span><span class="linea">{{ v('datosPaciente', 'nombreOMediaFiliacion') }}</span></div>
            <div class="fila-lineas">
              <span class="titulo-campo">SEXO:</span><span class="linea">{{ v('datosPaciente', 'sexo') }}</span>
              <span class="titulo-campo">EDAD:</span><span class="linea corta">{{ v('datosPaciente', 'edadAnios') }}</span><span>AÑOS</span>
              <span class="titulo-campo">MENORES DE 1 AÑO:</span><span class="linea corta">{{ v('datosPaciente', 'edadMeses') }}</span><span>MESES</span>
            </div>
            <div class="fila-lineas">
              <span class="titulo-campo">LUGAR DE NACIMIENTO:</span><span class="linea">{{ v('datosPaciente', 'lugarNacimiento') }}</span>
              <span class="titulo-campo">FECHA DE NACIMIENTO:</span><span class="linea">{{ v('datosPaciente', 'fechaNacimiento') }}</span>
            </div>
            <div class="fila-lineas"><span class="titulo-campo">COLONIA / COMUNIDAD:</span><span class="linea">{{ v('datosPaciente', 'colonia') }}</span></div>
            <div class="fila-lineas"><span class="titulo-campo">DELEGACIÓN POLÍTICA / MUNICIPIO:</span><span class="linea">{{ v('datosPaciente', 'delegacionMunicipio') }}</span></div>
            <div class="fila-lineas">
              <span class="titulo-campo">TELÉFONO:</span><span class="linea">{{ v('datosPaciente', 'telefono') }}</span>
              <span class="titulo-campo">OCUPACIÓN:</span><span class="linea">{{ v('datosPaciente', 'ocupacion') }}</span>
            </div>
            <div class="fila-lineas"><span class="titulo-campo">DERECHOHABIENTE A:</span><span class="linea">{{ v('datosPaciente', 'derechohabienteA') }}</span></div>
            <div class="fila-lineas"><span class="titulo-campo">COMPAÑÍA DE SEGURO DE GASTOS MÉDICOS MAYORES:</span><span class="linea">{{ v('datosPaciente', 'companiaSeguroGastosMedicos') }}</span></div>
          </div>
        </div>

        <!-- V. CAUSA TRAUMÁTICA -->
        <div class="seccion">
          <div class="tab-seccion">V CAUSA TRAUMÁTICA</div>
          <div class="cuerpo-seccion">
            <div class="titulo-campo">AGENTE CAUSAL</div>
            <div class="rejilla-opciones tres">
              <span class="opcion" *ngFor="let o of ops('causaTraumatica', 'agenteCausal')">
                <span class="casilla" [class.marcada]="marcado('causaTraumatica', 'agenteCausal', o)"></span>{{ o | uppercase }}
              </span>
            </div>
            <div class="fila-lineas"><span class="titulo-campo">ESPECIFIQUE:</span><span class="linea">{{ v('causaTraumatica', 'agenteCausalEspecifique') }}</span></div>
            <div class="fila-lineas"><span class="titulo-campo">LESIONES CAUSADAS POR:</span><span class="linea">{{ v('causaTraumatica', 'lesionesCausadasPor') }}</span></div>

            <div class="subtitulo">ACCIDENTE AUTOMOVILÍSTICO</div>
            <div class="rejilla-opciones tres">
              <span class="opcion" *ngFor="let o of ops('causaTraumatica', 'accidenteAutomovilistico')">
                <span class="casilla" [class.marcada]="marcado('causaTraumatica', 'accidenteAutomovilistico', o)"></span>{{ o | uppercase }}
              </span>
            </div>

            <div class="subtitulo">SOBRE LA COLISIÓN</div>
            <div class="grupo-opciones">
              <span class="titulo-campo">CONTRA OBJETO:</span>
              <span class="opcion" *ngFor="let o of ops('causaTraumatica', 'contraObjeto')">
                <span class="casilla" [class.marcada]="marcado('causaTraumatica', 'contraObjeto', o)"></span>{{ o | uppercase }}
              </span>
              <span class="titulo-campo">IMPACTO:</span>
              <span class="opcion" *ngFor="let o of ops('causaTraumatica', 'impacto')">
                <span class="casilla" [class.marcada]="marcado('causaTraumatica', 'impacto', o)"></span>{{ o | uppercase }}
              </span>
            </div>
            <div class="grupo-opciones">
              <span class="titulo-campo">HUNDIMIENTO:</span><span class="linea corta">{{ v('causaTraumatica', 'hundimientoCms') }}</span><span>CMS</span>
              <span class="titulo-campo">PARABRISAS:</span>
              <span class="opcion" *ngFor="let o of ops('causaTraumatica', 'parabrisas')">
                <span class="casilla" [class.marcada]="marcado('causaTraumatica', 'parabrisas', o)"></span>{{ o | uppercase }}
              </span>
              <span class="titulo-campo">VOLANTE:</span>
              <span class="opcion" *ngFor="let o of ops('causaTraumatica', 'volante')">
                <span class="casilla" [class.marcada]="marcado('causaTraumatica', 'volante', o)"></span>{{ o | uppercase }}
              </span>
            </div>
            <div class="grupo-opciones">
              <span class="titulo-campo">BOLSAS DE AIRE:</span>
              <span class="opcion" *ngFor="let o of ops('causaTraumatica', 'bolsasAire')">
                <span class="casilla" [class.marcada]="marcado('causaTraumatica', 'bolsasAire', o)"></span>{{ o | uppercase }}
              </span>
              <span class="titulo-campo">CINTURÓN DE SEGURIDAD:</span>
              <span class="opcion" *ngFor="let o of ops('causaTraumatica', 'cinturonSeguridad')">
                <span class="casilla" [class.marcada]="marcado('causaTraumatica', 'cinturonSeguridad', o)"></span>{{ o | uppercase }}
              </span>
            </div>
            <div class="grupo-opciones">
              <span class="titulo-campo">DENTRO DEL VEHÍCULO:</span>
              <span class="opcion" *ngFor="let o of ops('causaTraumatica', 'dentroVehiculo')">
                <span class="casilla" [class.marcada]="marcado('causaTraumatica', 'dentroVehiculo', o)"></span>{{ o | uppercase }}
              </span>
              <span class="opcion">
                <span class="casilla" [class.marcada]="marcado('causaTraumatica', 'eyectado')"></span>EYECTADO
              </span>
            </div>

            <div class="subtitulo">ATROPELLADO</div>
            <div class="rejilla-opciones cuatro">
              <span class="opcion" *ngFor="let o of ops('causaTraumatica', 'atropellado')">
                <span class="casilla" [class.marcada]="marcado('causaTraumatica', 'atropellado', o)"></span>{{ o | uppercase }}
              </span>
            </div>
          </div>
        </div>

        <!-- VI. CAUSA CLÍNICA -->
        <div class="seccion">
          <div class="tab-seccion">VI CAUSA CLÍNICA</div>
          <div class="cuerpo-seccion">
            <div class="titulo-campo">ORIGEN PROBABLE:</div>
            <div class="rejilla-opciones tres">
              <span class="opcion" *ngFor="let o of ops('causaClinica', 'origenProbable')">
                <span class="casilla" [class.marcada]="marcado('causaClinica', 'origenProbable', o)"></span>{{ o | uppercase }}
              </span>
            </div>
            <div class="fila-lineas"><span class="titulo-campo">ESPECIFIQUE:</span><span class="linea">{{ v('causaClinica', 'origenProbableEspecifique') }}</span></div>
            <div class="grupo-opciones">
              <span class="titulo-campo">1ERA VEZ:</span>
              <span class="opcion" *ngFor="let o of ops('causaClinica', 'primeraVez')">
                <span class="casilla" [class.marcada]="marcado('causaClinica', 'primeraVez', o)"></span>{{ o | uppercase }}
              </span>
              <span class="titulo-campo">SUBSECUENTE:</span>
              <span class="linea">{{ v('causaClinica', 'subsecuente') }}</span>
            </div>
          </div>
        </div>

        <!-- VII. PARTO -->
        <div class="seccion">
          <div class="tab-seccion">VII PARTO</div>
          <div class="cuerpo-seccion">
            <div class="subtitulo">DATOS DE LA MADRE</div>
            <div class="fila-lineas">
              <span class="titulo-campo">GESTA:</span><span class="linea corta">{{ v('parto', 'gesta') }}</span>
              <span class="titulo-campo">CESÁREA:</span><span class="linea corta">{{ v('parto', 'cesarea') }}</span>
              <span class="titulo-campo">PARA:</span><span class="linea corta">{{ v('parto', 'para') }}</span>
              <span class="titulo-campo">ABORTOS:</span><span class="linea corta">{{ v('parto', 'abortos') }}</span>
              <span class="titulo-campo">SEMANA DE GESTACIÓN:</span><span class="linea corta">{{ v('parto', 'semanaGestacion') }}</span>
            </div>
            <div class="fila-lineas">
              <span class="titulo-campo">FECHA PROBABLE DE PARTO:</span><span class="linea">{{ v('parto', 'fechaProbableParto') }}</span>
              <span class="titulo-campo">MEMBRANAS:</span><span class="linea">{{ v('parto', 'membranas') }}</span>
            </div>
            <div class="fila-lineas">
              <span class="titulo-campo">HORA DE INICIO DE CONTRACCIONES:</span><span class="linea corta">{{ v('parto', 'horaInicioContracciones') }}</span>
              <span class="titulo-campo">FRECUENCIA:</span><span class="linea corta">{{ v('parto', 'frecuenciaContracciones') }}</span>
              <span class="titulo-campo">DURACIÓN:</span><span class="linea corta">{{ v('parto', 'duracionContracciones') }}</span>
            </div>
            <div class="subtitulo">DATOS POST-PARTO</div>
            <div class="grupo-opciones">
              <span class="titulo-campo">HORA DE NACIMIENTO:</span><span class="linea corta">{{ v('parto', 'horaNacimiento') }}</span>
              <span class="titulo-campo">LUGAR:</span><span class="linea">{{ v('parto', 'lugarNacimientoParto') }}</span>
              <span class="titulo-campo">PLACENTA EXPULSADA:</span>
              <span class="opcion" *ngFor="let o of ops('parto', 'placentaExpulsada')">
                <span class="casilla" [class.marcada]="marcado('parto', 'placentaExpulsada', o)"></span>{{ o | uppercase }}
              </span>
            </div>
            <div class="subtitulo">DATOS DEL RECIÉN NACIDO</div>
            <div class="grupo-opciones">
              <span class="titulo-campo">PRODUCTO:</span>
              <span class="opcion" *ngFor="let o of ops('parto', 'productoVivoMuerto')">
                <span class="casilla" [class.marcada]="marcado('parto', 'productoVivoMuerto', o)"></span>{{ o | uppercase }}
              </span>
              <span class="opcion" *ngFor="let o of ops('parto', 'sexoRecienNacido')">
                <span class="casilla" [class.marcada]="marcado('parto', 'sexoRecienNacido', o)"></span>{{ o === 'Masculino' ? 'MASC' : 'FEM' }}
              </span>
            </div>
            <div class="fila-lineas">
              <span class="titulo-campo">APGAR — 1 MIN:</span><span class="linea corta">{{ v('parto', 'apgar1min') }}</span>
              <span class="titulo-campo">5 MIN:</span><span class="linea corta">{{ v('parto', 'apgar5min') }}</span>
              <span class="titulo-campo">10 MIN:</span><span class="linea corta">{{ v('parto', 'apgar10min') }}</span>
              <span class="titulo-campo">SILVERMAN — 1 MIN:</span><span class="linea corta">{{ v('parto', 'silverman1min') }}</span>
              <span class="titulo-campo">5 MIN:</span><span class="linea corta">{{ v('parto', 'silverman5min') }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ============ COLUMNA DERECHA ============ -->
      <div class="columna">

        <!-- VIII. EVALUACIÓN INICIAL -->
        <div class="seccion">
          <div class="tab-seccion">VIII EVALUACIÓN INICIAL</div>
          <div class="cuerpo-seccion">
            <div class="rejilla-bloques tres">
              <div class="bloque">
                <div class="titulo-campo">NIVEL DE CONCIENCIA:</div>
                <div class="opcion" *ngFor="let o of ops('evaluacionInicial', 'nivelConciencia')">
                  <span class="casilla" [class.marcada]="marcado('evaluacionInicial', 'nivelConciencia', o)"></span>{{ o | uppercase }}
                </div>
              </div>
              <div class="bloque">
                <div class="titulo-campo">VÍA AÉREA:</div>
                <div class="opcion" *ngFor="let o of ops('evaluacionInicial', 'viaAerea')">
                  <span class="casilla" [class.marcada]="marcado('evaluacionInicial', 'viaAerea', o)"></span>{{ o | uppercase }}
                </div>
              </div>
              <div class="bloque">
                <div class="titulo-campo">REFLEJO DE DEGLUCIÓN:</div>
                <div class="opcion" *ngFor="let o of ops('evaluacionInicial', 'reflejoDeglucion')">
                  <span class="casilla" [class.marcada]="marcado('evaluacionInicial', 'reflejoDeglucion', o)"></span>{{ o | uppercase }}
                </div>
              </div>
            </div>

            <div class="titulo-campo banda">VENTILACIÓN:</div>
            <div class="rejilla-bloques tres">
              <div class="bloque">
                <div class="titulo-campo">OBSERVACIÓN</div>
                <div class="opcion" *ngFor="let o of ops('evaluacionInicial', 'ventilacionObservacion')">
                  <span class="casilla" [class.marcada]="marcado('evaluacionInicial', 'ventilacionObservacion', o)"></span>{{ o | uppercase }}
                </div>
              </div>
              <div class="bloque">
                <div class="titulo-campo">AUSCULTACIÓN</div>
                <div class="opcion" *ngFor="let o of ops('evaluacionInicial', 'ventilacionAuscultacion')">
                  <span class="casilla" [class.marcada]="marcado('evaluacionInicial', 'ventilacionAuscultacion', o)"></span>{{ o | uppercase }}
                </div>
              </div>
              <div class="bloque">
                <div class="titulo-campo">ALTERNACIONES LOCALIZADAS EN:</div>
                <div class="opcion" *ngFor="let o of ops('evaluacionInicial', 'alternacionesLocalizadas')">
                  <span class="casilla" [class.marcada]="marcado('evaluacionInicial', 'alternacionesLocalizadas', o)"></span>{{ o | uppercase }}
                </div>
              </div>
            </div>

            <div class="titulo-campo banda">CIRCULACIÓN:</div>
            <div class="rejilla-bloques cuatro">
              <div class="bloque presencia-pulsos">
                <div class="titulo-campo">PRESENCIA DE PULSOS</div>
                <div class="opcion" *ngFor="let o of ops('evaluacionInicial', 'presenciaPulsos')">
                  <span class="casilla" [class.marcada]="marcado('evaluacionInicial', 'presenciaPulsos', o)"></span>{{ o | uppercase }}
                </div>
                <div class="opcion">
                  <span class="casilla" [class.marcada]="marcado('evaluacionInicial', 'paroCardiorespiratorio')"></span>PARO CARDIORESPIRATORIO
                </div>
              </div>
              <div class="bloque">
                <div class="titulo-campo">CALIDAD</div>
                <div class="opcion" *ngFor="let o of ops('evaluacionInicial', 'calidadPulso')">
                  <span class="casilla" [class.marcada]="marcado('evaluacionInicial', 'calidadPulso', o)"></span>{{ o | uppercase }}
                </div>
              </div>
              <div class="bloque">
                <div class="titulo-campo">PIEL</div>
                <div class="opcion" *ngFor="let o of ops('evaluacionInicial', 'piel')">
                  <span class="casilla" [class.marcada]="marcado('evaluacionInicial', 'piel', o)"></span>{{ o | uppercase }}
                </div>
              </div>
              <div class="bloque">
                <div class="titulo-campo">CARACTERÍSTICAS</div>
                <div class="opcion" *ngFor="let o of ops('evaluacionInicial', 'caracteristicasPiel')">
                  <span class="casilla" [class.marcada]="marcado('evaluacionInicial', 'caracteristicasPiel', o)"></span>{{ o | uppercase }}
                </div>
                <div class="titulo-campo">TEMPERATURA COMPARATIVA</div>
                <div class="opcion" *ngFor="let o of ops('evaluacionInicial', 'temperaturaComparativa')">
                  <span class="casilla" [class.marcada]="marcado('evaluacionInicial', 'temperaturaComparativa', o)"></span>{{ o | uppercase }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- IX. EVALUACIÓN SECUNDARIA -->
        <div class="seccion">
          <div class="tab-seccion">IX EVALUACIÓN SECUNDARIA</div>
          <div class="cuerpo-seccion">
            <div class="rejilla-bloques exploracion">
              <div class="bloque">
                <div class="titulo-campo">EXPLORACIÓN FÍSICA</div>
                <table class="tabla-exploracion">
                  <tr *ngFor="let item of exploracionFisica">
                    <td class="codigo">{{ item.codigo }}</td>
                    <td>{{ item.nombre | uppercase }}</td>
                    <td><span class="casilla" [class.marcada]="marcado('evaluacionSecundaria', 'exploracionFisica', item.nombre)"></span></td>
                  </tr>
                </table>
              </div>
              <div class="bloque bloque-silueta">
                <div class="titulo-campo">ZONAS DE LESIÓN</div>
                <div class="siluetas">
                  <svg viewBox="0 0 60 130" class="silueta" aria-hidden="true">
                    <circle cx="30" cy="10" r="8" />
                    <path d="M30 18 C 22 20, 20 24, 19 32 L 15 62 L 20 63 L 24 40 L 24 66 L 21 122 L 28 122 L 30 80 L 32 122 L 39 122 L 36 66 L 36 40 L 40 63 L 45 62 L 41 32 C 40 24, 38 20, 30 18 Z" />
                  </svg>
                  <svg viewBox="0 0 60 130" class="silueta" aria-hidden="true">
                    <circle cx="30" cy="10" r="8" />
                    <path d="M30 18 C 22 20, 20 24, 19 32 L 15 62 L 20 63 L 24 40 L 24 66 L 21 122 L 28 122 L 30 80 L 32 122 L 39 122 L 36 66 L 36 40 L 40 63 L 45 62 L 41 32 C 40 24, 38 20, 30 18 Z" />
                  </svg>
                </div>
                <div class="rejilla-opciones dos zonas-lesion">
                  <span class="opcion" *ngFor="let o of ops('evaluacionSecundaria', 'zonasLesion')">
                    <span class="casilla" [class.marcada]="marcado('evaluacionSecundaria', 'zonasLesion', o)"></span>{{ o | uppercase }}
                  </span>
                </div>
                <div class="titulo-campo">PUPILAS</div>
                <div class="pupilas">
                  <span class="opcion" *ngFor="let o of ops('evaluacionSecundaria', 'pupilas')">
                    <span class="ojo" aria-hidden="true"></span>
                    <span class="casilla" [class.marcada]="marcado('evaluacionSecundaria', 'pupilas', o)"></span>{{ o | uppercase }}
                  </span>
                </div>
              </div>
            </div>

            <table class="tabla-mini signos-vitales">
              <caption>SIGNOS VITALES Y MONITOREO</caption>
              <thead>
                <tr>
                  <th>HORA</th><th>FR</th><th>FC</th><th>TAS</th><th>TAD</th><th>SpO2</th>
                  <th>TEMP</th><th>GLUC</th><th>EKG</th><th>EXAMEN RÁPIDO NEUROLÓGICO</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let fila of filasSignos">
                  <td>{{ fila['hora'] }}</td><td>{{ fila['fr'] }}</td><td>{{ fila['fc'] }}</td>
                  <td>{{ fila['tas'] }}</td><td>{{ fila['tad'] }}</td><td>{{ fila['spo2'] }}</td>
                  <td>{{ fila['temp'] }}</td><td>{{ fila['gluc'] }}</td><td>{{ fila['ekg'] }}</td>
                  <td>{{ fila['examenNeurologico'] }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- X. ANAMNESIS -->
        <div class="seccion">
          <div class="tab-seccion">X ANAMNESIS</div>
          <div class="cuerpo-seccion">
            <div class="grupo-opciones">
              <span class="titulo-campo">INTERROGATORIO:</span>
              <span class="opcion" *ngFor="let o of ops('anamnesis', 'interrogatorio')">
                <span class="casilla" [class.marcada]="marcado('anamnesis', 'interrogatorio', o)"></span>{{ o | uppercase }}
              </span>
              <span class="titulo-campo">PESO:</span><span class="linea corta">{{ v('anamnesis', 'peso') }}</span>
              <span class="titulo-campo">TALLA:</span><span class="linea corta">{{ v('anamnesis', 'talla') }}</span>
            </div>
            <div class="fila-lineas"><span class="titulo-campo">ALERGIAS:</span><span class="linea">{{ v('anamnesis', 'alergias') }}</span></div>
            <div class="fila-lineas"><span class="titulo-campo">MEDICAMENTOS:</span><span class="linea">{{ v('anamnesis', 'medicamentos') }}</span></div>
            <div class="fila-lineas"><span class="titulo-campo">ENFERMEDADES Y/O CIRUGÍAS PREVIAS:</span><span class="linea">{{ v('anamnesis', 'enfermedadesCirugiasPrevias') }}</span></div>
            <div class="fila-lineas">
              <span class="titulo-campo">HORA DE ÚLTIMA COMIDA:</span><span class="linea corta">{{ v('anamnesis', 'horaUltimaComida') }}</span>
              <span class="titulo-campo">EVENTOS PREVIOS RELACIONADOS:</span><span class="linea">{{ v('anamnesis', 'eventosPreviosRelacionados') }}</span>
            </div>
            <div class="rejilla-bloques cuatro">
              <div class="bloque">
                <div class="titulo-campo">CONDICIÓN DEL PACIENTE</div>
                <div class="opcion" *ngFor="let o of ops('anamnesis', 'condicionPaciente')">
                  <span class="casilla" [class.marcada]="marcado('anamnesis', 'condicionPaciente', o)"></span>{{ o | uppercase }}
                </div>
                <div class="opcion" *ngFor="let o of ops('anamnesis', 'estabilidadPaciente')">
                  <span class="casilla" [class.marcada]="marcado('anamnesis', 'estabilidadPaciente', o)"></span>{{ o | uppercase }}
                </div>
              </div>
              <div class="bloque">
                <div class="titulo-campo">PRIORIDAD</div>
                <div class="opcion" *ngFor="let o of ops('anamnesis', 'prioridad')">
                  <span class="casilla" [class.marcada]="marcado('anamnesis', 'prioridad', o)"></span>{{ o | uppercase }}
                </div>
              </div>
              <div class="bloque">
                <div class="titulo-campo">GLASGOW</div>
                <div class="fila-lineas"><span class="titulo-campo">OCULAR:</span><span class="linea corta">{{ v('anamnesis', 'glasgowOcular') }}</span></div>
                <div class="fila-lineas"><span class="titulo-campo">VERBAL:</span><span class="linea corta">{{ v('anamnesis', 'glasgowVerbal') }}</span></div>
                <div class="fila-lineas"><span class="titulo-campo">MOTORA:</span><span class="linea corta">{{ v('anamnesis', 'glasgowMotora') }}</span></div>
                <div class="fila-lineas"><span class="titulo-campo">TOTAL:</span><span class="linea corta">{{ v('anamnesis', 'glasgowTotal') }}</span></div>
              </div>
              <div class="bloque">
                <div class="titulo-campo">TRAUMA SCORE</div>
                <div class="fila-lineas"><span class="titulo-campo">TAS:</span><span class="linea corta">{{ v('anamnesis', 'traumaScoreTas') }}</span></div>
                <div class="fila-lineas"><span class="titulo-campo">FR:</span><span class="linea corta">{{ v('anamnesis', 'traumaScoreFr') }}</span></div>
                <div class="fila-lineas"><span class="titulo-campo">TOTAL:</span><span class="linea corta">{{ v('anamnesis', 'traumaScoreTotal') }}</span></div>
              </div>
            </div>
          </div>
        </div>

        <!-- XI. TRATAMIENTO -->
        <div class="seccion">
          <div class="tab-seccion">XI TRATAMIENTO</div>
          <div class="cuerpo-seccion">
            <div class="rejilla-bloques cuatro">
              <div class="bloque">
                <div class="titulo-campo">VÍA AÉREA</div>
                <div class="opcion" *ngFor="let o of ops('tratamiento', 'viaAereaTratamiento')">
                  <span class="casilla" [class.marcada]="marcado('tratamiento', 'viaAereaTratamiento', o)"></span>{{ o | uppercase }}
                </div>
              </div>
              <div class="bloque">
                <div class="titulo-campo">CONTROL CERVICAL:</div>
                <div class="opcion" *ngFor="let o of ops('tratamiento', 'controlCervical')">
                  <span class="casilla" [class.marcada]="marcado('tratamiento', 'controlCervical', o)"></span>{{ o | uppercase }}
                </div>
              </div>
              <div class="bloque">
                <div class="titulo-campo">ASISTENCIA VENTILATORIA:</div>
                <div class="opcion" *ngFor="let o of ops('tratamiento', 'asistenciaVentilatoria')">
                  <span class="casilla" [class.marcada]="marcado('tratamiento', 'asistenciaVentilatoria', o)"></span>{{ o | uppercase }}
                </div>
                <div class="fila-lineas">
                  <span class="titulo-campo">FREC:</span><span class="linea corta">{{ v('tratamiento', 'frecuenciaVentilatoria') }}</span>
                  <span class="titulo-campo">VOL:</span><span class="linea corta">{{ v('tratamiento', 'volumenVentilatorio') }}</span>
                </div>
                <div class="fila-lineas">
                  <span class="titulo-campo">PEEP:</span><span class="linea corta">{{ v('tratamiento', 'peep') }}</span>
                  <span class="titulo-campo">PRESIÓN:</span><span class="linea corta">{{ v('tratamiento', 'presionVentilatoria') }}</span>
                </div>
                <div class="fila-lineas"><span class="titulo-campo">MODO VENTILATORIO:</span><span class="linea corta">{{ v('tratamiento', 'modoVentilatorio') }}</span></div>
              </div>
              <div class="bloque">
                <div class="titulo-campo">OXIGENOTERAPIA:</div>
                <div class="opcion" *ngFor="let o of ops('tratamiento', 'oxigenoterapia')">
                  <span class="casilla" [class.marcada]="marcado('tratamiento', 'oxigenoterapia', o)"></span>{{ o | uppercase }}
                </div>
                <div class="fila-lineas"><span class="titulo-campo">LTS X MIN:</span><span class="linea corta">{{ v('tratamiento', 'litrosPorMinuto') }}</span></div>
                <div class="titulo-campo">DESCOMPRESIÓN PLEURAL</div>
                <div class="opcion" *ngFor="let o of ops('tratamiento', 'descompresionPleural')">
                  <span class="casilla" [class.marcada]="marcado('tratamiento', 'descompresionPleural', o)"></span>{{ o | uppercase }}
                </div>
              </div>
            </div>

            <div class="rejilla-bloques cuatro">
              <div class="bloque">
                <div class="titulo-campo">CONTROL DE HEMORRAGIAS:</div>
                <div class="opcion" *ngFor="let o of ops('tratamiento', 'controlHemorragias')">
                  <span class="casilla" [class.marcada]="marcado('tratamiento', 'controlHemorragias', o)"></span>{{ o | uppercase }}
                </div>
              </div>
              <div class="bloque">
                <div class="titulo-campo">VÍAS VENOSAS:</div>
                <div class="fila-lineas"><span class="titulo-campo">LÍNEAS IV #:</span><span class="linea corta">{{ v('tratamiento', 'lineasIv') }}</span></div>
                <div class="fila-lineas"><span class="titulo-campo">CATÉTER #:</span><span class="linea corta">{{ v('tratamiento', 'numeroCateter') }}</span></div>
              </div>
              <div class="bloque">
                <div class="titulo-campo">SITIO DE APLICACIÓN:</div>
                <div class="opcion" *ngFor="let o of ops('tratamiento', 'sitioAplicacion')">
                  <span class="casilla" [class.marcada]="marcado('tratamiento', 'sitioAplicacion', o)"></span>{{ o | uppercase }}
                </div>
              </div>
              <div class="bloque">
                <div class="titulo-campo">TIPO DE SOLUCIONES:</div>
                <div class="fila-lineas"><span class="linea">{{ v('tratamiento', 'tipoSoluciones') }}</span></div>
                <div class="fila-lineas"><span class="titulo-campo">CANTIDAD:</span><span class="linea corta">{{ v('tratamiento', 'cantidadSolucion') }}</span></div>
                <div class="fila-lineas"><span class="titulo-campo">INFUSIÓN:</span><span class="linea corta">{{ v('tratamiento', 'infusion') }}</span></div>
              </div>
            </div>

            <table class="tabla-mini farmacologico">
              <caption>MANEJO FARMACOLÓGICO Y TERAPIA ELÉCTRICA</caption>
              <thead>
                <tr><th>HORA</th><th>MEDICAMENTO</th><th>DOSIS</th><th>VÍA DE ADMINISTRACIÓN</th><th>TERAPIA ELÉCTRICA</th></tr>
              </thead>
              <tbody>
                <tr *ngFor="let fila of filasFarmaco">
                  <td>{{ fila['hora'] }}</td><td>{{ fila['medicamento'] }}</td><td>{{ fila['dosis'] }}</td>
                  <td>{{ fila['viaAdministracion'] }}</td><td>{{ fila['terapiaElectrica'] }}</td>
                </tr>
              </tbody>
            </table>

            <div class="grupo-opciones">
              <span class="opcion" *ngFor="let o of ops('tratamiento', 'rcp')">
                <span class="casilla" [class.marcada]="marcado('tratamiento', 'rcp', o)"></span>{{ o | uppercase }}
              </span>
              <span class="opcion" *ngFor="let o of ops('tratamiento', 'inmovilizacion')">
                <span class="casilla" [class.marcada]="marcado('tratamiento', 'inmovilizacion', o)"></span>{{ o | uppercase }}
              </span>
              <span class="opcion"><span class="casilla" [class.marcada]="marcado('tratamiento', 'curacion')"></span>CURACIÓN</span>
              <span class="opcion"><span class="casilla" [class.marcada]="marcado('tratamiento', 'vendaje')"></span>VENDAJE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="salto"></div>

  <!-- ============================ PÁGINA 2 (REVERSO) ============================ -->
  <div class="pagina pagina-2">
    <div class="columnas">
      <!-- ============ COLUMNA IZQUIERDA ============ -->
      <div class="columna">

        <!-- XII. TRASLADO -->
        <div class="seccion">
          <div class="tab-seccion">XII TRASLADO</div>
          <div class="cuerpo-seccion">
            <div class="fila-lineas">
              <span class="titulo-campo">INSTITUCIÓN A LA QUE SE TRASLADA EL PACIENTE:</span>
              <span class="linea">{{ v('traslado', 'institucionTraslado') }}</span>
            </div>
            <div class="rejilla-bloques dos">
              <div class="bloque">
                <div class="titulo-campo">CONDICIÓN DEL PACIENTE</div>
                <div class="opcion" *ngFor="let o of ops('traslado', 'condicionPacienteTraslado')">
                  <span class="casilla" [class.marcada]="marcado('traslado', 'condicionPacienteTraslado', o)"></span>{{ o | uppercase }}
                </div>
                <div class="opcion" *ngFor="let o of ops('traslado', 'estabilidadPacienteTraslado')">
                  <span class="casilla" [class.marcada]="marcado('traslado', 'estabilidadPacienteTraslado', o)"></span>{{ o | uppercase }}
                </div>
              </div>
              <div class="bloque">
                <div class="titulo-campo">PRIORIDAD DE TRASLADO</div>
                <div class="opcion" *ngFor="let o of ops('traslado', 'prioridadTraslado')">
                  <span class="casilla" [class.marcada]="marcado('traslado', 'prioridadTraslado', o)"></span>{{ o | uppercase }}
                </div>
              </div>
            </div>
            <div class="bloque negativa">
              <div class="titulo-negativa">
                <span class="casilla" [class.marcada]="marcado('traslado', 'negativaAtencion')"></span>
                NEGATIVA A RECIBIR ATENCIÓN / SER TRASLADADO<br />EXIMENTE DE RESPONSABILIDAD
              </div>
              <p class="texto-legal">
                Mediante la presente declaré que me niego a aceptar el (tratamiento) / (traslado) a un hospital y
                reconozco que el personal de la ambulancia UMAM, así como el médico de los mismos me
                recomendaron lo anterior, por lo que eximo a UMAM y a dicho personal de toda
                responsabilidad que pudiera derivar al haber respetado y cumplir mis deseos.
              </p>
              <div class="firmas">
                <div class="firma">
                  <span class="linea">{{ v('traslado', 'nombrePaciente') }}</span>
                  <span class="pie-firma">Nombre y firma del paciente</span>
                </div>
                <div class="firma">
                  <span class="linea">{{ v('traslado', 'nombreTestigo') }}</span>
                  <span class="pie-firma">Nombre y firma del testigo</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- XIII. OBSERVACIONES -->
        <div class="seccion">
          <div class="tab-seccion">XIII OBSERVACIONES</div>
          <div class="cuerpo-seccion">
            <div class="renglones-observaciones">
              <div class="renglon-observacion">{{ v('observaciones', 'observaciones') }}</div>
              <div class="renglon-observacion"></div>
              <div class="renglon-observacion"></div>
              <div class="renglon-observacion"></div>
            </div>
          </div>
        </div>

        <!-- XIV. SELLO DE MINISTERIO PÚBLICO -->
        <div class="seccion">
          <div class="tab-seccion">XIV SELLO DE MINISTERIO PÚBLICO</div>
          <div class="cuerpo-seccion">
            <div class="grupo-opciones">
              <span class="opcion">
                <span class="casilla" [class.marcada]="marcado('observaciones', 'ministerioPublicoNotificado')"></span>MINISTERIO PÚBLICO NOTIFICADO
              </span>
              <span class="linea">{{ v('observaciones', 'selloMinisterioPublico') }}</span>
            </div>
            <div class="caja-sello"></div>
            <div class="firma centrada">
              <span class="linea">{{ v('observaciones', 'nombreQuienRecibeMP') }}</span>
              <span class="pie-firma">NOMBRE Y FIRMA DE QUIEN RECIBE</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ============ COLUMNA DERECHA ============ -->
      <div class="columna">

        <!-- XV. DATOS LEGALES -->
        <div class="seccion">
          <div class="tab-seccion">XV DATOS LEGALES</div>
          <div class="cuerpo-seccion">
            <div class="titulo-campo">AUTORIDAD O AUTORIDADES QUE TOMARON CONOCIMIENTO</div>
            <div class="fila-lineas"><span class="titulo-campo">DEPENDENCIA:</span><span class="linea">{{ v('datosLegales', 'dependenciaAutoridad') }}</span></div>
            <div class="fila-lineas"><span class="titulo-campo">NÚMERO DE UNIDADES:</span><span class="linea">{{ v('datosLegales', 'numeroUnidades') }}</span></div>
            <div class="fila-lineas"><span class="titulo-campo">NOMBRE O NÚMERO DE LOS OFICIALES:</span><span class="linea">{{ v('datosLegales', 'nombreNumeroOficiales') }}</span></div>

            <table class="tabla-mini vehiculos">
              <caption>VEHÍCULOS INVOLUCRADOS</caption>
              <thead>
                <tr><th class="col-num"></th><th>TIPO Y MARCA</th><th>PLACAS</th></tr>
              </thead>
              <tbody>
                <tr *ngFor="let fila of filasVehiculos; let i = index">
                  <td class="col-num">{{ i + 1 }}</td>
                  <td>{{ fila['tipoMarca'] }}</td>
                  <td>{{ fila['placas'] }}</td>
                </tr>
              </tbody>
            </table>

            <div class="fila-lineas">
              <span class="titulo-campo">POSICIÓN, ORIENTACIÓN (DONDE Y COMO) SE ENCONTRÓ EL PACIENTE:</span>
              <span class="linea">{{ v('datosLegales', 'posicionOrientacionPaciente') }}</span>
            </div>
            <div class="fila-lineas"><span class="titulo-campo">PERTENENCIAS:</span><span class="linea">{{ v('datosLegales', 'pertenencias') }}</span></div>
            <div class="fila-lineas">
              <span class="titulo-campo">RECIBIÓ LAS PERTENENCIAS:</span>
              <span class="linea">{{ v('datosLegales', 'recibioPertenenciasNombreFirmaCargo') }}</span>
              <span class="pie-firma">NOMBRE, FIRMA Y CARGO</span>
            </div>
            <div class="fila-lineas"><span class="titulo-campo">COMPAÑÍA DE SEGURO DE AUTOMÓVIL:</span><span class="linea">{{ v('datosLegales', 'companiaSeguroAutomovil') }}</span></div>
          </div>
        </div>

        <!-- XVI. HOSPITAL RECEPTOR -->
        <div class="seccion">
          <div class="tab-seccion">XVI HOSPITAL RECEPTOR</div>
          <div class="cuerpo-seccion">
            <div class="titulo-campo centrado">ACEPTACIÓN DE HOSPITAL RECEPTOR</div>
            <div class="caja-sello">{{ v('hospitalReceptor', 'aceptacionHospitalReceptor') }}</div>
            <div class="firmas">
              <div class="firma">
                <span class="linea">{{ v('hospitalReceptor', 'nombreQuienEntrega') }}</span>
                <span class="pie-firma">NOMBRE Y FIRMA DE QUIEN ENTREGA EL PACIENTE</span>
              </div>
              <div class="firma">
                <span class="linea">{{ v('hospitalReceptor', 'nombreQuienRecibe') }}</span>
                <span class="pie-firma">NOMBRE Y FIRMA DE PERSONA QUE RECIBE EL PACIENTE</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- MATERIAL UTILIZADO -->
    <h2 class="titulo-material">MATERIAL UTILIZADO</h2>
    <div class="material-grid">
      <div class="material-categoria" *ngFor="let categoria of categorias">
        <div class="material-cabecera">{{ categoria.nombre | uppercase }}</div>
        <div class="material-item" *ngFor="let item of categoria.items">
          <span class="material-etiqueta">
            {{ item.nombre }}<ng-container *ngIf="item.tieneMedida"> — {{ item.unidadMedida ? (item.unidadMedida | uppercase) : 'MEDIDA' }} ____</ng-container>
          </span>
          <span class="material-cantidad">{{ materialCantidad(item.clave) }}</span>
          <span class="casilla" [class.marcada]="materialMarcado(item.clave)"></span>
        </div>
      </div>
    </div>

    <footer class="pie">
      <div class="pie-linea"><strong>TELS. (656)625-9472</strong></div>
      <div class="pie-linea"><strong>(656)625-9473</strong></div>
      <div class="pie-linea">Calle Quinta Amalia # 107 • Fracc. Las Quintas</div>
      <div class="pie-linea">Cd. Juárez, Chih. • C. P. 32401</div>
      <div class="pie-linea">E-mail: <strong>ambulanciasumam&#64;yahoo.com</strong></div>
    </footer>
  </div>
</div>
`,
  styles: [`
// Réplica de la hoja física UMAM. Todos los fondos llevan print-color-adjust
// para que el azul salga en el PDF.
$azul: #1892d3;
$azul-oscuro: #0d3a5c;
$celeste: #dbeef9;
$borde: #b9def2;
$rojo: #c0392b;
$tinta: #1a1a1a;

.hoja {
  width: 8in;
  margin: 0 auto;
  font: 6.2px/1.22 Arial, Helvetica, sans-serif;
  color: $tinta;
  background: #fff;
}

.pagina {
  padding: 8px;
  box-sizing: border-box;
}

// ---------- Encabezado ----------
.encabezado {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 4px;
}
.logo { display: flex; align-items: center; gap: 4px; min-width: 130px; }
.logo-svg { width: 34px; height: 34px; }
.logo-texto { display: flex; flex-direction: column; line-height: 1.1; }
.logo-umam { font-size: 17px; font-weight: 800; letter-spacing: 1px; color: $azul-oscuro; }
.logo-sub { font-size: 6px; font-weight: 700; color: $azul-oscuro; }
.titulo-principal {
  flex: 1;
  text-align: center;
  h1 { margin: 0; font-size: 11px; letter-spacing: 0.3px; }
  .telefonos { font-size: 8.5px; }
}
.folio {
  min-width: 90px;
  text-align: right;
  .folio-etiqueta { font-size: 9px; font-weight: 700; }
  .folio-valor { font-size: 13px; font-weight: 700; color: $rojo; letter-spacing: 1px; min-width: 40px; display: inline-block; border-bottom: 1px solid $tinta; text-align: center; }
}
.renglon-estado {
  display: flex;
  gap: 4px;
  align-items: flex-end;
  margin-bottom: 5px;
  font-size: 8px;
  .titulo-campo { font-size: 8px; }
  .linea { min-height: 10px; }
}

// ---------- Estructura de secciones ----------
.columnas {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  align-items: start;
}
.columna { display: flex; flex-direction: column; gap: 3px; min-width: 0; }

.seccion {
  display: flex;
  align-items: stretch;
  border: 1px solid $azul;
  break-inside: avoid;
}
.tab-seccion {
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  text-align: center;
  background: $celeste;
  color: $azul-oscuro;
  font-weight: 700;
  font-size: 6.5px;
  letter-spacing: 0.5px;
  padding: 4px 1px;
  border-left: 1px solid $azul;
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
  flex: 0 0 auto;
}
.cuerpo-seccion { flex: 1; min-width: 0; padding: 2px 3px; }

// ---------- Primitivas ----------
.titulo-campo { font-weight: 700; font-size: 6px; }
.subtitulo {
  font-weight: 700;
  font-size: 6.5px;
  background: $celeste;
  padding: 1px 3px;
  margin: 3px 0 2px;
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}
.banda {
  background: $celeste;
  padding: 1px 3px;
  margin: 3px 0 2px;
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}
.linea {
  flex: 1;
  min-width: 30px;
  min-height: 8px;
  border-bottom: 1px solid $tinta;
  padding: 0 2px;
  &.corta { flex: 0 1 auto; min-width: 22px; }
}
.fila-lineas {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 2px;
  margin-bottom: 1.5px;
}
.casilla {
  display: inline-block;
  width: 7px;
  height: 7px;
  border: 1px solid $tinta;
  margin-right: 2px;
  position: relative;
  vertical-align: middle;
  flex: 0 0 auto;
  box-sizing: border-box;
  &.marcada::after {
    content: '✕';
    position: absolute;
    inset: -2px 0 0 0;
    font-size: 7px;
    font-weight: 700;
    text-align: center;
    line-height: 8px;
  }
}
.opcion {
  display: inline-flex;
  align-items: center;
  gap: 1px;
  margin: 0 4px 0 0;
  font-size: 6px;
}
.grupo-opciones {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 3px;
  margin: 2px 0;
}
.rejilla-opciones {
  display: grid;
  gap: 0 4px;
  margin: 1px 0 2px;
  &.dos { grid-template-columns: repeat(2, 1fr); }
  &.tres { grid-template-columns: repeat(3, 1fr); }
  &.cuatro { grid-template-columns: repeat(4, 1fr); }
}
.rejilla-bloques {
  display: grid;
  gap: 3px;
  margin: 2px 0;
  align-items: stretch;
  &.tres { grid-template-columns: repeat(3, 1fr); }
  &.cuatro { grid-template-columns: repeat(2, 1fr); }
  &.exploracion { grid-template-columns: 1.1fr 1fr; }
}
.bloque {
  border: 1px solid $borde;
  padding: 1px 2px;
  .opcion { display: flex; }
}

// ---------- Tablas ----------
.tabla-mini {
  width: 100%;
  border-collapse: collapse;
  margin: 3px 0;
  caption {
    background: $azul;
    color: #fff;
    font-weight: 700;
    font-size: 7px;
    padding: 1.5px 0;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
  th, td {
    border: 1px solid $azul;
    font-size: 5.8px;
    padding: 1px;
    text-align: center;
  }
  th {
    background: $celeste;
    color: $azul-oscuro;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
  td { height: 8px; }
}

// ---------- IX: exploración física, siluetas y pupilas ----------
.tabla-exploracion {
  width: 100%;
  border-collapse: collapse;
  td { border: 1px solid $borde; font-size: 6px; padding: 0.5px 2px; }
  .codigo { font-weight: 700; width: 12px; text-align: center; background: $celeste; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  td:last-child { width: 11px; text-align: center; }
}
.siluetas {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin: 2px 0;
}
.silueta {
  width: 34px;
  height: 72px;
  circle, path { fill: none; stroke: #666; stroke-width: 1.5; }
}
.zonas-lesion { font-size: 5.5px; .opcion { font-size: 5.5px; } }
.pupilas {
  display: flex;
  flex-direction: column;
  .opcion { display: flex; }
  .ojo {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    border: 1px solid $tinta;
    background: radial-gradient(circle, $tinta 0 35%, transparent 36%);
    margin-right: 2px;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
}

// ---------- Página 2 ----------
.rejilla-bloques.dos { grid-template-columns: repeat(2, 1fr); }
.centrado { text-align: center; }
.negativa {
  margin-top: 3px;
  .titulo-negativa { font-weight: 700; font-size: 6.5px; text-align: center; margin: 2px 0; }
}
.texto-legal {
  font-size: 6px;
  text-align: justify;
  margin: 3px 4px;
  line-height: 1.45;
}
.firmas { display: flex; gap: 10px; margin-top: 12px; }
.firma {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  .linea { width: 100%; min-height: 10px; text-align: center; }
  .pie-firma { font-size: 5.5px; margin-top: 1px; }
  &.centrada { margin-top: 8px; }
}
.pie-firma { font-size: 5.5px; }
.renglones-observaciones { display: flex; flex-direction: column; gap: 4px; padding: 2px 0; }
.renglon-observacion {
  min-height: 11px;
  background: $celeste;
  border-bottom: 1px solid $borde;
  padding: 1px 3px;
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}
.caja-sello {
  min-height: 60px;
  border: 1px solid $borde;
  margin: 4px 0;
  padding: 2px 3px;
}
.vehiculos {
  .col-num { width: 10px; font-weight: 700; }
  td { text-align: left; }
}
.titulo-material {
  text-align: center;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1px;
  margin: 8px 0 4px;
}
.material-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  align-items: start;
}
.material-categoria { border: 1px solid $azul; break-inside: avoid; }
.material-cabecera {
  background: $celeste;
  color: $azul-oscuro;
  font-weight: 700;
  font-size: 6px;
  text-align: center;
  padding: 1.5px 2px;
  border-bottom: 1px solid $azul;
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}
.material-item {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 0.5px 3px;
  font-size: 5.8px;
  .material-etiqueta { flex: 1; }
  .material-cantidad {
    min-width: 14px;
    border-bottom: 1px solid $borde;
    text-align: center;
  }
  .casilla { margin-right: 0; }
}
.pagina-1 { zoom: 0.9; }
.pie {
  margin-top: 8px;
  background: #111;
  color: #fff;
  text-align: right;
  padding: 6px 10px;
  font-size: 8px;
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
  .pie-linea { line-height: 1.4; }
}

// ---------- Impresión ----------
@media print {
  @page { size: letter; margin: 0.25in; }
  .hoja { width: auto; }
  .salto { break-after: page; }
  .pagina { padding: 0; }
}
`],
})
export class PdfVistaComponent implements OnChanges {
  @Input() registro: Record<string, any> | undefined;

  categorias = CATALOGO_MATERIAL;

  /** Códigos de la hoja física para EXPLORACIÓN FÍSICA (los nombres deben
   * coincidir con las opciones de evaluacionSecundaria.exploracionFisica). */
  exploracionFisica = [
    { codigo: 'D', nombre: 'Deformaciones' },
    { codigo: 'CO', nombre: 'Contusiones' },
    { codigo: 'A', nombre: 'Abrasiones' },
    { codigo: 'P', nombre: 'Penetraciones' },
    { codigo: 'MP', nombre: 'Movimientos paradójicos' },
    { codigo: 'C', nombre: 'Crepitación' },
    { codigo: 'H', nombre: 'Heridas' },
    { codigo: 'F', nombre: 'Fracturas' },
    { codigo: 'ES', nombre: 'Enfisema subcutáneo' },
    { codigo: 'Q', nombre: 'Quemaduras' },
    { codigo: 'L', nombre: 'Laceraciones' },
    { codigo: 'E', nombre: 'Edema' },
    { codigo: 'AS', nombre: 'Alteraciones de sensibilidad' },
    { codigo: 'AM', nombre: 'Alteraciones de movilidad' },
    { codigo: 'DO', nombre: 'Dolor' },
  ];
  filasSignos: Record<string, string>[] = [];
  filasFarmaco: Record<string, string>[] = [];
  filasVehiculos: Record<string, string>[] = [];

  ngOnChanges(): void {
    // Pre-calculadas para que *ngFor no reciba un arreglo nuevo en cada ciclo
    // de detección de cambios.
    this.filasSignos = this.rellenar('signosVitales', 3);
    this.filasFarmaco = this.rellenar('manejoFarmacologico', 4);
    this.filasVehiculos = this.rellenar('vehiculosInvolucrados', 4);
  }

  /** Valor plano de un campo; '' si está vacío (la hoja se imprime en blanco). */
  v(seccion: string, campo: string): string {
    const valor = this.registro?.[seccion]?.[campo];
    if (valor === undefined || valor === null) return '';
    if (Array.isArray(valor)) return valor.join(', ');
    return String(valor);
  }

  /**
   * true si la opción está seleccionada: en checkbox-grupo (arreglo) si la
   * contiene, en radio-grupo si es el valor, y en checkbox booleano (sin
   * opción) si el valor es true.
   */
  marcado(seccion: string, campo: string, opcion?: string): boolean {
    const valor = this.registro?.[seccion]?.[campo];
    if (opcion === undefined) return valor === true;
    if (Array.isArray(valor)) return valor.includes(opcion);
    return valor === opcion;
  }

  /** Opciones del catálogo SECCIONES para iterar las casillas en el template. */
  ops(seccionClave: string, campoClave: string): string[] {
    const seccion = SECCIONES.find(s => s.clave === seccionClave);
    return seccion?.campos.find(c => c.clave === campoClave)?.opciones ?? [];
  }

  materialMarcado(clave: string): boolean {
    return this.registro?.['materialUtilizado']?.[clave]?.marcado === true;
  }

  materialCantidad(clave: string): string {
    const cantidad = this.registro?.['materialUtilizado']?.[clave]?.cantidad;
    return cantidad ? String(cantidad) : '';
  }

  private rellenar(clave: string, minimo: number): Record<string, string>[] {
    const filas = [...((this.registro?.[clave] as Record<string, string>[] | undefined) ?? [])];
    while (filas.length < minimo) filas.push({});
    return filas;
  }
}
