/** Navegación del panel administrativo organizada por flujo de trabajo. */
export const ADMIN_NAV = [
  { kind: "link", to: "/admin", label: "Inicio", end: true },
  { kind: "heading", label: "Configuración" },
  { kind: "link", to: "/admin/usuarios", label: "Usuarios" },
  { kind: "link", to: "/admin/materias", label: "Materias" },
  { kind: "link", to: "/admin/cursos", label: "Cursos" },
  { kind: "link", to: "/admin/estudiantes", label: "Estudiantes" },
];

export const PERSONAL_DOCENTE_NAV = [
  { kind: "link", to: "/docente", label: "Inicio", end: true },
  { kind: "heading", label: "Configuración" },
  { kind: "link", to: "/docente/estructura-academica", label: "Materias" },
  { kind: "link", to: "/docente/periodizacion", label: "Periodizacion" },
];
