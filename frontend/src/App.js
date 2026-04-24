import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Login from "./views/LoginF/login";
import Admin from "./views/AdminF/admin";
import Docente from "./views/DocenteF/docente";
import CursoPrincipal from "./views/DocenteF/cursoPrincipal";
import Estudiantes from "./views/Estudiantes/estudiantes";
import NotasCurso from "./views/Notas/notasCurso.jsx";

// Admin sub-rutas
import EstudiantesAdmin from "./views/AdminF/estudiantesAdmin";
import MateriasAdmin from "./views/AdminF/materiasAdmin";
import AsignacionesAdmin from "./views/AdminF/asignacionesAdmin";
import MatriculacionAdmin from "./views/AdminF/matriculacionAdmin";
import LecturasAdmin from "./views/AdminF/lecturasAdmin";
import PromediosAdmin from "./views/AdminF/promediosAdmin";

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

function App() {
  return (
    <Router>
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
          path="/admin/materias"
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
          path="/admin/asignaciones"
          element={
            <ProtectedRoute
              allowRoles={["administrativo"]}
              allowModes={["institucional"]}
            >
              <AsignacionesAdmin />
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
              <MatriculacionAdmin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/lecturas"
          element={
            <ProtectedRoute
              allowRoles={["administrativo"]}
              allowModes={["institucional"]}
            >
              <LecturasAdmin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/promedios"
          element={
            <ProtectedRoute
              allowRoles={["administrativo"]}
              allowModes={["institucional"]}
            >
              <PromediosAdmin />
            </ProtectedRoute>
          }
        />

        <Route
          path="/docente"
          element={
            <ProtectedRoute allowRoles={["docente"]}>
              <Docente />
            </ProtectedRoute>
          }
        />
        <Route
          path="/curso/:id_curso"
          element={
            <ProtectedRoute allowRoles={["docente"]}>
              <CursoPrincipal />
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
              <Estudiantes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/curso/:id/notas"
          element={
            <ProtectedRoute allowRoles={["docente"]}>
              <NotasCurso />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
