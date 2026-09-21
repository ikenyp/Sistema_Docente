// En toda la aplicación mostramos primero los apellidos para facilitar
// búsquedas y mantener el mismo orden que suelen usar los listados escolares.
export function nombrePersona(persona) {
  if (!persona) return "";
  return [persona.apellido, persona.nombre].filter(Boolean).join(" ").trim();
}
