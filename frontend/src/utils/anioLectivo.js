export function normalizarAnioLectivo(valor) {
  if (!valor) return "";
  const texto = String(valor).trim();
  if (/^\d{4}$/.test(texto)) return `${texto}-${Number(texto) + 1}`;
  return texto;
}

export function formatearAnioLectivoInput(valor) {
  const soloNumeros = String(valor || "").replace(/\D/g, "");
  if (soloNumeros.length <= 4) return soloNumeros;
  return `${soloNumeros.slice(0, 4)}-${soloNumeros.slice(4, 8)}`;
}

export function validarAnioLectivo(anio) {
  const patron = /^\d{4}-\d{4}$/;
  if (!patron.test(anio)) return "Formato inválido. Usa: 2026-2027";
  const [inicio, fin] = anio.split("-").map(Number);
  if (fin !== inicio + 1) return "El año final debe ser +1 del inicial (ej: 2026-2027)";
  return null;
}
