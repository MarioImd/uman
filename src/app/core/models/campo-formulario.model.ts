export type TipoCampo =
  | 'texto'
  | 'numero'
  | 'fecha'
  | 'hora'
  | 'textarea'
  | 'checkbox'
  | 'checkbox-grupo'
  | 'radio-grupo'
  | 'select'
  | 'imagenes';

export interface CampoFormulario {
  clave: string;
  etiqueta: string;
  tipo: TipoCampo;
  opciones?: string[];
  sufijo?: string;
}

export interface TablaRepetible {
  clave: string;
  titulo: string;
  columnas: CampoFormulario[];
}

export interface SeccionFormulario {
  clave: string;
  titulo: string;
  campos: CampoFormulario[];
  tablas?: TablaRepetible[];
}
