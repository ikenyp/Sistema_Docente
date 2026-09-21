export function validarContrasena(value = "") {
  if (value.length < 8) return "La contraseña debe tener al menos 8 caracteres";
  if (!/[A-Z]/.test(value)) return "La contraseña debe incluir una mayúscula";
  if (!/[a-z]/.test(value)) return "La contraseña debe incluir una minúscula";
  if (!/[0-9]/.test(value)) return "La contraseña debe incluir un número";
  return "";
}
