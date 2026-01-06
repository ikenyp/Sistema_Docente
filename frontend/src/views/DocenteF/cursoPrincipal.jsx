import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  cmdAPI,
  insumosAPI,
  estudiantesAPI,
  notasAPI,
} from "../../services/api";
import "../../styles/cursoPrincipal.css";

function CursoPrincipal() {
  const navigate = useNavigate();
  const { id_curso } = useParams();
  const location = useLocation();
  const { curso } = location.state || { curso: null };

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [datosUsuario, setDatosUsuario] = useState(null);

  // Datos del curso
  const [materiasCurso, setMateriasCurso] = useState([]);
  const [materiaSeleccionada, setMateriaSeleccionada] = useState(null);
  const [insumosMateria, setInsumosMateria] = useState([]);

  // Edición de insumos
  const [nuevoInsumo, setNuevoInsumo] = useState({
    nombre: "",
    descripcion: "",
    ponderacion: "",
  });
  const [cargandoInsumo, setCargandoInsumo] = useState(false);

  // Vista de notas
  const [insumosSeleccionado, setInsumosSeleccionado] = useState(null);
  const [estudiantesInsumo, setEstudiantesInsumo] = useState([]);
  const [notasEstudiantes, setNotasEstudiantes] = useState({});
  const [menuUsuario, setMenuUsuario] = useState(false);

  // ====================== CARGAR DATOS ======================
  const cargarDatos = useCallback(async () => {
    try {
      setCargando(true);
      setError(null);

      // Obtener datos del usuario
      const usuarioJSON = localStorage.getItem("usuario");
      if (!usuarioJSON) {
        setError("No hay usuario autenticado");
        navigate("/");
        return;
      }

      const usuario = JSON.parse(usuarioJSON);
      setDatosUsuario(usuario);

      // Obtener materias asignadas al docente en este curso
      const cmd = await cmdAPI.listarPorDocente(id_curso, usuario.id_usuario);
      setMateriasCurso(cmd);

      if (cmd.length > 0) {
        setMateriaSeleccionada(cmd[0]);
        await cargarInsumos(cmd[0].id_cmd);
      }
    } catch (err) {
      console.error("Error al cargar datos:", err);
      setError(err.message || "Error al cargar los datos");
    } finally {
      setCargando(false);
    }
  }, [id_curso, navigate]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // ====================== INSUMOS ======================
  const cargarInsumos = async (id_cmd) => {
    try {
      const insumos = await insumosAPI.listarPorCMD(id_cmd);
      setInsumosMateria(insumos);
    } catch (err) {
      console.error("Error al cargar insumos:", err);
    }
  };

  const agregarInsumo = async () => {
    if (!nuevoInsumo.nombre.trim() || !nuevoInsumo.ponderacion) {
      alert("Debe completar nombre y ponderación");
      return;
    }

    try {
      setCargandoInsumo(true);
      const data = {
        id_cmd: materiaSeleccionada.id_cmd,
        nombre: nuevoInsumo.nombre,
        descripcion: nuevoInsumo.descripcion || null,
        ponderacion: parseFloat(nuevoInsumo.ponderacion),
      };

      await insumosAPI.crear(data);
      setNuevoInsumo({ nombre: "", descripcion: "", ponderacion: "" });
      await cargarInsumos(materiaSeleccionada.id_cmd);
    } catch (err) {
      alert("Error al crear insumo: " + err.message);
    } finally {
      setCargandoInsumo(false);
    }
  };

  const eliminarInsumo = async (id_insumo) => {
    if (!window.confirm("¿Está seguro de eliminar este insumo?")) return;

    try {
      await insumosAPI.eliminar(id_insumo);
      await cargarInsumos(materiaSeleccionada.id_cmd);
    } catch (err) {
      alert("Error al eliminar insumo: " + err.message);
    }
  };

  // ====================== NOTAS ======================
  const abrirInsumosNotas = async (insumo) => {
    try {
      setInsumosSeleccionado(insumo);

      // Obtener estudiantes del curso
      const estudiantes = await estudiantesAPI.obtenerPorCurso(id_curso);
      setEstudiantesInsumo(estudiantes);

      // Obtener notas existentes
      const notas = await notasAPI.listarPorInsumo(insumo.id_insumo);
      const notasMap = {};
      notas.forEach((nota) => {
        notasMap[nota.id_estudiante] = nota;
      });
      setNotasEstudiantes(notasMap);
    } catch (err) {
      alert("Error al cargar notas: " + err.message);
    }
  };

  const guardarNota = async (id_estudiante, calificacion) => {
    if (!calificacion) return;

    try {
      const nota = notasEstudiantes[id_estudiante];

      if (nota) {
        // Actualizar nota existente
        await notasAPI.actualizar(nota.id_nota, {
          calificacion: parseFloat(calificacion),
        });
      } else {
        // Crear nueva nota
        await notasAPI.crear({
          id_insumo: insumosSeleccionado.id_insumo,
          id_estudiante: id_estudiante,
          calificacion: parseFloat(calificacion),
        });
      }

      // Recargar notas
      await abrirInsumosNotas(insumosSeleccionado);
    } catch (err) {
      alert("Error al guardar nota: " + err.message);
    }
  };

  const cerrarSesion = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    navigate("/");
  };

  // ====================== RENDER ======================
  if (cargando) return <p>Cargando...</p>;
  if (error) return <p style={{ color: "red" }}>Error: {error}</p>;

  return (
    <div className="curso-principal-page">
      {/* ====================== NAVBAR ====================== */}
      <div className="navbar-curso">
        <button className="btn-volver" onClick={() => navigate(-1)}>
          ← Volver
        </button>

        <h2 className="titulo-curso">{curso?.nombre}</h2>

        <div
          className="navbar-user"
          onClick={() => setMenuUsuario(!menuUsuario)}
        >
          {datosUsuario
            ? `${datosUsuario.nombre} ${datosUsuario.apellido}`
            : "Usuario"}
        </div>

        {menuUsuario && (
          <div className="menu-usuario">
            <button onClick={cerrarSesion}>Cerrar Sesión</button>
          </div>
        )}
      </div>

      {/* ====================== CONTENIDO PRINCIPAL ====================== */}
      <div className="curso-container">
        {materiasCurso.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📚</div>
            <h2>No hay materias asignadas</h2>
            <p>
              Aún no hay materias asignadas a este curso. Las materias
              aparecerán aquí una vez sean añadidas.
            </p>
          </div>
        ) : (
          <>
            {/* SELECTOR DE MATERIA */}
            <div className="materia-selector">
              <label>Selecciona Materia:</label>
              <select
                value={materiaSeleccionada?.id_cmd || ""}
                onChange={(e) => {
                  const selected = materiasCurso.find(
                    (m) => m.id_cmd === parseInt(e.target.value)
                  );
                  setMateriaSeleccionada(selected);
                  cargarInsumos(selected.id_cmd);
                }}
              >
                {materiasCurso.map((materia) => (
                  <option key={materia.id_cmd} value={materia.id_cmd}>
                    Materia ID: {materia.id_materia}
                  </option>
                ))}
              </select>
            </div>

            {/* SECCIÓN DE INSUMOS */}
            {materiaSeleccionada && (
              <div className="insumos-section">
                <h3>📋 Insumos</h3>

                {/* AGREGAR INSUMO */}
                <div className="agregar-insumo">
                  <input
                    type="text"
                    placeholder="Nombre del insumo"
                    value={nuevoInsumo.nombre}
                    onChange={(e) =>
                      setNuevoInsumo({ ...nuevoInsumo, nombre: e.target.value })
                    }
                  />
                  <input
                    type="text"
                    placeholder="Descripción"
                    value={nuevoInsumo.descripcion}
                    onChange={(e) =>
                      setNuevoInsumo({
                        ...nuevoInsumo,
                        descripcion: e.target.value,
                      })
                    }
                  />
                  <input
                    type="number"
                    placeholder="Ponderación (0-10)"
                    min="0"
                    max="10"
                    step="0.1"
                    value={nuevoInsumo.ponderacion}
                    onChange={(e) =>
                      setNuevoInsumo({
                        ...nuevoInsumo,
                        ponderacion: e.target.value,
                      })
                    }
                  />
                  <button
                    onClick={agregarInsumo}
                    disabled={cargandoInsumo}
                    className="btn-add-insumo"
                  >
                    {cargandoInsumo ? "Agregando..." : "Agregar Insumo"}
                  </button>
                </div>

                {/* LISTA DE INSUMOS */}
                <div className="insumos-list">
                  {insumosMateria.length === 0 ? (
                    <p>No hay insumos creados</p>
                  ) : (
                    insumosMateria.map((insumo) => (
                      <div key={insumo.id_insumo} className="insumo-card">
                        <div className="insumo-info">
                          <h4>{insumo.nombre}</h4>
                          <p>{insumo.descripcion}</p>
                          <small>Ponderación: {insumo.ponderacion}</small>
                        </div>
                        <div className="insumo-actions">
                          <button
                            className="btn-notas"
                            onClick={() => abrirInsumosNotas(insumo)}
                          >
                            Notas
                          </button>
                          <button
                            className="btn-eliminar"
                            onClick={() => eliminarInsumo(insumo.id_insumo)}
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* MODAL DE NOTAS */}
        {insumosSeleccionado && (
          <div className="modal-overlay">
            <div className="modal-notas">
              <div className="modal-header">
                <h3>Agregar Notas - {insumosSeleccionado.nombre}</h3>
                <button
                  className="btn-cerrar"
                  onClick={() => setInsumosSeleccionado(null)}
                >
                  ✕
                </button>
              </div>

              <div className="tabla-notas">
                <table>
                  <thead>
                    <tr>
                      <th>Estudiante</th>
                      <th>Nota</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estudiantesInsumo.map((estudiante) => (
                      <tr key={estudiante.id_estudiante}>
                        <td>
                          {estudiante.nombre} {estudiante.apellido}
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            max="10"
                            step="0.1"
                            defaultValue={
                              notasEstudiantes[estudiante.id_estudiante]
                                ?.calificacion || ""
                            }
                            placeholder="--"
                            className="input-nota"
                            id={`nota-${estudiante.id_estudiante}`}
                          />
                        </td>
                        <td>
                          <button
                            className="btn-guardar-nota"
                            onClick={() => {
                              const input = document.getElementById(
                                `nota-${estudiante.id_estudiante}`
                              );
                              guardarNota(
                                estudiante.id_estudiante,
                                input.value
                              );
                            }}
                          >
                            Guardar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CursoPrincipal;
