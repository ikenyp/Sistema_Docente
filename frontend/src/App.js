import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Login from "./paginas/login";
import Admin from "./paginas/admin";
import Docente from "./paginas/docente";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/docente" element={<Docente />} />
      </Routes>
    </Router>
  );
}

export default App;
