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
  const getCursos = async () => {
    const data = [
      { id: "1", nombre: "2do Ciencias Emprendimiento" },
      { id: "2", nombre: "3ro Ciencias Emprendimiento" },
      { id: "3", nombre: "3ro Técnico Matemáticas" },
    ];
    setCursos(data);
  };

  const crearCurso = async (nombre) => {
    const nuevo = { id: Date.now().toString(), nombre };
    setCursos((prev) => [...prev, nuevo]);
  };

  const editarCurso = async (id, nuevoNombre) => {
    setCursos((prev) =>
      prev.map((curso) =>
        curso.id === id ? { ...curso, nombre: nuevoNombre } : curso
      )
    );
  };

  const eliminarCurso = async (id) => {
    setCursos((prev) => prev.filter((curso) => curso.id !== id));
  };

  useEffect(() => {
    getCursos();
  }, []);

  // ====================== GUARDAR EDICIÓN ======================
  const handleGuardar = (id) => {
    if (!nombreEditado.trim()) return;
    editarCurso(id, nombreEditado.trim());
    setEditandoId(null);
  };

  // ====================== AGREGAR CURSO ======================
  const handleAgregarCurso = () => {
    if (!nuevoCurso.trim()) {
      alert("Debe ingresar un nombre de curso.");
      return;
    }

    crearCurso(nuevoCurso.trim());
    setNuevoCurso("");
  };

  // ====================== CERRAR SESIÓN ======================
  const cerrarSesion = () => {
    navigate("/");
  };

  return (
    <div className="docente-page">

      {/* NAVBAR */}
      <div className="navbar-docente">

        <div className="menu-icon">☰</div>

        <div className="navbar-user" onClick={() => setMenuUsuario(!menuUsuario)}>
          Keny Elan Nieto Plua 
        </div>

        {menuUsuario && (
          <div className="menu-usuario">
            <button onClick={cerrarSesion}>Cerrar Sesión</button>
          </div>
        )}
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="docente-container">

        <h1 className="docente-title">Cursos</h1>

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

              {/* BOTONES SUPERIORES */}
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

              {/* INPUT PARA EDITAR */}
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

              {/* BOTÓN INGRESAR */}
              <button
                className="btn-ingresar"
                onClick={() => alert("Ingresando a " + curso.nombre)}
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
