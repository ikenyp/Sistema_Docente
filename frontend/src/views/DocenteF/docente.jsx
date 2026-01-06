import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/docente.css";

function Docente() {
  const navigate = useNavigate();

  const [cursos, setCursos] = useState([]);
  const [nuevoCurso, setNuevoCurso] = useState("");
  const [menuAbierto, setMenuAbierto] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [nombreEditado, setNombreEditado] = useState("");
  const [menuUsuario, setMenuUsuario] = useState(false);

  // ====================== SIMULACIÓN BD ======================
  useEffect(() => {
    const data = [
      { id: "1", nombre: "2do Ciencias Emprendimiento" },
      { id: "2", nombre: "3ro Ciencias Emprendimiento" },
      { id: "3", nombre: "3ro Técnico Matemáticas" },
    ];
    setCursos(data);
  }, []);

  // ====================== CRUD SIMULADO ======================
  const crearCurso = (nombre) => {
    const nuevo = { id: Date.now().toString(), nombre };
    setCursos((prev) => [...prev, nuevo]);
  };

  const editarCurso = (id, nuevoNombre) => {
    setCursos((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, nombre: nuevoNombre } : c
      )
    );
  };

  const eliminarCurso = (id) => {
    setCursos((prev) => prev.filter((c) => c.id !== id));
  };

  // ====================== ACCIONES ======================
  const handleGuardar = (id) => {
    if (!nombreEditado.trim()) return;
    editarCurso(id, nombreEditado.trim());
    setEditandoId(null);
  };

  const handleAgregarCurso = () => {
    if (!nuevoCurso.trim()) {
      alert("Debe ingresar un nombre de curso");
      return;
    }
    crearCurso(nuevoCurso.trim());
    setNuevoCurso("");
  };

  const cerrarSesion = () => {
    navigate("/");
  };

  return (
    <div className="docente-page">

      {/* ====================== NAVBAR ====================== */}
      <div className="navbar-docente">
        <div className="menu-icon">☰</div>

        <div
          className="navbar-user"
          onClick={() => setMenuUsuario(!menuUsuario)}
        >
          Keny Elan Nieto Plua
        </div>

        {menuUsuario && (
          <div className="menu-usuario">
            <button onClick={cerrarSesion}>Cerrar Sesión</button>
          </div>
        )}
      </div>

      {/* ====================== CONTENIDO ====================== */}
      <div className="docente-container">
        <h1 className="docente-title">Cursos</h1>

        {/* AGREGAR CURSO */}
        <div className="add-course-section">
          <input
            type="text"
            placeholder="Nombre del curso"
            value={nuevoCurso}
            onChange={(e) => setNuevoCurso(e.target.value)}
            className="input-curso"
          />

          <button className="btn-add" onClick={handleAgregarCurso}>
            Añadir Curso
          </button>
        </div>

        {/* GRID DE CURSOS */}
        <div className="grid-cursos">
          {cursos.map((curso) => (
            <div className="curso-card" key={curso.id}>

              {/* MENÚ SUPERIOR */}
              <div className="card-header">
                <button
                  className="options-btn"
                  onClick={() =>
                    setMenuAbierto(menuAbierto === curso.id ? null : curso.id)
                  }
                >
                  ⋯
                </button>

                {menuAbierto === curso.id && (
                  <div className="menu-opciones">
                    <button
                      onClick={() => {
                        setEditandoId(curso.id);
                        setNombreEditado(curso.nombre);
                        setMenuAbierto(null);
                      }}
                    >
                      Renombrar
                    </button>

                    <button
                      className="delete"
                      onClick={() => eliminarCurso(curso.id)}
                    >
                      Eliminar
                    </button>
                  </div>
                )}
              </div>

              {/* NOMBRE / EDICIÓN */}
              {editandoId === curso.id ? (
                <div>
                  <input
                    type="text"
                    className="input-edit"
                    value={nombreEditado}
                    onChange={(e) => setNombreEditado(e.target.value)}
                  />
                  <button
                    className="btn-save"
                    onClick={() => handleGuardar(curso.id)}
                  >
                    Guardar
                  </button>
                </div>
              ) : (
                <p className="curso-nombre">{curso.nombre}</p>
              )}

              {/* INGRESAR A NOTAS */}
              <button
                className="btn-ingresar"
                onClick={() =>
                  navigate(`/curso/${curso.id}/notas`, {
                    state: { rol: "Docente" },
                  })
                }
              >
                Ingresar
              </button>

            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Docente;
