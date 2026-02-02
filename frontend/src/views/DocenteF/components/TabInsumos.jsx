import React, { useState } from "react";
import { insumosAPI, notasAPI, estudiantesAPI } from "../../../services/api";

export const TabInsumos = ({
  activeTab,
  materiaSeleccionada,
  insumosMateria,
  estudiantesCurso,
  id_curso,
  cargandoInsumo,
  nuevoInsumo,
  setNuevoInsumo,
  insumosSeleccionado,
  setInsumosSeleccionado,
  estudiantesInsumo,
  setEstudiantesInsumo,
  notasEstudiantes,
  setNotasEstudiantes,
  cargarInsumos,
}) => {
  const [cargandoInsumoProceso, setCargandoInsumoProceso] = useState(false);

  const agregarInsumo = async () => {
    if (!nuevoInsumo.nombre.trim() || !nuevoInsumo.ponderacion) {
      alert("Debe completar nombre y ponderación");
      return;
    }

    try {
      setCargandoInsumoProceso(true);
      const data = {
        id_cmd: materiaSeleccionada.id_cmd,
        nombre: nuevoInsumo.nombre,
        descripcion: nuevoInsumo.descripcion || null,
        ponderacion: parseFloat(nuevoInsumo.ponderacion),
        tipo_insumo: nuevoInsumo.tipo_insumo,
        id_trimestre: parseInt(nuevoInsumo.id_trimestre),
      };

      await insumosAPI.crear(data);
      setNuevoInsumo({
        nombre: "",
        descripcion: "",
        ponderacion: "",
        tipo_insumo: "actividad",
        id_trimestre: "1",
      });
      await cargarInsumos(materiaSeleccionada.id_cmd);
    } catch (err) {
      alert("Error al crear insumo: " + err.message);
    } finally {
      setCargandoInsumoProceso(false);
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

  const abrirInsumosNotas = async (insumo) => {
    try {
      setInsumosSeleccionado(insumo);

      const estudiantes =
        estudiantesCurso.length > 0
          ? estudiantesCurso
          : await estudiantesAPI.obtenerPorCurso(id_curso);
      setEstudiantesInsumo(estudiantes || []);

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
    if (
      calificacion === "" ||
      calificacion === null ||
      calificacion === undefined
    ) {
      alert("Por favor ingrese una calificación");
      return;
    }

    const notaNum = parseFloat(calificacion);
    if (isNaN(notaNum) || notaNum < 0 || notaNum > 10) {
      alert("La calificación debe ser un número entre 0 y 10");
      return;
    }

    try {
      const nota = notasEstudiantes[id_estudiante];

      if (nota) {
        await notasAPI.actualizar(nota.id_nota, {
          calificacion: notaNum,
        });
      } else {
        await notasAPI.crear({
          id_insumo: insumosSeleccionado.id_insumo,
          id_estudiante: id_estudiante,
          calificacion: notaNum,
        });
      }

      await abrirInsumosNotas(insumosSeleccionado);
      alert("Nota guardada correctamente");
    } catch (err) {
      console.error("Error al guardar nota:", err);
      alert("Error al guardar nota: " + (err.message || err));
    }
  };

  const eliminarNota = async (id_estudiante) => {
    const nota = notasEstudiantes[id_estudiante];
    if (!nota) return;

    if (!window.confirm("¿Eliminar esta nota?")) return;

    try {
      await notasAPI.eliminar(nota.id_nota);
      await abrirInsumosNotas(insumosSeleccionado);
    } catch (err) {
      alert("Error al eliminar nota: " + err.message);
    }
  };

  return (
    <>
      <div
        className={`panel-card tab-pane ${
          activeTab === "insumos" ? "active" : ""
        }`}
      >
        <div className="panel-header">
          <h3>📋 Insumos</h3>
        </div>

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
          <select
            value={nuevoInsumo.tipo_insumo}
            onChange={(e) =>
              setNuevoInsumo({
                ...nuevoInsumo,
                tipo_insumo: e.target.value,
              })
            }
          >
            <option value="actividad">Actividad</option>
            <option value="proyecto_trimestral">Proyecto trimestral</option>
            <option value="examen_trimestral">Examen trimestral</option>
          </select>
          <select
            value={nuevoInsumo.id_trimestre}
            onChange={(e) =>
              setNuevoInsumo({
                ...nuevoInsumo,
                id_trimestre: e.target.value,
              })
            }
          >
            <option value="1">Trimestre 1</option>
            <option value="2">Trimestre 2</option>
            <option value="3">Trimestre 3</option>
          </select>
          <button
            onClick={agregarInsumo}
            disabled={cargandoInsumoProceso}
            className="btn-add-insumo"
          >
            {cargandoInsumoProceso ? "Agregando..." : "Agregar Insumo"}
          </button>
        </div>

        <div className="insumos-list">
          {insumosMateria.length === 0 ? (
            <p>No hay insumos creados</p>
          ) : (
            [1, 2, 3].map((trimestre) => {
              const insumosTrimestre = insumosMateria.filter(
                (i) => i.id_trimestre === trimestre
              );
              return (
                <div key={trimestre} className="trimestre-section">
                  <h4 className="trimestre-title">📅 Trimestre {trimestre}</h4>
                  {insumosTrimestre.length === 0 ? (
                    <p className="no-insumos-trimestre">Sin actividades</p>
                  ) : (
                    <div className="trimestre-insumos">
                      {insumosTrimestre.map((insumo) => (
                        <div key={insumo.id_insumo} className="insumo-card">
                          <div className="insumo-info">
                            <h4>{insumo.nombre}</h4>
                            <p>{insumo.descripcion}</p>
                            <div className="insumo-meta">
                              <small>Ponderación: {insumo.ponderacion}</small>
                              <small className="tipo-insumo">
                                {insumo.tipo_insumo === "proyecto_trimestral"
                                  ? "📁 Proyecto"
                                  : insumo.tipo_insumo === "examen_trimestral"
                                  ? "📝 Examen"
                                  : "📌 Actividad"}
                              </small>
                            </div>
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
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* MODAL DE NOTAS POR INSUMO */}
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
                    <th style={{ width: "50%" }}>Estudiante</th>
                    <th style={{ width: "20%" }}>Nota</th>
                    <th style={{ width: "30%" }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {estudiantesInsumo
                    .sort((a, b) => a.apellido.localeCompare(b.apellido))
                    .map((estudiante) => (
                      <tr key={estudiante.id_estudiante}>
                        <td>
                          {estudiante.apellido} {estudiante.nombre}
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
                        <td style={{ whiteSpace: "nowrap" }}>
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
                            💾Guardar
                          </button>
                          {notasEstudiantes[estudiante.id_estudiante] && (
                            <button
                              className="btn-guardar-nota btn-danger"
                              onClick={() =>
                                eliminarNota(estudiante.id_estudiante)
                              }
                              style={{
                                marginLeft: "5px",
                                backgroundColor: "#dc3545",
                              }}
                            >
                              🗑️ Eliminar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
