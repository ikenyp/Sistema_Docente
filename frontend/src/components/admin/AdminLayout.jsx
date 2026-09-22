import React, { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { ADMIN_NAV, PERSONAL_DOCENTE_NAV } from "./adminNav";
import { clearSessionStorage } from "../../services/session";
import { normalizarAnioLectivo } from "../../utils/anioLectivo";
import { nombrePersona } from "../../utils/personas";
import "../../styles/admin.css";

function AdminLayout({ title, subtitle, children, navItems, defaultUserLabel, headerActions }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuUsuario, setMenuUsuario] = useState(false);
  const [datosUsuario, setDatosUsuario] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const appMode =
    (localStorage.getItem("app_mode") || "institucional").toLowerCase();

  const resolvedNav =
    navItems || (appMode === "personal" ? PERSONAL_DOCENTE_NAV : ADMIN_NAV);
  const resolvedUserLabel =
    defaultUserLabel || (appMode === "personal" ? "Docente" : "Administrador");

  const anioLectivoActivo = normalizarAnioLectivo(
    localStorage.getItem("anio_lectivo_activo") || "",
  );
  const contextoActivo = localStorage.getItem("contexto_activo") || "";

  const cursosRecientes = (() => {
    if (appMode !== "institucional") return [];
    if (localStorage.getItem("admin_recent_courses_context") !== contextoActivo) return [];
    try {
      const raw = JSON.parse(localStorage.getItem("admin_recent_courses") || "[]");
      return (Array.isArray(raw) ? raw : [])
        .filter((item) => item && item.id_curso)
        .filter((item) => !anioLectivoActivo || normalizarAnioLectivo(item.anio_lectivo) === anioLectivoActivo)
        .slice(0, 5);
    } catch {
      return [];
    }
  })();

  useEffect(() => {
    const usuarioJSON = localStorage.getItem("usuario");
    const usuario = usuarioJSON ? JSON.parse(usuarioJSON) : null;
    if (usuario) setDatosUsuario(usuario);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const cerrarSesion = () => {
    const appMode = localStorage.getItem("app_mode") || "institucional";
    clearSessionStorage();
    window.location.replace(`/?mode=${appMode}`);
  };

  return (
    <div className="admin-page">
      <header className="navbar-admin">
        <button
          type="button"
          className="admin-sidebar-toggle"
          aria-label="Menú"
          onClick={() => setSidebarOpen((v) => !v)}
        >
          ☰
        </button>
        <h1 className="titulo-admin">📚 Sistema Docente</h1>
        <div
          className="navbar-user"
          onClick={() => setMenuUsuario(!menuUsuario)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setMenuUsuario(!menuUsuario)}
        >
          {datosUsuario
            ? nombrePersona(datosUsuario)
            : resolvedUserLabel}
        </div>
        {menuUsuario && (
          <div className="menu-usuario">
            <button type="button" onClick={cerrarSesion}>
              Cerrar sesión
            </button>
          </div>
        )}
      </header>

      <div className={`admin-shell${sidebarOpen ? " sidebar-open" : ""}`}>
        <aside className="admin-sidebar" aria-label="Navegación administrativa">
          <nav className="admin-sidebar-nav">
            {resolvedNav.map((item, idx) =>
              item.kind === "heading" ? (
                <p key={`h-${idx}`} className="admin-nav-heading">
                  {item.label}
                </p>
              ) : (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `admin-nav-link${isActive ? " active" : ""}`
                  }
                  onClick={() => setSidebarOpen(false)}
                >
                  {item.label}
                </NavLink>
              ),
            )}

            {cursosRecientes.length > 0 && (
              <>
                <p className="admin-nav-heading admin-nav-heading-recent">Cursos recientes</p>
                {cursosRecientes.map((curso) => (
                  <NavLink
                    key={curso.id_curso}
                    to={`/admin/cursos/${curso.id_curso}`}
                    className={({ isActive }) =>
                      `admin-nav-link admin-nav-link-recent${isActive ? " active" : ""}`
                    }
                    onClick={() => setSidebarOpen(false)}
                    title={curso.nombre}
                  >
                    <span className="admin-nav-link-main">{curso.nombre}</span>
                    <span className="admin-nav-link-sub">{curso.anio_lectivo || ""}</span>
                  </NavLink>
                ))}
              </>
            )}
          </nav>
        </aside>

        {sidebarOpen && (
          <button
            type="button"
            className="admin-sidebar-backdrop"
            aria-label="Cerrar menú"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="admin-main">
          <div className="admin-container admin-container-wide">
            {(title || subtitle) && (
              <header className="admin-page-head">
                <div className="admin-page-head-main">
                  {title && <h1 className="admin-page-title">{title}</h1>}
                  {subtitle && <p className="panel-sub">{subtitle}</p>}
                </div>
                {headerActions && <div className="admin-page-head-actions">{headerActions}</div>}
              </header>
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
