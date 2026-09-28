export function getAdminRecentCoursesKey() {
  let userId = "anonimo";
  try {
    const usuario = JSON.parse(localStorage.getItem("usuario") || "null");
    userId = usuario?.id_usuario || usuario?.id || "anonimo";
  } catch {
    // Use the fallback key when the session payload is unavailable.
  }
  const contextoId = localStorage.getItem("contexto_activo") || "sin-contexto";
  return `admin_recent_courses:${userId}:${contextoId}`;
}
