import React, { useState } from "react";
import { insumosAPI, notasAPI, estudiantesAPI } from "../../../services/api";
import { notify, requestConfirm } from "../../../components/notify";

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
      notify("error", "Debe completar nombre y ponderación");
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
        id_periodo: parseInt(nuevoInsumo.id_periodo, 10),
      };

      await insumosAPI.crear(data);
      setNuevoInsumo({
        nombre: "",
        descripcion: "",
        ponderacion: "",
        tipo_insumo: "actividad",
        id_periodo: "",
      });
      await cargarInsumos(materiaSeleccionada.id_cmd);
    } catch (err) {
      notify("error", "Error al crear insumo: " + err.message);
    } finally {
      setCargandoInsumoProceso(false);
    }
  };

  const eliminarInsumo = async (id_insumo) => {
    const ok = await requestConfirm("¿Está seguro de eliminar este insumo?");
    if (!ok) return;

    try {
      await insumosAPI.eliminar(id_insumo);
      await cargarInsumos(materiaSeleccionada.id_cmd);
    } catch (err) {
      notify("error", "Error al eliminar insumo: " + err.message);
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
      notify("error", "Error al cargar notas: " + err.message);
    }
  };

  const guardarNota = async (id_estudiante, calificacion) => {
    if (
      calificacion === "" ||
      calificacion === null ||
      calificacion === undefined
    ) {
      notify("error", "Por favor ingrese una calificación");
      return;
    }

    const notaNum = parseFloat(calificacion);
    if (isNaN(notaNum) || notaNum < 0 || notaNum > 10) {
      notify("error", "La calificación debe ser un número entre 0 y 10");
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
      notify("success", "Nota guardada correctamente");
    } catch (err) {
      console.error("Error al guardar nota:", err);
      notify("error", "Error al guardar nota: " + (err.message || err));
    }
  };

  const eliminarNota = async (id_estudiante) => {
    const nota = notasEstudiantes[id_estudiante];
    if (!nota) return;

    const ok = await requestConfirm("¿Eliminar esta nota?");
    if (!ok) return;

    try {
      await notasAPI.eliminar(nota.id_nota);
      await abrirInsumosNotas(insumosSeleccionado);
    } catch (err) {
      notify("error", "Error al eliminar nota: " + err.message);
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
            <option value="proyecto_periodo">Proyecto del periodo</option>
            <option value="examen_periodo">Examen del periodo</option>
          </select>
          <select
            value={nuevoInsumo.id_periodo}
            onChange={(e) =>
              setNuevoInsumo({
                ...nuevoInsumo,
                id_periodo: e.target.value,
              })
            }
          >
            <option value="">Seleccione periodo</option>
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
            [1, 2, 3].map((periodo) => {
              const insumosPeriodo = insumosMateria.filter(
                (i) => i.id_periodo === periodo,
              );
              return (
                <div key={periodo} className="periodo-section">
                  <h4 className="periodo-title">📅 Periodo {periodo}</h4>
                  {insumosPeriodo.length === 0 ? (
                    <p className="no-insumos-periodo">Sin actividades</p>
                  ) : (
                    <div className="periodo-insumos">
                      {insumosPeriodo.map((insumo) => (
                        <div key={insumo.id_insumo} className="insumo-card">
                          <div className="insumo-info">
                            <h4>{insumo.nombre}</h4>
                            <p>{insumo.descripcion}</p>
                            <div className="insumo-meta">
                              <small>Ponderación: {insumo.ponderacion}</small>
                              <small className="tipo-insumo">
                                {insumo.tipo_insumo === "proyecto_periodo"
                                  ? "📁 Proyecto"
                                  : insumo.tipo_insumo === "examen_periodo"
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
                                `nota-${estudiante.id_estudiante}`,
                              );
                              guardarNota(
                                estudiante.id_estudiante,
                                input.value,
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
