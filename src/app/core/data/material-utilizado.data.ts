export interface ItemMaterial {
  clave: string;
  nombre: string;
  tieneMedida?: boolean;
  unidadMedida?: string;
}

export interface CategoriaMaterial {
  clave: string;
  nombre: string;
  items: ItemMaterial[];
}

export const CATALOGO_MATERIAL: CategoriaMaterial[] = [
  {
    clave: 'basico',
    nombre: 'Consumo Nivel Básico',
    items: [
      { clave: 'guantes', nombre: 'Guantes' },
      { clave: 'cubrebocas', nombre: 'Cubrebocas' },
      { clave: 'gasasAbsorbentes', nombre: 'Gasas absorbentes' },
      { clave: 'vendaElastica5cm', nombre: 'Venda elástica 5 cm' },
      { clave: 'vendaElastica10cm', nombre: 'Venda elástica 10 cm' },
      { clave: 'vendaElastica15cm', nombre: 'Venda elástica 15 cm' },
      { clave: 'vendaElastica30cm', nombre: 'Venda elástica 30 cm' },
      { clave: 'vendaGasa10cm', nombre: 'Venda de gasa 10 cm' },
      { clave: 'bvmAdulto', nombre: 'BVM adulto' },
      { clave: 'bvmPediatrico', nombre: 'BVM pediátrico' },
      { clave: 'bvmNeonatal', nombre: 'BVM neonatal' },
      { clave: 'canulaOrofaringea', nombre: 'Cánula orofaríngea', tieneMedida: true },
      { clave: 'canulaNasofaringea', nombre: 'Cánula nasofaríngea', tieneMedida: true },
      { clave: 'sondaAspiracionBlanda', nombre: 'Sonda de aspiración blanda', tieneMedida: true },
    ],
  },
  {
    clave: 'solucionesCuracion',
    nombre: 'Soluciones y Curación',
    items: [
      { clave: 'sondaAspiracionRigida', nombre: 'Sonda de aspiración rígida' },
      { clave: 'solucionNacl09', nombre: 'Solución NaCl 0.9%', tieneMedida: true, unidadMedida: 'ml' },
      { clave: 'solucionGlu5', nombre: 'Solución Glu 5%', tieneMedida: true, unidadMedida: 'ml' },
      { clave: 'solucionHartman', nombre: 'Solución Hartman', tieneMedida: true, unidadMedida: 'ml' },
      { clave: 'tirasGlucometria', nombre: 'Tiras de glucometría' },
      { clave: 'torundas', nombre: 'Torundas' },
      { clave: 'apositoEsteril', nombre: 'Apósito estéril', tieneMedida: true },
      { clave: 'sabanaTermicaDesechable', nombre: 'Sábana térmica desechable' },
      { clave: 'lancetas', nombre: 'Lancetas' },
      { clave: 'telaAdhesiva', nombre: 'Tela adhesiva' },
      { clave: 'torundasAlcoholadas', nombre: 'Torundas alcoholadas' },
      { clave: 'puntasNasales', nombre: 'Puntas nasales', tieneMedida: true },
      { clave: 'mascarillaSimple', nombre: 'Mascarilla simple', tieneMedida: true },
      { clave: 'mascarillaConReservorio', nombre: 'Mascarilla con reservorio', tieneMedida: true },
    ],
  },
  {
    clave: 'inmovilizacionBioseguridad',
    nombre: 'Inmovilización y Bioseguridad',
    items: [
      { clave: 'collarinRigido', nombre: 'Collarín rígido', tieneMedida: true },
      { clave: 'collarinBlando', nombre: 'Collarín blando', tieneMedida: true },
      { clave: 'glucosaGelOral', nombre: 'Glucosa en gel oral' },
      { clave: 'parchesDea', nombre: 'Parches de DEA (par)' },
      { clave: 'bataQuirurgica', nombre: 'Bata quirúrgica' },
      { clave: 'overolProteccion', nombre: 'Overol de protección' },
      { clave: 'camposQuirurgicos', nombre: 'Campos quirúrgicos' },
      { clave: 'bolsaRoja', nombre: 'Bolsa roja' },
      { clave: 'bolsaAmarilla', nombre: 'Bolsa amarilla' },
      { clave: 'boteRojo', nombre: 'Bote rojo' },
      { clave: 'boteAmarillo', nombre: 'Bote amarillo' },
      { clave: 'salbutamolInhaladorA', nombre: 'Salbutamol en inhalador de dosis', tieneMedida: true },
      { clave: 'epinefrina11000Ampolleta', nombre: 'Epinefrina 1:1000 ampolleta' },
      { clave: 'nitroglicerinaPresentacion', nombre: 'Nitroglicerina', tieneMedida: true, unidadMedida: 'presentación' },
    ],
  },
  {
    clave: 'viaAereaAvanzadaAccesos',
    nombre: 'Vía Aérea Avanzada y Monitoreo',
    items: [
      { clave: 'tuboEndotraqueal', nombre: 'Tubo endotraqueal', tieneMedida: true },
      { clave: 'dispositivoSupraglotico', nombre: 'Dispositivo supraglótico' },
      { clave: 'guiaIntubacion', nombre: 'Guía de intubación' },
      { clave: 'bougie', nombre: 'Bougie' },
      { clave: 'microgotero', nombre: 'Microgotero' },
      { clave: 'normogotero', nombre: 'Normogotero' },
      { clave: 'macrogotero', nombre: 'Macrogotero' },
      { clave: 'venosetBomba', nombre: 'Venoset de bomba' },
      { clave: 'clampsUmbilicales', nombre: 'Clamps umbilicales' },
      { clave: 'electrodoEcg', nombre: 'Electrodo de ECG' },
      { clave: 'sensorSpco2', nombre: 'Sensor de SpCO2' },
      { clave: 'valvulaAsherman', nombre: 'Válvula de Asherman' },
      { clave: 'fijadorTomasAdulto', nombre: 'Fijador tomas adulto' },
      { clave: 'fijadorTomasPed', nombre: 'Fijador tomas pediátrico' },
    ],
  },
  {
    clave: 'accesosVenososMedCardiacos',
    nombre: 'Accesos Venosos y Medicamentos Cardiacos',
    items: [
      { clave: 'cateterEndovenoso', nombre: 'Catéter endovenoso', tieneMedida: true, unidadMedida: 'calibre' },
      { clave: 'jeringaHipodermica', nombre: 'Jeringa hipodérmica', tieneMedida: true, unidadMedida: 'cc' },
      { clave: 'vasoAspirador', nombre: 'Vaso de aspirador' },
      { clave: 'bolsaAspirador', nombre: 'Bolsa de aspirador' },
      { clave: 'glucosa50', nombre: 'Glucosa 50%' },
      { clave: 'curitas', nombre: 'Curitas' },
      { clave: 'abatelenguas', nombre: 'Abatelenguas' },
      { clave: 'cintaUmbilical', nombre: 'Cinta umbilical' },
      { clave: 'perillaAspiracion', nombre: 'Perilla de aspiración' },
      { clave: 'rastrilloDesechable', nombre: 'Rastrillo desechable' },
      { clave: 'sabanaQuemado', nombre: 'Sábana para quemado' },
      { clave: 'acidoAcetilsalicilicoTab', nombre: 'Ácido acetilsalicílico tab.' },
      { clave: 'isosorbidaTab', nombre: 'Isosorbida tab.' },
      { clave: 'trinitratoGliceriloPerlas', nombre: 'Trinitrato de glicerilo perlas' },
    ],
  },
  {
    clave: 'medicamentosConsumiblesEspeciales',
    nombre: 'Medicamentos y Consumibles Especiales',
    items: [
      { clave: 'epinefrinaAmp11000', nombre: 'Epinefrina amp. 1:1000' },
      { clave: 'salbutamolInhaladorB', nombre: 'Salbutamol inhalador de dosis', tieneMedida: true },
      { clave: 'atropinaAmp', nombre: 'Atropina amp. 1ml/1mg' },
      { clave: 'isodineSolucion', nombre: 'Isodine solución' },
      { clave: 'aguaOxigenada', nombre: 'Agua oxigenada' },
      { clave: 'equipoAtencionParto', nombre: 'Equipo de atención de parto' },
      { clave: 'tegadermFijacionIv', nombre: 'Tegaderm para fijación de IV' },
      { clave: 'tarjetasTriage', nombre: 'Tarjetas de triage' },
      { clave: 'sabanaDesechableCamilla', nombre: 'Sábana desechable de camilla' },
      { clave: 'guantesEsteriles', nombre: 'Guantes estériles', tieneMedida: true, unidadMedida: 'talla' },
      { clave: 'circuitoVentilador', nombre: 'Circuito de ventilador' },
      { clave: 'gasasEsteriles', nombre: 'Gasas estériles' },
      { clave: 'vendaTriangular', nombre: 'Venda triangular' },
      { clave: 'vendaIsraeli', nombre: 'Venda israelí' },
    ],
  },
];
