import React, { useEffect, useState } from "react";
import { CircleHelp } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { ADMIN_NAV, PERSONAL_DOCENTE_NAV } from "./adminNav";
import { clearSessionStorage } from "../../services/session";
import { normalizarAnioLectivo } from "../../utils/anioLectivo";
import { nombrePersona } from "../../utils/personas";
import { abrirTutorial } from "../AppTutorial";
import { API_ROOT_URL } from "../../services/apiConfig";
import { requestHttp } from "../../services/http";
import { getAdminRecentCoursesKey } from "../../utils/adminRecentCourses";
import "../../styles/admin.css";

function AdminLayout({ title, subtitle, children, navItems, defaultUserLabel, headerActions, pageTitleTutorialTarget }) {
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
  const [contextoNombre, setContextoNombre] = useState(
    localStorage.getItem("contexto_nombre") || "Institución activa",
  );

  useEffect(() => {
    const cerrarMenuFuera = (event) => {
      if (!event.target.closest(".navbar-user, .menu-usuario")) {
        setMenuUsuario(false);
      }
    };
    document.addEventListener("pointerdown", cerrarMenuFuera);
    return () => document.removeEventListener("pointerdown", cerrarMenuFuera);
  }, []);

  useEffect(() => {
    const cargarNombreContexto = async () => {
      const token = localStorage.getItem("token");
      const contextoId = localStorage.getItem("contexto_activo");
      if (!token || !contextoId) return;
      try {
        const contextos = await requestHttp(`${API_ROOT_URL}/auth/contextos`, "GET", null, {
          Authorization: `Bearer ${token}`,
          "X-App-Mode": "institucional",
        });
        const contexto = (contextos || []).find(
          (item) => String(item.id_contexto) === String(contextoId),
        );
        if (contexto?.nombre) {
          setContextoNombre(contexto.nombre);
          localStorage.setItem("contexto_nombre", contexto.nombre);
        }
      } catch {
        // El nombre guardado localmente se mantiene como respaldo visual.
      }
    };
    cargarNombreContexto();
  }, []);

  const anioLectivoActivo = normalizarAnioLectivo(
    localStorage.getItem(`anio_lectivo_activo:institucional:${localStorage.getItem("contexto_activo") || "sin-contexto"}`) || "",
  );
  const contextoActivo = localStorage.getItem("contexto_activo") || "";

  const cursosRecientes = (() => {
    if (appMode !== "institucional") return [];
    try {
      const raw = JSON.parse(localStorage.getItem(getAdminRecentCoursesKey()) || "[]");
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
        <h1 className="titulo-admin navbar-title-left">Panel administrativo</h1>
        <div className="navbar-context" title={contextoNombre}>
          <small>Institución activa</small>
          <strong>{contextoNombre}</strong>
        </div>
        {(location.pathname === "/admin" || location.pathname.startsWith("/admin/cursos/")) && (
          <button type="button" className="navbar-help-trigger" aria-label="Abrir tutorial" data-tooltip="Tutorial" onClick={() => { setMenuUsuario(false); abrirTutorial(); }}>
            <CircleHelp size={17} />
          </button>
        )}
        <div
          className="navbar-user"
          onClick={() => setMenuUsuario(!menuUsuario)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setMenuUsuario(!menuUsuario)}
        >
          <span className="navbar-user-meta">
            <strong>{datosUsuario ? nombrePersona(datosUsuario) : resolvedUserLabel}</strong>
            <small>Administrador</small>
          </span>
          <span className="navbar-user-chevron" aria-hidden="true" />
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
        <aside className="admin-sidebar" data-tutorial="admin-sidebar" aria-label="Navegación administrativa">
          <nav className="admin-sidebar-nav">
            {resolvedNav.map((item, idx) =>
              item.kind === "heading" ? (
                <p key={`h-${idx}`} className="admin-nav-heading">
                  {item.label}
                </p>
              ) : (
                <NavLink
                  key={item.to}
                  data-tutorial={item.label === "Cursos" ? "admin-cursos-nav" : undefined}
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
                <div className="admin-page-head-main" data-tutorial={pageTitleTutorialTarget}>
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
