import React from "react";

export const TabPeriodizacion = ({
  activeTab,
  errorPeriodos,
  periodos,
}) => {
  if (activeTab !== "periodizacion") return null;

  return (
    <div className="panel-card tab-pane active">
      <div className="panel-header">
        <div>
          <h3>Periodizacion</h3>
          <p className="panel-sub">
            Consulta los periodos configurados para este ano lectivo
          </p>
        </div>
      </div>

      {errorPeriodos && (
        <p style={{ color: "red", marginBottom: "15px" }}>{errorPeriodos}</p>
      )}

      {periodos.length > 0 ? (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Periodo</th>
                <th>Periodo</th>
                <th>Periodo</th>
              </tr>
            </thead>
            <tbody>
              {periodos.map((periodo) => (
                <tr key={periodo.id_periodo || periodo.numero_periodo}>
                  <td>{periodo.nombre_periodo || `Periodo ${periodo.numero_periodo}`}</td>
                  <td>{periodo.fecha_inicio || "-"}</td>
                  <td>{periodo.fecha_fin || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          className="empty-state"
          style={{ padding: "20px", textAlign: "center" }}
        >
          <p>No hay periodos configurados aun</p>
        </div>
      )}

      <div className="empty-state" style={{ marginTop: 16 }}>
        <p>
          La configuracion de la periodizacion se realiza desde la
          administracion general. Aqui solo puedes consultarla para usar
          correctamente insumos y promedios del curso.
        </p>
      </div>
    </div>
  );
};
