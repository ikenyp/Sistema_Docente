import React from "react";
import { promediosAPI } from "../../../services/api";

export const TabPromedios = ({
  activeTab,
  estudiantesCurso,
  estudiantePromedio,
  setEstudiantePromedio,
  trimestreSeleccionado,
  setTrimestreSeleccionado,
  promedioTrimestre,
  setPromedioTrimestre,
  promedioFinal,
  setPromedioFinal,
  loadingPromedios,
  setLoadingPromedios,
  errorPromedios,
  setErrorPromedios,
  id_curso,
  cursoDetalle,
}) => {
  const consultarPromedioTrimestral = async () => {
    if (!estudiantePromedio) {
      alert("Seleccione un estudiante");
      return;
    }
    try {
      setLoadingPromedios(true);
      setErrorPromedios(null);
      const data = await promediosAPI.obtenerTrimestral(
        parseInt(estudiantePromedio, 10),
        parseInt(id_curso, 10),
        parseInt(trimestreSeleccionado, 10)
      );
      setPromedioTrimestre(data);
    } catch (err) {
      setErrorPromedios(
        err.message || "No se pudo calcular el promedio trimestral"
      );
    } finally {
      setLoadingPromedios(false);
    }
  };

  const consultarPromedioFinal = async () => {
    if (!estudiantePromedio || !cursoDetalle?.anio_lectivo) {
      alert("Seleccione estudiante y verifique que el curso tenga año lectivo");
      return;
    }
    try {
      setLoadingPromedios(true);
      setErrorPromedios(null);
      const data = await promediosAPI.obtenerFinal(
        parseInt(estudiantePromedio, 10),
        parseInt(id_curso, 10),
        cursoDetalle.anio_lectivo
      );
      setPromedioFinal(data);
    } catch (err) {
      setErrorPromedios(err.message || "No se pudo calcular el promedio final");
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
          <p className="panel-sub">Trimestral y final anual</p>
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
          value={trimestreSeleccionado}
          onChange={(e) => setTrimestreSeleccionado(e.target.value)}
        >
          <option value="1">Trimestre 1</option>
          <option value="2">Trimestre 2</option>
          <option value="3">Trimestre 3</option>
        </select>

        <button
          className="btn-primary"
          onClick={consultarPromedioTrimestral}
          disabled={loadingPromedios}
        >
          Ver promedio trimestral
        </button>

        <button
          className="btn-secondary"
          onClick={consultarPromedioFinal}
          disabled={loadingPromedios}
        >
          Ver promedio final
        </button>
      </div>

      {errorPromedios && (
        <p style={{ color: "red", marginTop: "10px" }}>{errorPromedios}</p>
      )}

      {promedioTrimestre && (
        <div className="cards-grid">
          <div className="stat-card">
            <p className="stat-label">
              Trimestre {promedioTrimestre.numero_trimestre}
            </p>
            <h3 className="stat-value">
              {promedioTrimestre.promedio_trimestral ?? "-"}
            </h3>
            <p className="stat-sub">
              Actividades: {promedioTrimestre.promedio_actividades ?? "-"}
            </p>
            <p className="stat-sub">
              Proyecto: {promedioTrimestre.promedio_proyecto ?? "-"}
            </p>
            <p className="stat-sub">
              Examen: {promedioTrimestre.promedio_examen ?? "-"}
            </p>
          </div>
        </div>
      )}

      {promedioFinal && (
        <div className="cards-grid">
          <div className="stat-card accent">
            <p className="stat-label">Promedio Final</p>
            <h3 className="stat-value">
              {promedioFinal.promedio_final ?? "-"}
            </h3>
            <p className="stat-sub">
              Trimestres con datos: {promedioFinal.trimestres_con_datos}
            </p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Detalle por trimestre</p>
            <ul className="trimestre-list">
              {promedioFinal.promedios_trimestrales.map((t) => (
                <li key={t.numero_trimestre}>
                  <strong>T{t.numero_trimestre}:</strong>{" "}
                  {t.promedio_trimestral ?? "-"}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
