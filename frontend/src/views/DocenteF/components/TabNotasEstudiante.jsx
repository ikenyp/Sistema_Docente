import React, { useMemo, useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import CustomSelect from "../../../components/admin/CustomSelect";
import { Save } from "lucide-react";

const toNumber = (value) => {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : null;
};

const toScore = (value) => {
  const n = toNumber(value);
  return n === null ? 0 : n;
};

const formatAverage = (value) => {
  if (value === null || value === undefined) return "-";
  return Number(value).toFixed(2);
};

export const TabNotasEstudiante = ({
  activeTab,
  estudiantesCurso,
  periodos,
  estudianteSeleccionado,
  setEstudianteSeleccionado,
  notasIndividuales,
  cargandoNotasIndividual,
  onGuardarNota,
}) => {
  const [busquedaEstudiante, setBusquedaEstudiante] = useState("");
  const [periodoFiltrado, setPeriodoFiltrado] = useState("todos");

  const formatoApellidoNombre = (est) =>
    [est?.apellido, est?.nombre].filter(Boolean).join(" ").trim();

  const periodosOrdenados = useMemo(
    () => [...periodos].sort((a, b) => Number(a.numero_periodo) - Number(b.numero_periodo)),
    [periodos],
  );

  const periodosConNotas = useMemo(() => {
    return periodosOrdenados.map((periodo) => {
      const notasPeriodo = notasIndividuales.filter(
        (registro) => String(registro.insumo?.id_periodo) === String(periodo.id_periodo),
      );

      const valores = notasPeriodo.map((registro) => toScore(registro.valor));

      const promedio = valores.length
        ? valores.reduce((acc, valor) => acc + valor, 0) / valores.length
        : null;

      return {
        ...periodo,
        notasPeriodo,
        promedio,
      };
    });
  }, [notasIndividuales, periodosOrdenados]);

  const estudiantesOrdenados = useMemo(
    () =>
      [...estudiantesCurso].sort((a, b) => {
        const apellidoA = String(a?.apellido || "");
        const apellidoB = String(b?.apellido || "");
        const nombreA = String(a?.nombre || "");
        const nombreB = String(b?.nombre || "");
        return `${apellidoA} ${nombreA}`.localeCompare(`${apellidoB} ${nombreB}`, "es");
      }),
    [estudiantesCurso],
  );

  const promedioGeneral = useMemo(() => {
    const promedios = periodosConNotas
      .map((periodo) => periodo.promedio)
      .filter((valor) => valor !== null);

    if (!promedios.length) return null;
    return promedios.reduce((acc, valor) => acc + valor, 0) / promedios.length;
  }, [periodosConNotas]);

  const promedioPeriodoFiltrado = useMemo(() => {
    if (periodoFiltrado === "todos") return null;

    const periodo = periodosConNotas.find(
      (item) => String(item.numero_periodo) === String(periodoFiltrado),
    );
    if (!periodo) return null;

    const valores = periodo.notasPeriodo.map((registro) => toScore(registro.valor));
    if (!valores.length) return null;

    return valores.reduce((acc, valor) => acc + valor, 0) / valores.length;
  }, [periodoFiltrado, periodosConNotas]);

  const mostrarPromedioGeneral = Boolean(estudianteSeleccionado);

  const periodoBadgeLabel = useMemo(() => {
    if (periodoFiltrado === "todos") return "Promedio general";
    return `Promedio ${periodoFiltrado}`;
  }, [periodoFiltrado]);

  const periodosFiltrados = useMemo(() => {
    if (periodoFiltrado === "todos") return periodosConNotas;
    return periodosConNotas.filter((periodo) => String(periodo.numero_periodo) === String(periodoFiltrado));
  }, [periodoFiltrado, periodosConNotas]);

  const estudianteActual = useMemo(
    () => estudiantesOrdenados.find((est) => String(est.id_estudiante) === String(estudianteSeleccionado)),
    [estudianteSeleccionado, estudiantesOrdenados],
  );

  const estudiantesFiltrados = useMemo(() => {
    const query = busquedaEstudiante.trim().toLowerCase();
    if (!query) return estudiantesOrdenados;

    return estudiantesOrdenados.filter((est) => {
      const nombreCompleto = `${est.nombre} ${est.apellido}`.toLowerCase();
      const apellidoNombre = `${est.apellido} ${est.nombre}`.toLowerCase();
      return nombreCompleto.includes(query) || apellidoNombre.includes(query);
    });
  }, [busquedaEstudiante, estudiantesOrdenados]);

  if (activeTab !== "notasEstudiante") return null;

  return (
    <div className="panel-card tab-pane active">
      <div className="panel-header">
        <div>
          <h3>📑 Notas por estudiante</h3>
          <p className="panel-sub">Revisa las actividades, notas y promedios por periodo</p>
        </div>
        {mostrarPromedioGeneral && (
          <div className="nota-general-badge accent">
            <p className="stat-label">{periodoBadgeLabel}</p>
            <h3 className="stat-value">
              {periodoFiltrado === "todos"
                ? formatAverage(promedioGeneral)
                : formatAverage(promedioPeriodoFiltrado)}
            </h3>
            <p className="stat-sub">
              {periodoFiltrado === "todos" ? "Promedio de los periodos" : "Promedio del periodo"}
            </p>
          </div>
        )}
      </div>

      {!estudianteSeleccionado && (
        <div className="form-grid">
          <div className="estudiante-search-wrap">
            <input
              type="text"
              className="estudiante-search-input"
              value={busquedaEstudiante}
              onChange={(e) => setBusquedaEstudiante(e.target.value)}
              placeholder="Buscar estudiante..."
            />

            <div className="estudiante-pill-row">
              {estudiantesFiltrados.map((est) => (
                <button
                  key={est.id_estudiante}
                  type="button"
                  className={`estudiante-pill ${String(estudianteSeleccionado) === String(est.id_estudiante) ? "active" : ""}`}
                  onClick={() => {
                    setEstudianteSeleccionado(String(est.id_estudiante));
                    setBusquedaEstudiante(formatoApellidoNombre(est));
                  }}
                >
                  {formatoApellidoNombre(est)}
                </button>
              ))}
              {estudiantesFiltrados.length === 0 && (
                <div className="estudiante-search-empty">No se encontraron coincidencias</div>
              )}
            </div>
          </div>
        </div>
      )}

      {estudianteSeleccionado && (
        <div className="notas-toolbar">
          <div className="notas-toolbar-left">
            <span className="estudiante-pill estudiante-pill-selected active">
              <strong>Estudiante:</strong> {formatoApellidoNombre(estudianteActual)}
            </span>
            <button
              type="button"
              className="btn-cambiar-estudiante"
              onClick={() => {
                setEstudianteSeleccionado("");
                setBusquedaEstudiante("");
                setPeriodoFiltrado("todos");
              }}
            >
              <ArrowLeftRight size={16} />
              <span>Cambiar</span>
            </button>
          </div>
          <div className="notas-toolbar-right">
            <span className="notas-toolbar-status">
              <strong>Ver:</strong>
            </span>
            <CustomSelect
              value={periodoFiltrado}
              onChange={setPeriodoFiltrado}
              options={[
                { value: "todos", label: "Todos los periodos" },
                ...periodosOrdenados.map((periodo) => ({
                  value: String(periodo.numero_periodo),
                  label: periodo.nombre_periodo || `Trimestre ${periodo.numero_periodo}`,
                })),
              ]}
              placeholder="Filtrar periodo"
              className="custom-select-white notas-periodo-select"
            />
          </div>
        </div>
      )}

      {cargandoNotasIndividual && <p>Cargando notas...</p>}

      {!cargandoNotasIndividual && estudianteSeleccionado && (
        <div className="notas-estudiante-wrap">
          {periodosFiltrados.map((periodo) => (
            <section key={periodo.id_periodo} className="periodo-notas-block">
              {periodoFiltrado === "todos" && (
                <div className="periodo-notas-header">
                  <h4>{periodo.nombre_periodo || `Trimestre ${periodo.numero_periodo}`}</h4>
                  <div className="periodo-notas-average">
                    Promedio: <strong>{formatAverage(periodo.promedio)}</strong>
                  </div>
                </div>
              )}

              <div className="table-container">
                <table className={`tabla-notas-estudiante ${periodoFiltrado !== "todos" ? "no-header" : ""}`}>
                  <thead>
                    <tr>
                      <th>Insumo</th>
                      <th>Ponderacion</th>
                      <th>Nota</th>
                      <th>Accion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {periodo.notasPeriodo.map((registro) => (
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
                            type="button"
                            onClick={() => {
                              const input = document.getElementById(
                                `nota-ind-${registro.insumo.id_insumo}`,
                              );
                              onGuardarNota(registro, input.value);
                            }}
                          >
                            <Save size={18} />
                            <span>Guardar</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {periodo.notasPeriodo.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ textAlign: "center" }}>
                          No hay actividades configuradas para este periodo
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};
