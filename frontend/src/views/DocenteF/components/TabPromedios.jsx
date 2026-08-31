import React, { useMemo, useState } from "react";

const toNumber = (value) => {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : null;
};

const scoreOrZero = (value) => {
  const n = toNumber(value);
  return n === null ? 0 : n;
};

const format = (value) => (value === null || value === undefined ? "-" : Number(value).toFixed(2));

const getTipoBase = (tipo) => String(tipo || "").toLowerCase();

const getTipoBadge = (tipo) => {
  const base = getTipoBase(tipo);
  if (base.includes("proyecto")) return { label: "P", title: "Proyecto" };
  if (base.includes("examen")) return { label: "E", title: "Examen" };
  return { label: "A", title: "Actividad" };
};

const getWeightConfig = (grouped) => {
  const hasActividad = (grouped.actividades || []).length > 0;
  const hasProyecto = (grouped.proyectos || []).length > 0;
  const hasExamen = (grouped.examenes || []).length > 0;

  if (hasActividad && hasProyecto && hasExamen) {
    return { actividades: 70, proyecto: 10, examen: 20 };
  }
  if (hasActividad && hasProyecto && !hasExamen) {
    return { actividades: 70, proyecto: 30, examen: 0 };
  }
  if (hasActividad && !hasProyecto && hasExamen) {
    return { actividades: 70, proyecto: 0, examen: 30 };
  }
  if (hasActividad && !hasProyecto && !hasExamen) {
    return { actividades: 100, proyecto: 0, examen: 0 };
  }
  if (!hasActividad && hasProyecto && hasExamen) {
    return { actividades: 0, proyecto: 50, examen: 50 };
  }
  if (!hasActividad && hasProyecto && !hasExamen) {
    return { actividades: 0, proyecto: 100, examen: 0 };
  }
  if (!hasActividad && !hasProyecto && hasExamen) {
    return { actividades: 0, proyecto: 0, examen: 100 };
  }
  return { actividades: 0, proyecto: 0, examen: 0 };
};

const getNotaKey = (registro) => {
  const insumoId = registro?.insumo?.id_insumo ?? registro?.id_insumo;
  const estudianteId = registro?.id_estudiante ?? registro?.estudiante?.id_estudiante;
  return `${estudianteId || ""}:${insumoId || ""}`;
};

