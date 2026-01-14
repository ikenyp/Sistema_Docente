import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/docente.css";
import { cursosAPI } from "../../services/api";

function Docente() {
  const navigate = useNavigate();

  const [cursos, setCursos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [menuUsuario, setMenuUsuario] = useState(false);
  const [datosUsuario, setDatosUsuario] = useState(null);

  // ====================== CARGAR CURSOS DEL DOCENTE ======================
  const cargarCursos = useCallback(async () => {
    try {
      setCargando(true);
      setError(null);

      // Obtener datos del usuario actual desde localStorage
      const usuarioJSON = localStorage.getItem("usuario");
      if (!usuarioJSON) {
        setError("No hay usuario autenticado");
        navigate("/");
        return;
      }

      const usuario = JSON.parse(usuarioJSON);
      setDatosUsuario(usuario);

      // Obtener cursos del docente (tutor)
      console.log("Cargando cursos para tutor:", usuario.id_usuario);
      const cursosData = await cursosAPI.obtenerCursosPorDocente(
        usuario.id_usuario
      );
      console.log("Cursos obtenidos:", cursosData);
      setCursos(cursosData || []);
    } catch (err) {
      console.error("Error al cargar cursos:", err);
      // Si el error es 404, significa que no hay cursos, no es un error real
      if (err.message && err.message.includes("404")) {
        setCursos([]);
      } else {
        setError(err.message || "Error al cargar los cursos");
      }
    } finally {
      setCargando(false);
    }
  }, [navigate]);

  useEffect(() => {
    cargarCursos();
  }, [cargarCursos]);

  // ====================== ACCIONES ======================
  const irAlCurso = (curso) => {
    navigate(`/curso/${curso.id_curso}`, {
      state: { curso, rol: "Docente" },
    });
  };

  const cerrarSesion = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
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
          {datosUsuario
            ? `${datosUsuario.nombre} ${datosUsuario.apellido}`
            : "Docente"}
        </div>

        {menuUsuario && (
          <div className="menu-usuario">
            <button onClick={cerrarSesion}>Cerrar Sesión</button>
          </div>
        )}
      </div>

      {/* ====================== CONTENIDO ====================== */}
      <div className="docente-container">
        <h1 className="panel-title">Panel de Gestión Docente</h1>
        <h2 className="docente-title">Mis Cursos</h2>

        {/* MENSAJE DE CARGA/ERROR */}
        {cargando && <p>Cargando cursos...</p>}
        {error && <p style={{ color: "red" }}>Error: {error}</p>}

        {/* GRID DE CURSOS */}
        {!cargando && !error && (
          <div className="grid-cursos">
            {cursos.length === 0 ? (
              <p>No tienes cursos asignados</p>
            ) : (
              cursos.map((curso) => (
                <div className="curso-card" key={curso.id_curso}>
                  <p className="curso-nombre">{curso.nombre}</p>
                  <p className="curso-info">Año: {curso.anio_lectivo}</p>
                  <button
                    className="btn-ingresar"
                    onClick={() => irAlCurso(curso)}
                  >
                    Ver Curso
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Docente;
