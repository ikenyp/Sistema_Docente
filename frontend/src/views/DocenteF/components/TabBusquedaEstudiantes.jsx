import React from "react";
import { estudiantesAPI } from "../../../services/api";

export const TabBusquedaEstudiantes = ({
  activeTab,
  busqueda,
  setBusqueda,
  resultadosBusqueda,
  setResultadosBusqueda,
  cargandoBusqueda,
  setCargandoBusqueda,
  id_curso,
}) => {
  const ejecutarBusqueda = async () => {
    try {
      setCargandoBusqueda(true);
      const filtros = {
        id_curso: id_curso,
        nombre: busqueda.nombre.trim() || undefined,
        apellido: busqueda.apellido.trim() || undefined,
        size: 50,
      };
      const data = await estudiantesAPI.buscar(filtros);
      setResultadosBusqueda(data || []);
    } catch (err) {
      alert("No se pudo realizar la búsqueda: " + err.message);
    } finally {
      setCargandoBusqueda(false);
    }
  };

  return (
    <div
      className={`panel-card tab-pane ${
        activeTab === "busqueda" ? "active" : ""
      }`}
    >
      <div className="panel-header">
        <div>
          <h3>🔎 Buscar estudiantes</h3>
          <p className="panel-sub">
            Filtra por nombre o apellido dentro del curso
          </p>
        </div>
      </div>

      <div className="form-grid">
        <input
          type="text"
          placeholder="Nombre"
          value={busqueda.nombre}
          onChange={(e) => setBusqueda({ ...busqueda, nombre: e.target.value })}
        />
        <input
          type="text"
          placeholder="Apellido"
          value={busqueda.apellido}
          onChange={(e) =>
            setBusqueda({ ...busqueda, apellido: e.target.value })
          }
        />
        <button
          className="btn-primary"
          onClick={ejecutarBusqueda}
          disabled={cargandoBusqueda}
        >
          Buscar
        </button>
        <button
          className="btn-secondary"
          onClick={() => {
            setBusqueda({ nombre: "", apellido: "" });
            setResultadosBusqueda([]);
          }}
        >
          Limpiar
        </button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Estudiante</th>
              <th>Estado</th>
              <th>Curso actual</th>
            </tr>
          </thead>
          <tbody>
            {resultadosBusqueda.map((est) => (
              <tr key={est.id_estudiante}>
                <td>
                  {est.nombre} {est.apellido}
                </td>
                <td>
                  <span className="pill pill-estado">{est.estado}</span>
                </td>
                <td>{est.id_curso_actual || "-"}</td>
              </tr>
            ))}
            {resultadosBusqueda.length === 0 && (
              <tr>
                <td colSpan={3} style={{ textAlign: "center" }}>
                  {cargandoBusqueda ? "Buscando..." : "Sin resultados"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
