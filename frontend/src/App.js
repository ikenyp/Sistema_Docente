import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Login from "./views/login";
import Admin from "./views/admin";
import Docente from "./views/docente";

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
