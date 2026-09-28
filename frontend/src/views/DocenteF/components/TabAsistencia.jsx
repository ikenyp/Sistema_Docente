import React from "react";
import { CalendarCheck, Save } from "lucide-react";
import { nombrePersona } from "../../../utils/personas";
import TabHelpButton from "../../../components/TabHelpButton";

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
  soloLecturaTutor,
  estadosTemporales,
  setEstadosTemporales,
  asistenciaExistentePorEstudiante,
  onGuardarUno,
  onEliminarUno,
  onGuardarTodo,
  guardandoAsistencia,
}) => {
  // La asistencia se edita por estudiante y fecha; repetir el guardado actualiza
  // el registro existente en lugar de crear duplicados.
  if (activeTab !== "asistencia") return null;

  return (
    <div className="panel-card tab-pane active">
      <div className="panel-header">
        <div>
          <h3><CalendarCheck size={18} /> Asistencia <TabHelpButton title="Asistencia" steps={[{ title: "Selecciona una fecha", description: "Elige el día que deseas registrar o consultar.", target: "asistencia-fecha" }, { title: "Marca el estado", description: "En el listado se indica si el estudiante estuvo presente, ausente o justificado.", target: "asistencia-tabla" }, { title: "Guarda los cambios", description: "Confirma el registro de asistencia del día.", target: "asistencia-guardar" }]} /></h3>
          <p className="panel-sub">{soloLecturaTutor ? "Consulta la asistencia registrada del curso en esta materia" : "Selecciona una fecha y registra la asistencia del curso en esta materia"}</p>
          <div className="header-inline-control attendance-date-control">
            <label className="control-label">Fecha:</label>
              <input
                data-help-target="asistencia-fecha"
              type="date"
              value={fechaAsistencia}
              onChange={(e) => setFechaAsistencia(e.target.value)}
            />
          </div>
        </div>
      </div>

          <div className="table-container" data-help-target="asistencia-tabla">
        <table className="attendance-table">
          <colgroup>
            <col className="attendance-col-student" />
            <col className="attendance-col-status" />
            {!soloLecturaTutor && <col className="attendance-col-action" />}
          </colgroup>
          <thead>
            <tr>
              <th>Estudiante</th>
              <th className="table-th-center">Asistencia del día</th>
              {!soloLecturaTutor && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {[...estudiantesCurso]
              .sort((a, b) => a.apellido.localeCompare(b.apellido, "es"))
              .map((estudiante) => {
                const actual = estadosTemporales[estudiante.id_estudiante] || "";

                return (
                  <tr key={estudiante.id_estudiante}>
                    <td>{nombrePersona(estudiante)}</td>
                    <td>
                      <div className="radio-group-horizontal">
                        {ESTADOS.map((estado) => (
                          <label key={estado.value} className="radio-option">
                            <input
                              type="radio"
                              name={`asis-${estudiante.id_estudiante}`}
                              value={estado.value}
                              checked={actual === estado.value}
                              disabled={soloLecturaTutor}
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
                    {!soloLecturaTutor && <td>
                      <button
                        className="btn-delete btn-delete-inline"
                        type="button"
                        onClick={() => onEliminarUno(estudiante.id_estudiante)}
                        aria-label="Limpiar asistencia"
                        disabled={guardandoAsistencia}
                      >
                        Limpiar
                      </button>
                    </td>}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <div className="tab-footer-actions attendance-footer-actions">
          <button data-help-target="asistencia-guardar" className="btn-primary attendance-save-btn" type="button" onClick={onGuardarTodo} disabled={soloLecturaTutor || guardandoAsistencia}>
          <Save size={16} />
          <span>{soloLecturaTutor ? "Solo lectura" : guardandoAsistencia ? "Guardando..." : "Guardar asistencia"}</span>
        </button>
      </div>

    </div>
  );
};
