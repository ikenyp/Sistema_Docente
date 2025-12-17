import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Login from "./views/LoginF/login";
import Admin from "./views/AdminF/admin";
import Docente from "./views/DocenteF/docente";
import Estudiantes from "./views/Estudiantes/estudiantes";
import NotasCurso from "./views/Notas/notasCurso";



function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/docente" element={<Docente />} />
        <Route path="/admin/cursos/:id/estudiantes" element={<Estudiantes />} />
        <Route path="/curso/:id/notas" element={<NotasCurso />} />
      </Routes>
    </Router>
  );
}

export default App;