export const TabPromedios = ({
  activeTab,
  estudiantesCurso,
  periodos = [],
  insumosMateria = [],
  notasPorEstudiante = {},
}) => {
  const [filaExpandida, setFilaExpandida] = useState(null);

  const periodosOrdenados = useMemo(
    () => [...periodos].sort((a, b) => Number(a.numero_periodo) - Number(b.numero_periodo)),
    [periodos],
  );

  const insumosPorPeriodo = useMemo(() => {
    const map = new Map();
    periodosOrdenados.forEach((periodo) => {
      map.set(String(periodo.id_periodo), []);
    });

    insumosMateria.forEach((insumo) => {
      const key = String(insumo.id_periodo);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(insumo);
    });

    return map;
  }, [insumosMateria, periodosOrdenados]);

  const notaPorInsumo = useMemo(() => {
    const map = new Map();
    Object.values(notasPorEstudiante || {}).forEach((lista) => {
      (lista || []).forEach((registro) => {
        map.set(getNotaKey(registro), scoreOrZero(registro.valor));
      });
    });
    return map;
  }, [notasPorEstudiante]);

  const estudiantesConPromedios = useMemo(() => {
    return [...estudiantesCurso]
      .sort((a, b) => {
        const valorA = `${String(a?.apellido || "")} ${String(a?.nombre || "")}`.trim();
        const valorB = `${String(b?.apellido || "")} ${String(b?.nombre || "")}`.trim();
        return valorA.localeCompare(valorB, "es");
      })
      .map((estudiante) => {
      const porPeriodo = periodosOrdenados.map((periodo) => {
        const insumos = insumosPorPeriodo.get(String(periodo.id_periodo)) || [];
        const grouped = { actividades: [], proyectos: [], examenes: [] };

        insumos.forEach((insumo) => {
          const nota = notaPorInsumo.get(`${estudiante.id_estudiante}:${insumo.id_insumo}`);
          const item = {
            id_insumo: insumo.id_insumo,
            nombre: insumo.nombre,
            tipo_insumo: insumo.tipo_insumo,
            nota: nota === undefined ? 0 : nota,
          };

          const tipo = getTipoBase(insumo.tipo_insumo);
          if (tipo.includes("actividad")) grouped.actividades.push(item);
          else if (tipo.includes("proyecto")) grouped.proyectos.push(item);
          else if (tipo.includes("examen")) grouped.examenes.push(item);
          else grouped.actividades.push(item);
        });

        const weights = getWeightConfig(grouped);
        const avgGroup = (arr) =>
          arr.length ? arr.reduce((acc, item) => acc + scoreOrZero(item.nota), 0) / arr.length : null;
        const promedioActividades = avgGroup(grouped.actividades);
        const promedioProyecto = avgGroup(grouped.proyectos);
        const promedioExamen = avgGroup(grouped.examenes);

        const periodoPromedio =
          (promedioActividades ?? 0) * (weights.actividades / 100) +
          (promedioProyecto ?? 0) * (weights.proyecto / 100) +
          (promedioExamen ?? 0) * (weights.examen / 100);

        return {
          ...periodo,
          insumos: insumos.map((insumo) => ({
            id_insumo: insumo.id_insumo,
            nombre: insumo.nombre,
            tipo_insumo: insumo.tipo_insumo,
            nota: notaPorInsumo.get(`${estudiante.id_estudiante}:${insumo.id_insumo}`) ?? 0,
          })),
          promedioActividades,
          promedioProyecto,
          promedioExamen,
          weights,
          promedioPeriodo: insumos.length ? periodoPromedio : null,
        };
      });

      const periodosConDato = porPeriodo.filter((p) => p.promedioPeriodo !== null);
      const sumaPeriodos = periodosConDato.reduce((acc, p) => acc + (p.promedioPeriodo || 0), 0);
      const promedioGeneral = periodosConDato.length ? sumaPeriodos / periodosConDato.length : null;

      return {
        estudiante,
        porPeriodo,
        sumaPeriodos,
        promedioGeneral,
      };
    });
  }, [estudiantesCurso, insumosPorPeriodo, notaPorInsumo, periodosOrdenados]);

  if (activeTab !== "promedios") return null;

  return (
    <div className={`panel-card tab-pane ${activeTab === "promedios" ? "active" : ""}`}>
      <div className="panel-header">
        <div>
          <h3>📈 Promedios</h3>
          <p className="panel-sub">Promedios por trimestre y detalle expandible</p>
        </div>
      </div>

      <div className="table-container">
        <table className="promedios-table">
          <colgroup>
            <col className="promedios-col-estudiante" />
            {periodosOrdenados.map((periodo) => (
              <col key={periodo.id_periodo} className="promedios-col-periodo" />
            ))}
            <col className="promedios-col-suma" />
            <col className="promedios-col-promedio" />
          </colgroup>
          <thead>
            <tr>
              <th>Estudiante</th>
              {periodosOrdenados.map((periodo) => (
                <th key={periodo.id_periodo}>{periodo.nombre_periodo || `Trimestre ${periodo.numero_periodo}`}</th>
              ))}
              <th>Suma trimestres</th>
              <th>Promedio general</th>
            </tr>
          </thead>
          <tbody>
            {estudiantesConPromedios.map((row) => {
              const expanded = filaExpandida === row.estudiante.id_estudiante;

              return (
                <React.Fragment key={row.estudiante.id_estudiante}>
                  <tr className="promedios-row" onClick={() => setFilaExpandida(expanded ? null : row.estudiante.id_estudiante)}>
                    <td>{row.estudiante.apellido} {row.estudiante.nombre}</td>
                    {row.porPeriodo.map((periodo) => (
                      <td key={periodo.id_periodo}>{format(periodo.promedioPeriodo)}</td>
                    ))}
                    <td>{format(row.sumaPeriodos)}</td>
                    <td>{format(row.promedioGeneral)}</td>
                  </tr>
                  {expanded && (
                    <tr className="promedios-detail-row">
                      <td colSpan={2 + periodosOrdenados.length}>
                        <div className="promedios-detail-grid promedios-detail-grid-inline">
                          {row.porPeriodo.map((periodo) => (
                            <div key={periodo.id_periodo} className="promedios-detail-periodo">
                              <div className="promedios-detail-head">
                                <h4>{periodo.nombre_periodo || `Trimestre ${periodo.numero_periodo}`}</h4>
                                <span>{format(periodo.promedioPeriodo)}</span>
                              </div>
                              <div className="promedios-detail-list">
                                {periodo.insumos.map((insumo) => (
                                  <div key={insumo.id_insumo} className="promedios-detail-pill">
                                    <div className="promedios-pill-left">
                                      <strong>{insumo.nombre}</strong>
                                    </div>
                                    <span
                                      className="promedios-pill-badge"
                                      title={getTipoBadge(insumo.tipo_insumo).title}
                                      aria-label={getTipoBadge(insumo.tipo_insumo).title}
                                    >
                                      {getTipoBadge(insumo.tipo_insumo).label}
                                    </span>
                                    <span className="promedios-pill-score">{format(insumo.nota)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
