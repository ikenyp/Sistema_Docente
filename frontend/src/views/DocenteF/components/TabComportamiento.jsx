import React from "react";
import { comportamientoAPI } from "../../../services/api";

const VALORES_COMPORTAMIENTO = ["A", "B", "C", "D"];

export const TabComportamiento = ({
  activeTab,
  estudiantesCurso,
  comportamientos,
  cargandoComportamiento,
  mesComportamiento,
  setMesComportamiento,
  valoresTemporales,
  setValoresTemporales,
  observacionesTemporales,
  setObservacionesTemporales,
  id_curso,
  cargarComportamientos,
}) => {
  const obtenerComportamientoEstudiante = (id_estudiante) => {
    return comportamientos.find(
      (c) => c.id_estudiante === id_estudiante && c.mes === mesComportamiento
    );
  };

  const cambiarValorTemporal = (id_estudiante, nuevoValor) => {
    setValoresTemporales((prev) => ({
      ...prev,
      [id_estudiante]: nuevoValor,
    }));
  };

  const cambiarObservacionTemporal = (id_estudiante, nuevaObservacion) => {
    setObservacionesTemporales((prev) => ({
      ...prev,
      [id_estudiante]: nuevaObservacion,
    }));
  };

  const guardarComportamientoEstudiante = async (id_estudiante) => {
    const valorNuevo = valoresTemporales[id_estudiante];
    if (!valorNuevo) {
      alert("Seleccione una valoración");
      return;
    }

    const comportamientoExistente =
      obtenerComportamientoEstudiante(id_estudiante);
    if (
      comportamientoExistente &&
      comportamientoExistente.valor === valorNuevo
    ) {
      alert("Seleccione una valoración diferente");
      return;
    }

    try {
      const payload = {
        id_curso: parseInt(id_curso, 10),
        id_estudiante: parseInt(id_estudiante, 10),
        mes: mesComportamiento,
        valor: valorNuevo,
        observaciones: observacionesTemporales[id_estudiante] || "",
      };

      if (comportamientoExistente) {
        await comportamientoAPI.actualizar(
          comportamientoExistente.id_comportamiento,
          payload
        );
      } else {
        await comportamientoAPI.crear(payload);
      }

      await cargarComportamientos();
      setValoresTemporales((prev) => {
        const nuevo = { ...prev };
        delete nuevo[id_estudiante];
        return nuevo;
      });
      setObservacionesTemporales((prev) => {
        const nuevo = { ...prev };
        delete nuevo[id_estudiante];
        return nuevo;
      });
    } catch (err) {
      alert("No se pudo guardar: " + err.message);
    }
  };

  const eliminarComportamientoEstudiante = async (id_estudiante) => {
    if (!window.confirm("¿Eliminar registro de comportamiento?")) return;

    const comportamientoExistente =
      obtenerComportamientoEstudiante(id_estudiante);
    if (!comportamientoExistente) return;

    try {
      await comportamientoAPI.eliminar(
        comportamientoExistente.id_comportamiento
      );
      await cargarComportamientos();
      setValoresTemporales((prev) => {
        const nuevo = { ...prev };
        delete nuevo[id_estudiante];
        return nuevo;
      });
      setObservacionesTemporales((prev) => {
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
        activeTab === "comportamiento" ? "active" : ""
      }`}
    >
      <div className="panel-header">
        <div>
          <h3>🧭 Comportamiento</h3>
          <p className="panel-sub">Valoraciones mensuales (A-D)</p>
        </div>
        <div
          style={{
            display: "flex",
            gap: "10px",
            alignItems: "center",
          }}
        >
          <label style={{ fontWeight: "600", color: "#555" }}>Mes:</label>
          <input
            type="month"
            value={mesComportamiento}
            onChange={(e) => setMesComportamiento(e.target.value)}
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
              <th>Valoración</th>
              <th>Observaciones</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {estudiantesCurso
              .sort((a, b) => a.apellido.localeCompare(b.apellido))
              .map((estudiante) => {
                const comportamientoExistente = obtenerComportamientoEstudiante(
                  estudiante.id_estudiante
                );
                const valorActual =
                  valoresTemporales[estudiante.id_estudiante] ||
                  comportamientoExistente?.valor ||
                  "";
                const observacionActual =
                  observacionesTemporales[estudiante.id_estudiante] ??
                  comportamientoExistente?.observaciones ??
                  "";

                return (
                  <tr key={estudiante.id_estudiante}>
                    <td>
                      {estudiante.apellido} {estudiante.nombre}
                    </td>
                    <td>
                      <select
                        value={valorActual}
                        onChange={(e) =>
                          cambiarValorTemporal(
                            estudiante.id_estudiante,
                            e.target.value
                          )
                        }
                        style={{
                          padding: "6px 10px",
                          borderRadius: "6px",
                          border: "1px solid #ddd",
                          fontSize: "14px",
                          backgroundColor: valorActual ? "#f0f4ff" : "white",
                          fontWeight: valorActual ? "600" : "normal",
                        }}
                      >
                        <option value="">Sin valoración</option>
                        {VALORES_COMPORTAMIENTO.map((valor) => (
                          <option key={valor} value={valor}>
                            {valor}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        placeholder="Observaciones..."
                        value={observacionActual}
                        onChange={(e) =>
                          cambiarObservacionTemporal(
                            estudiante.id_estudiante,
                            e.target.value
                          )
                        }
                        style={{
                          width: "100%",
                          padding: "6px 10px",
                          borderRadius: "6px",
                          border: "1px solid #ddd",
                          fontSize: "13px",
                        }}
                      />
                    </td>
                    <td className="actions-cell">
                      <button
                        className="btn-notas"
                        onClick={() =>
                          guardarComportamientoEstudiante(
                            estudiante.id_estudiante
                          )
                        }
                        disabled={cargandoComportamiento || !valorActual}
                        style={{
                          padding: "6px 12px",
                          fontSize: "12px",
                          opacity: !valorActual ? 0.5 : 1,
                        }}
                      >
                        Guardar
                      </button>
                      {comportamientoExistente && (
                        <button
                          className="btn-eliminar"
                          onClick={() =>
                            eliminarComportamientoEstudiante(
                              estudiante.id_estudiante
                            )
                          }
                          disabled={cargandoComportamiento}
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
                <td colSpan={4} style={{ textAlign: "center" }}>
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
