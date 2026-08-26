import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useParams,
  useLocation,
} from "react-router-dom";

import Login from "./views/LoginF/login";
import Admin from "./views/AdminF/admin";
import Docente from "./views/DocenteF/docente";
import CursoPrincipal from "./views/DocenteF/cursoPrincipal";
import NotasCurso from "./views/Notas/notasCurso.jsx";

import NotificationCenter from "./components/NotificationCenter";
import SessionModal from "./components/SessionModal";
import {
  clearSessionStorage,
  getSessionExpiration,
  scheduleSessionWatch,
  subscribeSession,
  refreshSession,
} from "./services/session";

// Admin sub-rutas
import EstudiantesAdmin from "./views/AdminF/estudiantesAdmin";
import MateriasAdmin from "./views/AdminF/materiasAdmin";
import UsuariosAdmin from "./views/AdminF/usuariosAdmin";
import CursosAdmin from "./views/AdminF/cursosAdmin";
import CursoHubAdmin from "./views/AdminF/cursoHubAdmin";
import ConsultasAdmin from "./views/AdminF/consultasAdmin";
import PeriodizacionPage from "./views/Periodizacion/PeriodizacionPage";

function ProtectedRoute({ children, allowRoles = [], allowModes = [] }) {
  const token = localStorage.getItem("token");
  const role = (localStorage.getItem("role") || "").toLowerCase();
  const appMode = (
    localStorage.getItem("app_mode") || "institucional"
  ).toLowerCase();

  if (!token) return <Navigate to="/" replace />;
  if (allowRoles.length > 0 && !allowRoles.includes(role)) {
    return <Navigate to={role === "docente" ? "/docente" : "/"} replace />;
  }
  if (allowModes.length > 0 && !allowModes.includes(appMode)) {
    return (
      <Navigate to={appMode === "personal" ? "/docente" : "/admin"} replace />
    );
  }

  return children;
}

function RedirectCursoEstudiantes() {
  const { id } = useParams();
  return (
    <Navigate to={`/admin/cursos/${id}?tab=estudiantes`} replace />
  );
}

function AppShell({ sessionState, handleStay, handleLogout, clearSessionState }) {
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === "/" && sessionState) {
      clearSessionState(null);
    }
  }, [location.pathname, sessionState, clearSessionState]);

  return (
    <>
      <NotificationCenter />
      {location.pathname !== "/" && (
        <SessionModal
          state={sessionState}
          onStay={handleStay}
          onLogout={handleLogout}
        />
      )}
      <Routes>
        <Route path="/" element={<Login />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute
              allowRoles={["administrativo"]}
              allowModes={["institucional"]}
            >
              <Admin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/estudiantes"
          element={
            <ProtectedRoute
              allowRoles={["administrativo"]}
              allowModes={["institucional"]}
            >
              <EstudiantesAdmin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/estructura-academica"
          element={
            <ProtectedRoute
              allowRoles={["administrativo"]}
              allowModes={["institucional"]}
            >
              <MateriasAdmin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/materias"
          element={
            <ProtectedRoute
              allowRoles={["administrativo"]}
              allowModes={["institucional"]}
            >
              <Navigate to="/admin/estructura-academica" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/asignaciones"
          element={
            <ProtectedRoute
              allowRoles={["administrativo"]}
              allowModes={["institucional"]}
            >
              <Navigate to="/admin/cursos" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/asignaciones-academicas"
          element={
            <ProtectedRoute
              allowRoles={["administrativo"]}
              allowModes={["institucional"]}
            >
              <Navigate to="/admin/cursos" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/matriculacion"
          element={
            <ProtectedRoute
              allowRoles={["administrativo"]}
              allowModes={["institucional"]}
            >
              <Navigate to="/admin/estudiantes" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/matricula"
          element={
            <ProtectedRoute
              allowRoles={["administrativo"]}
              allowModes={["institucional"]}
            >
              <Navigate to="/admin/estudiantes" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/usuarios"
          element={
            <ProtectedRoute
              allowRoles={["administrativo"]}
              allowModes={["institucional"]}
            >
              <UsuariosAdmin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/cursos"
          element={
            <ProtectedRoute
              allowRoles={["administrativo"]}
              allowModes={["institucional"]}
            >
              <CursosAdmin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/cursos/:id"
          element={
            <ProtectedRoute
              allowRoles={["administrativo"]}
              allowModes={["institucional"]}
            >
              <CursoHubAdmin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/cursos/:id/estudiantes"
          element={
            <ProtectedRoute
              allowRoles={["administrativo"]}
              allowModes={["institucional"]}
            >
              <RedirectCursoEstudiantes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/consultas"
          element={
            <ProtectedRoute
              allowRoles={["administrativo"]}
              allowModes={["institucional"]}
            >
              <ConsultasAdmin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/docente"
          element={
            <ProtectedRoute
              allowRoles={["docente", "administrativo"]}
              allowModes={["institucional", "personal"]}
            >
              <Docente />
            </ProtectedRoute>
          }
        />
        <Route
          path="/curso/:id_curso"
          element={
            <ProtectedRoute
              allowRoles={["docente", "administrativo"]}
              allowModes={["institucional", "personal"]}
            >
              <CursoPrincipal />
            </ProtectedRoute>
          }
        />
        <Route
          path="/curso/:id_curso/notas"
          element={
            <ProtectedRoute
              allowRoles={["docente", "administrativo"]}
              allowModes={["institucional", "personal"]}
            >
              <NotasCurso />
            </ProtectedRoute>
          }
        />
        <Route
          path="/docente/periodizacion"
          element={
            <ProtectedRoute
              allowRoles={["docente", "administrativo"]}
              allowModes={["institucional", "personal"]}
            >
              <PeriodizacionPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}

function App() {
  const [sessionState, setSessionState] = useState(null);

  const getLoginRedirect = () => {
    const appMode = (localStorage.getItem("app_mode") || "").toLowerCase();
    if (appMode === "personal" || appMode === "institucional") {
      return `/?mode=${encodeURIComponent(appMode)}`;
    }
    return "/";
  };

  useEffect(() => {
    if (localStorage.getItem("token") && getSessionExpiration()) {
      scheduleSessionWatch();
    }

    const unsubscribe = subscribeSession((event) => {
      setSessionState(event);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = () => {
    const redirectTo = getLoginRedirect();
    clearSessionStorage();
    setSessionState(null);
    window.location.replace(redirectTo);
  };

  const handleStay = () => {
    refreshSession()
      .then(() => {
        setSessionState(null);
      })
      .catch(() => {
        handleLogout();
      });
  };

  return (
    <Router>
      <AppShell
        sessionState={sessionState}
        handleStay={handleStay}
        handleLogout={handleLogout}
        clearSessionState={setSessionState}
      />
    </Router>
  );
}

export default App;
