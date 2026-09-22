import React from "react";
import { CalendarDays, Info } from "lucide-react";

export const TabPeriodizacion = ({
  activeTab,
  errorPeriodos,
  periodos,
  esModoPersonal,
}) => {
  if (activeTab !== "periodizacion") return null;

  return (
    <div className="panel-card tab-pane active">
      <div className="panel-header">
        <div>
          <h3><CalendarDays size={18} /> Periodizacion</h3>
          <p className="panel-sub">
            Consulta los periodos configurados para este ano lectivo
          </p>
        </div>
      </div>

      {errorPeriodos && (
        <p className="periodizacion-error">{errorPeriodos}</p>
      )}

      {periodos.length > 0 ? (
        <div className="table-container periodizacion-course-table-wrap">
          <table className="periodizacion-course-table">
            <thead>
              <tr>
                <th>Periodo</th>
                <th>Fecha de inicio</th>
                <th>Fecha de fin</th>
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
        <div className="empty-state periodizacion-empty-state">
          <CalendarDays size={28} />
          <p>No hay periodos configurados aún para este año lectivo.</p>
        </div>
      )}

      {!esModoPersonal && (
        <div className="periodizacion-admin-note">
          <Info size={18} />
          <p>
            La periodización la configura la administración general. Aquí puedes
            consultarla para registrar insumos y calcular promedios correctamente.
          </p>
        </div>
      )}
    </div>
  );
};
