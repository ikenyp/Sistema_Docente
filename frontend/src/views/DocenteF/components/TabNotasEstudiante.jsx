import React from "react";

export const TabNotasEstudiante = ({
  activeTab,
  estudiantesCurso,
  estudianteSeleccionado,
  setEstudianteSeleccionado,
  notasIndividuales,
  cargandoNotasIndividual,
  onGuardarNota,
}) => {
  return (
    <div
      className={`panel-card tab-pane ${
        activeTab === "notasEstudiante" ? "active" : ""
      }`}
    >
      <div className="panel-header">
        <div>
          <h3>📑 Notas por estudiante</h3>
          <p className="panel-sub">Gestiona notas por cada insumo</p>
        </div>
      </div>

      <div className="form-grid">
        <select
          value={estudianteSeleccionado}
          onChange={(e) => setEstudianteSeleccionado(e.target.value)}
        >
          <option value="">Seleccione estudiante</option>
          {estudiantesCurso.map((est) => (
            <option key={est.id_estudiante} value={est.id_estudiante}>
              {est.nombre} {est.apellido}
            </option>
          ))}
        </select>
      </div>

      {cargandoNotasIndividual && <p>Cargando notas...</p>}

      {!cargandoNotasIndividual && estudianteSeleccionado && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Insumo</th>
                <th>Ponderación</th>
                <th>Nota</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {notasIndividuales.map((registro) => (
                <tr key={registro.insumo.id_insumo}>
                  <td>{registro.insumo.nombre}</td>
                  <td>{registro.insumo.ponderacion}</td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      defaultValue={registro.valor}
                      className="input-nota"
                      id={`nota-ind-${registro.insumo.id_insumo}`}
                    />
                  </td>
                  <td>
                    <button
                      className="btn-guardar-nota"
                      onClick={() => {
                        const input = document.getElementById(
                          `nota-ind-${registro.insumo.id_insumo}`
                        );
                        onGuardarNota(registro, input.value);
                      }}
                    >
                      Guardar
                    </button>
                  </td>
                </tr>
              ))}
              {notasIndividuales.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center" }}>
                    No hay insumos configurados para esta materia
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
