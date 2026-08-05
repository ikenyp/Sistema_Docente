import React, { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { ADMIN_NAV, PERSONAL_DOCENTE_NAV } from "./adminNav";
import "../../styles/admin.css";

function AdminLayout({ title, subtitle, children, navItems, defaultUserLabel }) {
  const navigate = useNavigate();
  const [menuUsuario, setMenuUsuario] = useState(false);
  const [datosUsuario, setDatosUsuario] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const appMode =
    (localStorage.getItem("app_mode") || "institucional").toLowerCase();

  const resolvedNav =
    navItems || (appMode === "personal" ? PERSONAL_DOCENTE_NAV : ADMIN_NAV);
  const resolvedUserLabel =
    defaultUserLabel || (appMode === "personal" ? "Docente" : "Administrador");

  useEffect(() => {
    const usuarioJSON = localStorage.getItem("usuario");
    const usuario = usuarioJSON ? JSON.parse(usuarioJSON) : null;
    if (usuario) setDatosUsuario(usuario);
  }, []);

  const cerrarSesion = () => {
    const appMode = localStorage.getItem("app_mode") || "institucional";
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    localStorage.removeItem("app_mode");
    navigate(`/?mode=${appMode}`);
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
            ? `${datosUsuario.nombre} ${datosUsuario.apellido}`
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
                {title && <h1 className="admin-page-title">{title}</h1>}
                {subtitle && <p className="panel-sub">{subtitle}</p>}
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
