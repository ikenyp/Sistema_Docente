import React from "react";
import { Trash2, Save } from "lucide-react";
import CustomSelect from "../../../components/admin/CustomSelect";

const VALORES = ["A", "B", "C", "D"];
const PERIODOS = [
  { value: "1", label: "Trimestre 1" },
  { value: "2", label: "Trimestre 2" },
  { value: "3", label: "Trimestre 3" },
];

export const TabComportamiento = ({
  activeTab,
  estudiantesCurso,
  mesComportamiento,
  setMesComportamiento,
  valoresTemporales,
  setValoresTemporales,
  observacionesTemporales,
  setObservacionesTemporales,
  comportamientoExistentePorEstudiante,
  onGuardarUno,
  onEliminarUno,
  onGuardarTodo,
}) => {
  if (activeTab !== "comportamiento") return null;

  return (
    <div className="panel-card tab-pane active">
      <div className="panel-header">
        <div>
          <h3>🧭 Comportamiento</h3>
          <p className="panel-sub">Selecciona un periodo y registra valoraciones A-D</p>
        </div>
        <div className="periodo-selector-comportamiento">
          <label className="control-label">Periodo:</label>
          <CustomSelect
            value={mesComportamiento}
            onChange={setMesComportamiento}
            options={PERIODOS}
            placeholder="Selecciona trimestre"
            className="custom-select-white comportamiento-select"
          />
        </div>
      </div>

      <div className="table-container">
        <table className="behavior-table">
          <colgroup>
            <col className="behavior-col-student" />
            <col className="behavior-col-value" />
            <col className="behavior-col-observation" />
            <col className="behavior-col-action" />
          </colgroup>
          <thead>
            <tr>
              <th>Estudiante</th>
              <th className="table-th-center">Valor</th>
              <th>Observaciones</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {[...estudiantesCurso]
              .sort((a, b) => a.apellido.localeCompare(b.apellido, "es"))
              .map((estudiante) => {
                const valorActual = valoresTemporales[estudiante.id_estudiante] || "";
                const observacionActual = observacionesTemporales[estudiante.id_estudiante] || "";
                return (
                  <tr key={estudiante.id_estudiante}>
                    <td>{estudiante.apellido} {estudiante.nombre}</td>
                    <td>
                      <div className="radio-group-horizontal radio-group-behavior">
                        {VALORES.map((valor) => (
                          <label key={valor} className="radio-option">
                            <input
                              type="radio"
                              name={`comp-${estudiante.id_estudiante}`}
                              value={valor}
                              checked={valorActual === valor}
                              onChange={() =>
                                setValoresTemporales((prev) => ({
                                  ...prev,
                                  [estudiante.id_estudiante]: valor,
                                }))
                              }
                            />
                            <span>{valor}</span>
                          </label>
                        ))}
                      </div>
                    </td>
                    <td>
                      <input
                        type="text"
                        className="input-observacion-pequeno"
                        value={observacionActual}
                        onChange={(e) =>
                          setObservacionesTemporales((prev) => ({
                            ...prev,
                            [estudiante.id_estudiante]: e.target.value,
                          }))
                        }
                        placeholder="Observaciones..."
                      />
                    </td>
                    <td>
                      <div className="behavior-actions-row">
                        <button
                          className="btn-save btn-save-inline"
                          type="button"
                          onClick={() => onGuardarUno(estudiante.id_estudiante)}
                          aria-label="Guardar comportamiento"
                        >
                          <Save size={16} />
                          <span>Guardar</span>
                        </button>
                        <button
                          className="btn-delete btn-delete-inline"
                          type="button"
                          onClick={() => onEliminarUno(estudiante.id_estudiante)}
                          aria-label="Eliminar comportamiento"
                        >
                          <Trash2 size={16} />
                          <span>Eliminar</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <div className="tab-footer-actions">
        <button className="btn-primary btn-save-inline behavior-save-btn" type="button" onClick={onGuardarTodo}>
          <Save size={16} />
          <span>
            <span>Guardar</span>
            <span>comportamiento</span>
          </span>
        </button>
      </div>
    </div>
  );
};
