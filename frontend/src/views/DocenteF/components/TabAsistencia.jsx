import React from "react";
import { Trash2, Save } from "lucide-react";

const ESTADOS = [
  { value: "presente", label: "Presente" },
  { value: "ausente", label: "Ausente" },
  { value: "justificado", label: "Justificado" },
];

export const TabAsistencia = ({
  activeTab,
  estudiantesCurso,
  fechaAsistencia,
  setFechaAsistencia,
  estadosTemporales,
  setEstadosTemporales,
  asistenciaExistentePorEstudiante,
  onGuardarUno,
  onEliminarUno,
  onGuardarTodo,
}) => {
  if (activeTab !== "asistencia") return null;

  return (
    <div className="panel-card tab-pane active">
      <div className="panel-header">
        <div>
          <h3>🗓️ Asistencia</h3>
          <p className="panel-sub">Selecciona una fecha y registra la asistencia del día</p>
          <div className="header-inline-control attendance-date-control">
            <label className="control-label">Fecha:</label>
            <input
              type="date"
              value={fechaAsistencia}
              onChange={(e) => setFechaAsistencia(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="table-container">
        <table className="attendance-table">
          <colgroup>
            <col className="attendance-col-student" />
            <col className="attendance-col-status" />
            <col className="attendance-col-action" />
          </colgroup>
          <thead>
            <tr>
              <th>Estudiante</th>
              <th className="table-th-center">Asistencia del día</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {[...estudiantesCurso]
              .sort((a, b) => a.apellido.localeCompare(b.apellido, "es"))
              .map((estudiante) => {
                const actual = estadosTemporales[estudiante.id_estudiante] || "";

                return (
                  <tr key={estudiante.id_estudiante}>
                    <td>{estudiante.apellido} {estudiante.nombre}</td>
                    <td>
                      <div className="radio-group-horizontal">
                        {ESTADOS.map((estado) => (
                          <label key={estado.value} className="radio-option">
                            <input
                              type="radio"
                              name={`asis-${estudiante.id_estudiante}`}
                              value={estado.value}
                              checked={actual === estado.value}
                              onChange={() =>
                                setEstadosTemporales((prev) => ({
                                  ...prev,
                                  [estudiante.id_estudiante]: estado.value,
                                }))
                              }
                            />
                            <span>{estado.label}</span>
                          </label>
                        ))}
                      </div>
                    </td>
                    <td>
                      <button
                        className="btn-delete btn-delete-inline"
                        type="button"
                        onClick={() => onEliminarUno(estudiante.id_estudiante)}
                        aria-label="Limpiar asistencia"
                      >
                        <Trash2 size={16} />
                        <span>Limpiar</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <div className="tab-footer-actions attendance-footer-actions">
        <button className="btn-primary attendance-save-btn" type="button" onClick={onGuardarTodo}>
          <Save size={16} />
          <span>Guardar asistencia</span>
        </button>
      </div>

    </div>
  );
};
