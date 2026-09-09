/** "Agencia Norte S.A." -> "agencia-norte-s-a" */
export function aSlug(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Iniciales para el avatar: "Humberto Alonso" -> "HA" */
export function iniciales(nombre: string) {
  const partes = nombre.trim().split(/\s+/).slice(0, 2);
  return partes.map((p) => p[0]?.toUpperCase() ?? "").join("");
}
