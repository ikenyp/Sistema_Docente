import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/docente.css";
import {
  cmdAPI,
  cursosAPI,
  materiasAPI,
  asignacionesAPI,
} from "../../services/api";

function Docente() {
  const navigate = useNavigate();

  const [cursos, setCursos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [menuUsuario, setMenuUsuario] = useState(false);
  const [datosUsuario, setDatosUsuario] = useState(null);
  const [appMode, setAppMode] = useState(
    (localStorage.getItem("app_mode") || "institucional").toLowerCase(),
  );

  const [materiasDisponibles, setMateriasDisponibles] = useState([]);
  const [nuevoCurso, setNuevoCurso] = useState({
    nombre: "",
    anio_lectivo: "",
  });
  const [nuevaMateria, setNuevaMateria] = useState({ nombre: "" });
  const [nuevaAsignacion, setNuevaAsignacion] = useState({
    id_curso: "",
    id_materia: "",
  });
  const [guardandoGestion, setGuardandoGestion] = useState(false);

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
      setAppMode(
        (localStorage.getItem("app_mode") || "institucional").toLowerCase(),
      );

      // Obtener cursos en los que el docente está asignado
      const asignaciones = await cmdAPI.listarPorDocente(usuario.id_usuario);

      // Deduplicar cursos (un docente puede tener varias materias en el mismo curso)
      const cursosUnicos = [];
      const vistos = new Set();

      (asignaciones || []).forEach((asig) => {
        const curso =
          asig?.curso ||
          (asig?.id_curso
            ? { id_curso: asig.id_curso, nombre: "Curso", anio_lectivo: "" }
            : null);

        if (curso && curso.id_curso && !vistos.has(curso.id_curso)) {
          vistos.add(curso.id_curso);
          cursosUnicos.push(curso);
        }
      });

      // En modo personal también mostrar cursos donde es tutor
      if (
        (localStorage.getItem("app_mode") || "institucional").toLowerCase() ===
        "personal"
      ) {
        const cursosPropios = await cursosAPI.listar({
          id_tutor: usuario.id_usuario,
          size: 100,
        });
        (cursosPropios || []).forEach((curso) => {
          if (curso && curso.id_curso && !vistos.has(curso.id_curso)) {
            vistos.add(curso.id_curso);
            cursosUnicos.push(curso);
          }
        });
      }

      setCursos(cursosUnicos);
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

  const cargarMaterias = useCallback(async () => {
    if (
      (localStorage.getItem("app_mode") || "institucional").toLowerCase() !==
      "personal"
    )
      return;
    try {
      const data = await materiasAPI.listar({ size: 100 });
      setMateriasDisponibles(data || []);
    } catch (err) {
      console.error("Error al cargar materias:", err);
    }
  }, []);

  useEffect(() => {
    cargarMaterias();
  }, [cargarMaterias]);

  // ====================== ACCIONES ======================
  const irAlCurso = (curso) => {
    navigate(`/curso/${curso.id_curso}`, {
      state: { curso, rol: "Docente" },
    });
  };

  const cerrarSesion = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    localStorage.removeItem("app_mode");
    navigate("/");
  };

  const crearCursoPersonal = async () => {
    if (!nuevoCurso.nombre || !nuevoCurso.anio_lectivo) {
      alert("Nombre y año lectivo son obligatorios");
      return;
    }
    try {
      setGuardandoGestion(true);
      await cursosAPI.crear(nuevoCurso);
      setNuevoCurso({ nombre: "", anio_lectivo: "" });
      await cargarCursos();
      alert("Curso creado correctamente");
    } catch (err) {
      alert(`No se pudo crear el curso: ${err.message}`);
    } finally {
      setGuardandoGestion(false);
    }
  };

  const crearMateriaPersonal = async () => {
    if (!nuevaMateria.nombre) {
      alert("El nombre de la materia es obligatorio");
      return;
    }
    try {
      setGuardandoGestion(true);
      await materiasAPI.crear(nuevaMateria);
      setNuevaMateria({ nombre: "" });
      await cargarMaterias();
      alert("Materia creada correctamente");
    } catch (err) {
      alert(`No se pudo crear la materia: ${err.message}`);
    } finally {
      setGuardandoGestion(false);
    }
  };

  const crearAsignacionPersonal = async () => {
    if (
      !nuevaAsignacion.id_curso ||
      !nuevaAsignacion.id_materia ||
      !datosUsuario
    ) {
      alert("Debe seleccionar curso y materia");
      return;
    }

    try {
      setGuardandoGestion(true);
      await asignacionesAPI.crear({
        id_curso: parseInt(nuevaAsignacion.id_curso, 10),
        id_materia: parseInt(nuevaAsignacion.id_materia, 10),
        id_docente: datosUsuario.id_usuario,
      });
      setNuevaAsignacion({ id_curso: "", id_materia: "" });
      await cargarCursos();
      alert("Asignación creada correctamente");
    } catch (err) {
      alert(`No se pudo crear la asignación: ${err.message}`);
    } finally {
      setGuardandoGestion(false);
    }
  };

  return (
    <div className="docente-page">
      {/* ====================== NAVBAR ====================== */}
      <div className="navbar-docente">
        <div className="menu-icon">☰</div>

        <div className="navbar-title navbar-title-docente">
          Panel de Gestión Docente
        </div>

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
        <h2 className="docente-title">Mis Cursos</h2>

        {/* MENSAJE DE CARGA/ERROR */}
        {cargando && <p>Cargando cursos...</p>}
        {error && <p style={{ color: "red" }}>Error: {error}</p>}

        {/* GRID DE CURSOS */}
        {!cargando && !error && (
          <>
            {appMode === "personal" && (
              <div className="personal-setup-card">
                <h3 className="personal-setup-title">
                  Configuración rápida (modo personal)
                </h3>

                <div className="personal-grid personal-grid-3">
                  <input
                    className="personal-input"
                    type="text"
                    placeholder="Nombre del curso"
                    value={nuevoCurso.nombre}
                    onChange={(e) =>
                      setNuevoCurso((p) => ({ ...p, nombre: e.target.value }))
                    }
                  />
                  <input
                    className="personal-input"
                    type="text"
                    placeholder="Año lectivo (ej. 2026-2027)"
                    value={nuevoCurso.anio_lectivo}
                    onChange={(e) =>
                      setNuevoCurso((p) => ({
                        ...p,
                        anio_lectivo: e.target.value,
                      }))
                    }
                  />
                  <button
                    className="personal-action"
                    onClick={crearCursoPersonal}
                    disabled={guardandoGestion}
                  >
                    Crear curso
                  </button>
                </div>

                <div className="personal-grid personal-grid-2">
                  <input
                    className="personal-input"
                    type="text"
                    placeholder="Nombre de materia"
                    value={nuevaMateria.nombre}
                    onChange={(e) =>
                      setNuevaMateria({ nombre: e.target.value })
                    }
                  />
                  <button
                    className="personal-action"
                    onClick={crearMateriaPersonal}
                    disabled={guardandoGestion}
                  >
                    Crear materia
                  </button>
                </div>

                <div className="personal-grid personal-grid-3">
                  <select
                    className="personal-input"
                    value={nuevaAsignacion.id_curso}
                    onChange={(e) =>
                      setNuevaAsignacion((p) => ({
                        ...p,
                        id_curso: e.target.value,
                      }))
                    }
                  >
                    <option value="">Seleccione curso</option>
                    {cursos.map((c) => (
                      <option key={c.id_curso} value={c.id_curso}>
                        {c.nombre} ({c.anio_lectivo})
                      </option>
                    ))}
                  </select>
                  <select
                    className="personal-input"
                    value={nuevaAsignacion.id_materia}
                    onChange={(e) =>
                      setNuevaAsignacion((p) => ({
                        ...p,
                        id_materia: e.target.value,
                      }))
                    }
                  >
                    <option value="">Seleccione materia</option>
                    {materiasDisponibles.map((m) => (
                      <option key={m.id_materia} value={m.id_materia}>
                        {m.nombre}
                      </option>
                    ))}
                  </select>
                  <button
                    className="personal-action"
                    onClick={crearAsignacionPersonal}
                    disabled={guardandoGestion}
                  >
                    Asignar
                  </button>
                </div>
              </div>
            )}

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
          </>
        )}
      </div>
    </div>
  );
}

export default Docente;
