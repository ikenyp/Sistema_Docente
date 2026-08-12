import React from "react";
import { promediosAPI } from "../../../services/api";
import { notify } from "../../../components/notify";

export const TabPromedios = ({
  activeTab,
  estudiantesCurso,
  estudiantePromedio,
  setEstudiantePromedio,
  periodoSeleccionado,
  setPeriodoSeleccionado,
  promedioPeriodo,
  setPromedioPeriodo,
  promedioAcumulado,
  setPromedioAcumulado,
  loadingPromedios,
  setLoadingPromedios,
  errorPromedios,
  setErrorPromedios,
  id_curso,
  cursoDetalle,
  periodos = [],
}) => {
  if (activeTab !== "promedios") return null;

  const consultarPromedioPeriodo = async () => {
    if (!estudiantePromedio) {
      notify("error", "Seleccione un estudiante");
      return;
    }
    try {
      setLoadingPromedios(true);
      setErrorPromedios(null);
      const data = await promediosAPI.obtenerPeriodo(
        parseInt(estudiantePromedio, 10),
        parseInt(id_curso, 10),
        parseInt(periodoSeleccionado, 10),
        cursoDetalle.anio_lectivo,
      );
      setPromedioPeriodo(data);
    } catch (err) {
      setErrorPromedios(
        err.message || "No se pudo calcular el promedio del periodo",
      );
    } finally {
      setLoadingPromedios(false);
    }
  };

  const consultarPromedioFinal = async () => {
    if (!estudiantePromedio || !cursoDetalle?.anio_lectivo) {
      notify(
        "error",
        "Seleccione estudiante y verifique que el curso tenga año lectivo",
      );
      return;
    }
    try {
      setLoadingPromedios(true);
      setErrorPromedios(null);
      const data = await promediosAPI.obtenerAcumulado(
        parseInt(estudiantePromedio, 10),
        parseInt(id_curso, 10),
        cursoDetalle.anio_lectivo,
      );
      setPromedioAcumulado(data);
    } catch (err) {
      setErrorPromedios(err.message || "No se pudo calcular el promedio acumulado");
    } finally {
      setLoadingPromedios(false);
    }
  };

  return (
    <div
      className={`panel-card tab-pane ${
        activeTab === "promedios" ? "active" : ""
      }`}
    >
      <div className="panel-header">
        <div>
          <h3>📈 Promedios</h3>
          <p className="panel-sub">Por periodo y acumulado</p>
        </div>
      </div>

      <div className="form-grid">
        <select
          value={estudiantePromedio}
          onChange={(e) => setEstudiantePromedio(e.target.value)}
        >
          <option value="">Seleccione estudiante</option>
          {estudiantesCurso.map((est) => (
            <option key={est.id_estudiante} value={est.id_estudiante}>
              {est.nombre} {est.apellido}
            </option>
          ))}
        </select>

        <select
          value={periodoSeleccionado}
          onChange={(e) => setPeriodoSeleccionado(e.target.value)}
          disabled={periodos.length === 0}
        >
          <option value="" disabled>
            {periodos.length === 0
              ? "No hay periodos configurados"
              : "Seleccione periodo"}
          </option>
          {periodos.map((periodo) => (
            <option
              key={periodo.id_periodo || periodo.numero_periodo}
              value={periodo.numero_periodo}
            >
              {periodo.nombre_periodo || `Periodo ${periodo.numero_periodo}`}
            </option>
          ))}
        </select>

        <button
          className="btn-primary"
          onClick={consultarPromedioPeriodo}
          disabled={loadingPromedios}
        >
          Ver promedio del periodo
        </button>

        <button
          className="btn-secondary"
          onClick={consultarPromedioFinal}
          disabled={loadingPromedios}
        >
          Ver promedio acumulado
        </button>
      </div>

      {errorPromedios && (
        <p style={{ color: "red", marginTop: "10px" }}>{errorPromedios}</p>
      )}

      {promedioPeriodo && (
        <div className="cards-grid">
          <div className="stat-card">
            <p className="stat-label">
              {promedioPeriodo.nombre_periodo || `Periodo ${promedioPeriodo.numero_periodo}`}
            </p>
            <h3 className="stat-value">
              {promedioPeriodo.promedio_periodo ?? "-"}
            </h3>
            <p className="stat-sub">
              Actividades: {promedioPeriodo.promedio_actividades ?? "-"}
            </p>
            <p className="stat-sub">
              Proyecto: {promedioPeriodo.promedio_proyecto ?? "-"}
            </p>
            <p className="stat-sub">
              Examen: {promedioPeriodo.promedio_examen ?? "-"}
            </p>
          </div>
        </div>
      )}

      {promedioAcumulado && (
        <div className="cards-grid">
          <div className="stat-card accent">
            <p className="stat-label">Promedio acumulado</p>
            <h3 className="stat-value">
              {promedioAcumulado.promedio_acumulado ?? "-"}
            </h3>
            <p className="stat-sub">
              Periodos con datos: {promedioAcumulado.periodos_con_datos}
            </p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Detalle por periodo</p>
            <ul className="periodo-list">
              {promedioAcumulado.promedios_por_periodo.map((t) => (
                <li key={t.numero_periodo}>
                  <strong>{t.nombre_periodo || `Periodo ${t.numero_periodo}`}:</strong>{" "}
                  {t.promedio_periodo ?? "-"}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
