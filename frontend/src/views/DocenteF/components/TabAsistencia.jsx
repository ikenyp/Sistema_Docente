import React from "react";
import { asistenciaAPI } from "../../../services/api";

const ESTADOS_ASISTENCIA = [
  { value: "presente", label: "Presente" },
  { value: "ausente", label: "Ausente" },
  { value: "justificado", label: "Justificado" },
  { value: "atraso", label: "Atraso" },
];

export const TabAsistencia = ({
  activeTab,
  estudiantesCurso,
  asistencias,
  cargandoAsistencia,
  fechaAsistencia,
  setFechaAsistencia,
  estadosTemporales,
  setEstadosTemporales,
  id_cmd,
  cargarAsistencia,
}) => {
  const obtenerAsistenciaEstudiante = (id_estudiante) => {
    return asistencias.find(
      (a) => a.id_estudiante === id_estudiante && a.fecha === fechaAsistencia
    );
  };

  const cambiarEstadoTemporal = (id_estudiante, nuevoEstado) => {
    setEstadosTemporales((prev) => ({
      ...prev,
      [id_estudiante]: nuevoEstado,
    }));
  };

  const guardarAsistenciaEstudiante = async (id_estudiante) => {
    const estadoNuevo = estadosTemporales[id_estudiante];
    if (!estadoNuevo) {
      alert("Seleccione un estado");
      return;
    }

    const asistenciaExistente = obtenerAsistenciaEstudiante(id_estudiante);
    if (asistenciaExistente && asistenciaExistente.estado === estadoNuevo) {
      alert("Seleccione un estado diferente");
      return;
    }

    try {
      const payload = {
        id_estudiante: parseInt(id_estudiante, 10),
        id_cmd: parseInt(id_cmd, 10),
        fecha: fechaAsistencia,
        estado: estadoNuevo,
      };

      if (asistenciaExistente) {
        await asistenciaAPI.actualizar(
          asistenciaExistente.id_asistencia,
          payload
        );
      } else {
        await asistenciaAPI.crear(payload);
      }

      await cargarAsistencia(id_cmd);
      setEstadosTemporales((prev) => {
        const nuevo = { ...prev };
        delete nuevo[id_estudiante];
        return nuevo;
      });
    } catch (err) {
      alert("No se pudo guardar: " + err.message);
    }
  };

  const eliminarAsistenciaEstudiante = async (id_estudiante) => {
    if (!window.confirm("¿Eliminar asistencia?")) return;

    const asistenciaExistente = obtenerAsistenciaEstudiante(id_estudiante);
    if (!asistenciaExistente) return;

    try {
      await asistenciaAPI.eliminar(asistenciaExistente.id_asistencia);
      await cargarAsistencia(id_cmd);
      setEstadosTemporales((prev) => {
        const nuevo = { ...prev };
        delete nuevo[id_estudiante];
        return nuevo;
      });
    } catch (err) {
      alert("Error al eliminar: " + err.message);
    }
  };

  return (
    <div
      className={`panel-card tab-pane ${
        activeTab === "asistencia" ? "active" : ""
      }`}
    >
      <div className="panel-header">
        <div>
          <h3>🗓️ Asistencia</h3>
          <p className="panel-sub">
            Seleccione una fecha y registre la asistencia
          </p>
        </div>
        <div
          style={{
            display: "flex",
            gap: "10px",
            alignItems: "center",
          }}
        >
          <label style={{ fontWeight: "600", color: "#555" }}>Fecha:</label>
          <input
            type="date"
            value={fechaAsistencia}
            onChange={(e) => setFechaAsistencia(e.target.value)}
            style={{
              padding: "8px 12px",
              border: "1px solid #ddd",
              borderRadius: "6px",
              fontSize: "14px",
            }}
          />
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Estudiante</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {estudiantesCurso
              .sort((a, b) => a.apellido.localeCompare(b.apellido))
              .map((estudiante) => {
                const asistenciaExistente = obtenerAsistenciaEstudiante(
                  estudiante.id_estudiante
                );
                const estadoActual =
                  estadosTemporales[estudiante.id_estudiante] ||
                  asistenciaExistente?.estado ||
                  "";

                return (
                  <tr key={estudiante.id_estudiante}>
                    <td>
                      {estudiante.apellido} {estudiante.nombre}
                    </td>
                    <td>
                      <select
                        value={estadoActual}
                        onChange={(e) =>
                          cambiarEstadoTemporal(
                            estudiante.id_estudiante,
                            e.target.value
                          )
                        }
                        style={{
                          padding: "6px 10px",
                          borderRadius: "6px",
                          border: "1px solid #ddd",
                          fontSize: "14px",
                          backgroundColor: estadoActual ? "#f0f4ff" : "white",
                          fontWeight: estadoActual ? "600" : "normal",
                        }}
                      >
                        <option value="">Sin registro</option>
                        {ESTADOS_ASISTENCIA.map((estado) => (
                          <option key={estado.value} value={estado.value}>
                            {estado.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="actions-cell">
                      <button
                        className="btn-notas"
                        onClick={() =>
                          guardarAsistenciaEstudiante(estudiante.id_estudiante)
                        }
                        disabled={cargandoAsistencia || !estadoActual}
                        style={{
                          padding: "6px 12px",
                          fontSize: "12px",
                          opacity: !estadoActual ? 0.5 : 1,
                        }}
                      >
                        Guardar
                      </button>
                      {asistenciaExistente && (
                        <button
                          className="btn-eliminar"
                          onClick={() =>
                            eliminarAsistenciaEstudiante(
                              estudiante.id_estudiante
                            )
                          }
                          disabled={cargandoAsistencia}
                          style={{
                            padding: "6px 12px",
                            fontSize: "12px",
                          }}
                        >
                          Eliminar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            {estudiantesCurso.length === 0 && (
              <tr>
                <td colSpan={3} style={{ textAlign: "center" }}>
                  No hay estudiantes en este curso
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
