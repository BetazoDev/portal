/**
 * Catálogo de proveedores de modelo. Vive aparte de llm.ts porque ese módulo
 * es "server-only" y el formulario de configuración corre en el navegador.
 */

export type Proveedor = "anthropic" | "openai" | "google" | "ollama" | "omniroute";

export const PROVEEDORES: {
  valor: Proveedor;
  etiqueta: string;
  modeloSugerido: string;
  /** Los de paga la piden; una pasarela propia la resuelve en su red. */
  necesitaLlave: boolean;
  urlSugerida?: string;
  ayuda?: string;
}[] = [
  {
    valor: "anthropic",
    etiqueta: "Anthropic",
    modeloSugerido: "claude-sonnet-5",
    necesitaLlave: true,
  },
  { valor: "openai", etiqueta: "OpenAI", modeloSugerido: "gpt-4.1", necesitaLlave: true },
  { valor: "google", etiqueta: "Google", modeloSugerido: "gemini-2.5-pro", necesitaLlave: true },
  {
    valor: "ollama",
    etiqueta: "Ollama",
    modeloSugerido: "llama3.1",
    necesitaLlave: false,
    urlSugerida: "http://localhost:11434/v1",
    ayuda: "Modelo local. El servidor del CRM tiene que alcanzar esa dirección.",
  },
  {
    valor: "omniroute",
    etiqueta: "OmniRoute",
    modeloSugerido: "auto",
    necesitaLlave: false,
    urlSugerida: "http://omniroute:20128/v1",
    ayuda:
      "Pasarela propia con muchos proveedores detrás. El resumen incluye tus notas privadas, así que fija un modelo concreto en vez de dejar auto si te importa a dónde van.",
  },
];

export function necesitaLlave(proveedor: string) {
  return PROVEEDORES.find((p) => p.valor === proveedor)?.necesitaLlave ?? true;
}

export function proveedor(valor: string) {
  return PROVEEDORES.find((p) => p.valor === valor);
}
