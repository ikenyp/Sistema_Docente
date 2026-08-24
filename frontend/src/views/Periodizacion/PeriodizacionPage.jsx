import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Save, Trash2, X } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import { aniosLectivosAPI, cursosAPI, periodizacionAPI } from "../../services/api";
import { notify } from "../../components/notify";

const TIPOS_PERIODIZACION = {
  quimestral: { label: "Quimestral", cantidad: 2, singular: "Quimestre", meses: 5 },
  trimestral: { label: "Trimestral", cantidad: 3, singular: "Trimestre", meses: 3 },
  bimestral: { label: "Bimestral", cantidad: 4, singular: "Bimestre", meses: 2 },
};

const crearPeriodos = (cantidad, existentes = []) =>
  Array.from({ length: cantidad }, (_, index) => {
    const numero = index + 1;
    const previo = existentes.find((item) => item.numero_periodo === numero);
    return {
      numero_periodo: numero,
      fecha_inicio: previo?.fecha_inicio?.slice(0, 10) || "",
      fecha_fin: previo?.fecha_fin?.slice(0, 10) || "",
      id_periodo: previo?.id_periodo || null,
    };
  });

const detectarTipo = (cantidad) => {
  const encontrado = Object.entries(TIPOS_PERIODIZACION).find(
    ([, config]) => config.cantidad === cantidad,
  );
  return encontrado?.[0] || "trimestral";
};

const parseFecha = (valor) => {
  if (!valor) return null;
  return new Date(`${valor}T00:00:00Z`);
};

const formatearFecha = (fecha) => fecha.toISOString().slice(0, 10);

const sumarDias = (fecha, dias) => {
  const copia = new Date(fecha);
  copia.setUTCDate(copia.getUTCDate() + dias);
  return copia;
};

const sumarMeses = (fecha, meses) => {
  const copia = new Date(fecha);
  copia.setUTCMonth(copia.getUTCMonth() + meses);
  return copia;
};

const restarMeses = (fecha, meses) => sumarMeses(fecha, -meses);

const inicioDesdeFin = (fin, mesesPeriodo) => sumarDias(restarMeses(fin, mesesPeriodo), 1);

const finDesdeInicio = (inicio, mesesPeriodo) => sumarDias(sumarMeses(inicio, mesesPeriodo), -1);

function PeriodizacionPage({ embedded = false } = {}) {
  const [anios, setAnios] = useState([]);
  const [anioSel, setAnioSel] = useState("");
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [tipoPeriodizacion, setTipoPeriodizacion] = useState("trimestral");
  const [periodosForm, setPeriodosForm] = useState(crearPeriodos(3));
  const [configuracionActual, setConfiguracionActual] = useState(null);
  const [configuracionLista, setConfiguracionLista] = useState(false);
  const [guardandoPeriodoId, setGuardandoPeriodoId] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  const [modalEliminarOpen, setModalEliminarOpen] = useState(false);

  const appMode =
    (localStorage.getItem("app_mode") || "institucional").toLowerCase();
  const esModoPersonal = appMode === "personal";

  const aniosSugeridos = useMemo(() => {
    const year = new Date().getFullYear();
    return [`${year}-${year + 1}`, `${year - 1}-${year}`];
  }, []);

  const aniosDisponibles = anios.length > 0 ? anios : aniosSugeridos;

  const normalizarAnioLectivo = (valor) => {
    if (!valor) return "";
    if (/^\d{4}$/.test(valor)) {
      return `${valor}-${Number(valor) + 1}`;
    }
    return valor;
  };

  const validarAnioLectivo = (anio) => {
    const patron = /^\d{4}-\d{4}$/;
    if (!patron.test(anio)) {
      return "Formato inválido. Usa: 2026-2027";
    }
    const [inicio, fin] = anio.split("-").map(Number);
    if (fin !== inicio + 1) {
      return "El año final debe ser +1 del inicial (ej: 2026-2027)";
    }
    return null;
  };

  const resumenConfiguracion = useMemo(() => {
    const cantidad = configuracionActual?.periodos?.length || 0;
    const tipo = detectarTipo(cantidad);
    return {
      cantidad,
      completa: cantidad === TIPOS_PERIODIZACION[tipo].cantidad,
      tipo,
    };
  }, [configuracionActual]);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [al, cl] = await Promise.all([
        aniosLectivosAPI.listar(),
        cursosAPI.listar({ size: 100 }),
      ]);

      const aniosBackend = (al || []).map((item) => normalizarAnioLectivo(item.anio_lectivo)).filter(Boolean);
      if (aniosBackend.length > 0) {
        setAnios(aniosBackend);
      } else {
        const aniosCursos = new Set(
          (cl || [])
            .map((c) => normalizarAnioLectivo(c.anio_lectivo))
            .filter(Boolean),
        );
        setAnios(Array.from(aniosCursos).sort().reverse());
      }
    } catch (e) {
      notify("error", e.message || "No se pudo cargar la periodizacion");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    if (!anioSel && aniosDisponibles.length > 0) {
      setAnioSel(aniosDisponibles[0]);
    }
  }, [aniosDisponibles, anioSel]);

  useEffect(() => {
    if (anioSel && !aniosDisponibles.includes(anioSel) && aniosDisponibles.length > 0) {
      setAnioSel(aniosDisponibles[0]);
    }
  }, [anioSel, aniosDisponibles]);

  useEffect(() => {
    if (!anioSel) return;
    let cancelado = false;
    setConfiguracionLista(false);

    const cargarConfiguracion = async () => {
      try {
        const config = await periodizacionAPI.obtenerConfiguracionActual(anioSel);
        if (cancelado) return;
        setConfiguracionActual(config);
        setTipoPeriodizacion(config.tipo_periodizacion);
        setPeriodosForm(
          config.periodos.map((periodo) => ({
            numero_periodo: periodo.numero_periodo,
            fecha_inicio: periodo.fecha_inicio?.slice(0, 10) || "",
            fecha_fin: periodo.fecha_fin?.slice(0, 10) || "",
            id_periodo: periodo.id_periodo,
          })),
        );
      } catch {
        if (!cancelado) {
          setConfiguracionActual(null);
          const tipoDetectado = detectarTipo(3);
          const cantidadObjetivo = TIPOS_PERIODIZACION[tipoDetectado].cantidad;
          setTipoPeriodizacion(tipoDetectado);
          setPeriodosForm(crearPeriodos(cantidadObjetivo, []));
        }
      } finally {
        if (!cancelado) setConfiguracionLista(true);
      }
    };

    cargarConfiguracion();
    return () => {
      cancelado = true;
    };
  }, [anioSel]);

  const cambiarTipo = (nuevoTipo) => {
    setTipoPeriodizacion(nuevoTipo);
    const cantidad = TIPOS_PERIODIZACION[nuevoTipo].cantidad;
    setPeriodosForm(crearPeriodos(cantidad, []));
  };

  const guardarPeriodo = async (periodo) => {
    if (!anioSel) return;
    const errorAnio = validarAnioLectivo(anioSel);
    if (errorAnio) {
      notify("error", errorAnio);
      return;
    }
    if (!periodo.fecha_inicio || !periodo.fecha_fin) {
      notify("error", "Completa las fechas del periodo");
      return;
    }
    if (periodo.fecha_inicio >= periodo.fecha_fin) {
      notify("error", `El periodo ${periodo.numero_periodo} tiene fechas invalidas`);
      return;
    }

    setGuardandoPeriodoId(periodo.id_periodo || periodo.numero_periodo);
    try {
      const singular = TIPOS_PERIODIZACION[tipoPeriodizacion].singular;
      await periodizacionAPI.guardarConfiguracionCompleta({
        anio_lectivo: anioSel,
        tipo_periodizacion: tipoPeriodizacion,
        cantidad_periodos: TIPOS_PERIODIZACION[tipoPeriodizacion].cantidad,
        nombre_periodo_singular: singular,
        periodos: (configuracionActual?.periodos || periodosForm).map((item) =>
          item.numero_periodo === periodo.numero_periodo
            ? {
                numero_periodo: item.numero_periodo,
                nombre_periodo: `${singular} ${item.numero_periodo}`,
                fecha_inicio: periodo.fecha_inicio,
                fecha_fin: periodo.fecha_fin,
              }
            : {
                numero_periodo: item.numero_periodo,
                nombre_periodo: item.nombre_periodo || `${singular} ${item.numero_periodo}`,
                fecha_inicio: item.fecha_inicio,
                fecha_fin: item.fecha_fin,
              },
        ),
      });

      notify("success", "Periodo guardado correctamente");
      const config = await periodizacionAPI.obtenerConfiguracionActual(anioSel);
      setConfiguracionActual(config);
      setTipoPeriodizacion(config.tipo_periodizacion || tipoPeriodizacion);
      setPeriodosForm(
        (config.periodos || []).map((item) => ({
          numero_periodo: item.numero_periodo,
          fecha_inicio: item.fecha_inicio?.slice(0, 10) || "",
          fecha_fin: item.fecha_fin?.slice(0, 10) || "",
          id_periodo: item.id_periodo,
        })),
      );
    } catch (e) {
      notify("error", e.message || "No se pudo guardar el periodo");
    } finally {
      setGuardandoPeriodoId(null);
    }
  };

  const actualizarPeriodo = (index, campo, valor) => {
    const mesesPeriodo = TIPOS_PERIODIZACION[tipoPeriodizacion].meses;
    setPeriodosForm((prev) => {
      const copia = prev.map((item) => ({ ...item }));
      const objetivo = copia[index];
      if (!objetivo) return prev;

      copia[index] = { ...objetivo, [campo]: valor };

      const inicioBase =
        parseFecha(copia[index].fecha_inicio) ||
        (parseFecha(copia[index].fecha_fin) ? inicioDesdeFin(parseFecha(copia[index].fecha_fin), mesesPeriodo) : null);
      const finBase =
        parseFecha(copia[index].fecha_fin) ||
        (parseFecha(copia[index].fecha_inicio) ? finDesdeInicio(parseFecha(copia[index].fecha_inicio), mesesPeriodo) : null);

      if (!inicioBase && !finBase) return copia;

      if (inicioBase) {
        copia[index].fecha_inicio = formatearFecha(inicioBase);
      }
      if (finBase) {
        copia[index].fecha_fin = formatearFecha(finBase);
      }

      let inicioActual = inicioBase;
      if (!inicioActual && finBase) {
        inicioActual = inicioDesdeFin(finBase, mesesPeriodo);
        copia[index].fecha_inicio = formatearFecha(inicioActual);
      }

      let finActual = finBase;
      if (!finActual && inicioBase) {
        finActual = finDesdeInicio(inicioBase, mesesPeriodo);
        copia[index].fecha_fin = formatearFecha(finActual);
      }

      for (let i = index - 1; i >= 0; i -= 1) {
        const finPrevio = sumarDias(inicioActual, -1);
        const inicioPrevio = inicioDesdeFin(finPrevio, mesesPeriodo);
        copia[i].fecha_inicio = formatearFecha(inicioPrevio);
        copia[i].fecha_fin = formatearFecha(finPrevio);
        inicioActual = inicioPrevio;
      }

      for (let i = index + 1; i < copia.length; i += 1) {
        const inicioSiguiente = sumarDias(finActual, 1);
        const finSiguiente = finDesdeInicio(inicioSiguiente, mesesPeriodo);
        copia[i].fecha_inicio = formatearFecha(inicioSiguiente);
        copia[i].fecha_fin = formatearFecha(finSiguiente);
        finActual = finSiguiente;
      }

      return copia;
    });
  };

  const validarPeriodos = () => {
    for (const periodo of periodosForm) {
      if (!periodo.fecha_inicio || !periodo.fecha_fin) {
        return "Todas las fechas de los periodos son obligatorias";
      }
      if (periodo.fecha_inicio >= periodo.fecha_fin) {
        return `El periodo ${periodo.numero_periodo} tiene fechas invalidas`;
      }
    }

    const ordenados = [...periodosForm].sort(
      (a, b) => a.numero_periodo - b.numero_periodo,
    );

    for (let i = 1; i < ordenados.length; i += 1) {
      const previo = ordenados[i - 1];
      const actual = ordenados[i];
      if (previo.fecha_fin >= actual.fecha_inicio) {
        return `Los periodos ${previo.numero_periodo} y ${actual.numero_periodo} se solapan o tienen fechas invertidas`;
      }
    }

    return null;
  };

  const guardarConfiguracion = async () => {
    if (!anioSel) {
      notify("error", "Selecciona un año lectivo");
      return;
    }

    const errorAnio = validarAnioLectivo(anioSel);
    if (errorAnio) {
      notify("error", errorAnio);
      return;
    }

    const error = validarPeriodos();
    if (error) {
      notify("error", error);
      return;
    }

    setGuardando(true);
    try {
      const singular = TIPOS_PERIODIZACION[tipoPeriodizacion].singular;
      await periodizacionAPI.guardarConfiguracionCompleta({
        anio_lectivo: anioSel,
        tipo_periodizacion: tipoPeriodizacion,
        cantidad_periodos: TIPOS_PERIODIZACION[tipoPeriodizacion].cantidad,
        nombre_periodo_singular: singular,
        periodos: periodosForm.map((periodo) => ({
          numero_periodo: periodo.numero_periodo,
          nombre_periodo: `${singular} ${periodo.numero_periodo}`,
          fecha_inicio: periodo.fecha_inicio,
          fecha_fin: periodo.fecha_fin,
        })),
      });

      notify("success", "Periodizacion guardada correctamente");
      await cargar();
      const config = await periodizacionAPI.obtenerConfiguracionActual(anioSel);
      setConfiguracionActual(config);
    } catch (e) {
      notify("error", e.message || "No se pudo guardar la periodizacion");
    } finally {
      setGuardando(false);
    }
  };

  const eliminarConfiguracion = async () => {
    if (!anioSel) {
      notify("error", "Selecciona un año lectivo");
      return;
    }

    setEliminando(true);
    try {
      await periodizacionAPI.eliminarConfiguracionActual(anioSel);
      notify("success", "Periodizacion eliminada correctamente");
      setConfiguracionActual(null);
      setModalEliminarOpen(false);
      const tipoDetectado = detectarTipo(3);
      setTipoPeriodizacion(tipoDetectado);
      setPeriodosForm(crearPeriodos(TIPOS_PERIODIZACION[tipoDetectado].cantidad, []));
    } catch (e) {
      notify("error", e.message || "No se pudo eliminar la periodizacion");
    } finally {
      setEliminando(false);
    }
  };

  const tipoActual = TIPOS_PERIODIZACION[tipoPeriodizacion];
  const tieneConfiguracion = (configuracionActual?.periodos || []).length > 0;
  const mostrarFormulario = !tieneConfiguracion;

  if (embedded && !configuracionLista) {
    return <div className="periodizacion-embedded-loading">Cargando periodizacion...</div>;
  }

  const contenido = (
    <>
      {!embedded && (
        <div className="cards-grid dashboard-summary-grid admin-metrics-grid">
          <div className="stat-card accent">
            <p className="stat-label">Tipo</p>
            <h3 className="stat-value">{tipoActual.label}</h3>
            <p className="stat-sub">Configuracion activa en el formulario</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Periodos esperados</p>
            <h3 className="stat-value">{tipoActual.cantidad}</h3>
            <p className="stat-sub">Segun el tipo seleccionado</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Periodos creados</p>
            <h3 className="stat-value">
              {configuracionActual?.periodos?.length ?? resumenConfiguracion.cantidad}
            </h3>
            <p className="stat-sub">Registrados para el contexto actual</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Estado</p>
            <h3 className="stat-value">
              {resumenConfiguracion.completa ? "Completa" : "Pendiente"}
            </h3>
            <p className="stat-sub">Revise continuidad y fechas</p>
          </div>
        </div>
      )}

      {embedded && tieneConfiguracion && (
        <div className="periodizacion-embedded-status">
          <span className="periodizacion-embedded-badge">Configurada</span>
          <span className="periodizacion-embedded-text">
            {tipoActual.label} · {configuracionActual?.periodos?.length || 0} periodos · Año lectivo {anioSel}
          </span>
        </div>
      )}

      {mostrarFormulario && (
        <>
          {!embedded && <div className="panel-divider" />}

          <div className="section-block">
            <div className="section-block-head">
              <h3 className="periodizacion-section-title">
                {embedded ? "Elegir tipo de Periodo:" : "Configuracion general"}
              </h3>
              {!embedded && (
                <p className="periodizacion-section-subtitle">
                  {esModoPersonal
                    ? "Esta pantalla administra la configuracion academica de tu contexto personal."
                    : "Esta pantalla administra la configuracion academica del año lectivo."}
                </p>
              )}
            </div>

            <div
              className={`periodizacion-types-row ${embedded ? "periodizacion-types-embedded" : "dashboard-grid admin-action-grid"}`}
              style={{
                gridTemplateColumns: embedded ? "repeat(3, minmax(0, 1fr))" : "repeat(3, minmax(0, 1fr))",
                gap: embedded ? 6 : 12,
              }}
            >
              {Object.entries(TIPOS_PERIODIZACION).map(([key, config]) => (
                <button
                  key={key}
                  type="button"
                  className={embedded ? "periodizacion-pill-btn" : "admin-action-card"}
                  onClick={() => cambiarTipo(key)}
                  style={{
                    border:
                      tipoPeriodizacion === key
                        ? "2px solid #2f72b5"
                        : "1px solid #dce5f4",
                    padding: embedded ? "0.45rem 0.65rem" : undefined,
                    minHeight: embedded ? 44 : undefined,
                  }}
                >
                  <span className="admin-action-title">{config.label}</span>
                  {embedded ? (
                    <span className="periodizacion-pill-count">{config.cantidad}</span>
                  ) : (
                    <span className="admin-action-sub">
                      {config.cantidad} periodos por año lectivo
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {!embedded && <div className="panel-divider" />}

          <div className="section-block">
            <div className="section-block-head">
              <h3 className="periodizacion-section-title">
                {embedded ? "Definicion de fechas:" : "Definicion de periodos"}
              </h3>
              <p className="periodizacion-section-subtitle">
                {embedded
                  ? "Elija fechas, sin solapamientos por periodos"
                  : `Complete fechas continuas y sin solapamientos para cada ${tipoActual.singular.toLowerCase()}.`}
              </p>
            </div>

            <div className="table-container">
              {periodosForm.map((periodo, index) => (
                <div
                  key={periodo.numero_periodo}
                  style={{
                    display: "grid",
                    gridTemplateColumns: embedded ? "98px 1fr 1fr" : "160px 1fr 1fr",
                    gap: embedded ? 4 : 12,
                    marginBottom: embedded ? 6 : 12,
                    alignItems: "center",
                  }}
                >
                  <strong>
                    {tipoActual.singular} {periodo.numero_periodo}
                  </strong>
                  <input
                    type="date"
                    value={periodo.fecha_inicio}
                    onChange={(e) =>
                      actualizarPeriodo(index, "fecha_inicio", e.target.value)
                    }
                    style={{ minHeight: embedded ? 38 : undefined, paddingTop: embedded ? 0.45 : undefined, paddingBottom: embedded ? 0.45 : undefined }}
                  />
                  <input
                    type="date"
                    value={periodo.fecha_fin}
                    onChange={(e) =>
                      actualizarPeriodo(index, "fecha_fin", e.target.value)
                    }
                    style={{ minHeight: embedded ? 38 : undefined, paddingTop: embedded ? 0.45 : undefined, paddingBottom: embedded ? 0.45 : undefined }}
                  />
                </div>
              ))}

              <div className="modal-buttons" style={{ justifyContent: "flex-start" }}>
                <button
                  className="btn-save"
                  onClick={guardarConfiguracion}
                  disabled={guardando || cargando}
                  style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.35rem", minHeight: embedded ? 38 : undefined }}
                >
                  <Save size={14} />
                  <span>{guardando ? "Guardando..." : "Guardar periodizacion"}</span>
                </button>
              </div>
            </div>
          </div>
      </>
      )}

      {tieneConfiguracion && (
        <div className="section-block">
          <div className="section-block-head periodizacion-registered-head">
            {embedded ? (
              <div className="periodizacion-registered-label">Periodos registrados</div>
            ) : (
              <>
                <h3>Periodos registrados</h3>
                <p>Vista actual del contexto activo.</p>
              </>
            )}
          </div>

          <div className="table-container">
            {cargando ? (
              <p>Cargando...</p>
            ) : (
              <table className={embedded ? "periodizacion-config-table periodizacion-config-table-embedded" : "periodizacion-config-table"}>
                <thead>
                  <tr>
                    <th>Periodo</th>
                    <th>Fecha inicio</th>
                    <th>Fecha fin</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {(configuracionActual?.periodos || []).map((item) => {
                    const periodoEditable =
                      periodosForm.find((p) => p.numero_periodo === item.numero_periodo) || item;
                    return (
                      <tr key={item.id_periodo}>
                        <td>
                          {item.nombre_periodo || `${tipoActual.singular} ${item.numero_periodo}`}
                        </td>
                        <td>
                          <input
                            type="date"
                            value={periodoEditable.fecha_inicio?.slice(0, 10) || ""}
                            onChange={(e) =>
                              setPeriodosForm((prev) =>
                                prev.map((p) =>
                                  p.numero_periodo === item.numero_periodo
                                    ? { ...p, fecha_inicio: e.target.value }
                                    : p,
                                ),
                              )
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="date"
                            value={periodoEditable.fecha_fin?.slice(0, 10) || ""}
                            onChange={(e) =>
                              setPeriodosForm((prev) =>
                                prev.map((p) =>
                                  p.numero_periodo === item.numero_periodo
                                    ? { ...p, fecha_fin: e.target.value }
                                    : p,
                                ),
                              )
                            }
                          />
                        </td>
                        <td>
                            <button
                              type="button"
                              className="btn-save"
                              onClick={() => guardarPeriodo(periodoEditable)}
                              disabled={
                              guardandoPeriodoId === item.id_periodo ||
                              guardandoPeriodoId === item.numero_periodo
                            }
                            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.35rem" }}
                            >
                              <Save size={14} />
                              <span>Guardar</span>
                            </button>
                          </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          <div className={`periodizacion-delete-row ${embedded ? "periodizacion-delete-row-embedded" : ""}`}>
            <button
              type="button"
              className="btn-danger btn-inline-icon periodizacion-delete-btn"
              onClick={() => setModalEliminarOpen(true)}
              disabled={eliminando}
            >
              <Trash2 size={14} />
              <span>
                {eliminando ? "Eliminando..." : "Eliminar"}
                <br />
                periodizacion
              </span>
            </button>
          </div>
        </div>
      )}

      {modalEliminarOpen && (
        <div className="admin-modal">
          <div className="admin-modal-content admin-modal-tight">
            <button
              type="button"
              className="admin-modal-close-btn"
              onClick={() => setModalEliminarOpen(false)}
              aria-label="Cerrar modal"
            >
              <X size={14} />
            </button>
            <h3>Eliminar periodizacion</h3>
            <p>
              Solo se eliminará si no tiene insumos asociados. Esta accion no se puede deshacer.
            </p>
            <div className="modal-buttons cursos-modal-buttons">
              <button
                type="button"
                className="btn-cancel btn-inline-icon"
                onClick={() => setModalEliminarOpen(false)}
              >
                <X size={14} />
                Cancelar
              </button>
              <button
                type="button"
                className="btn-danger btn-inline-icon"
                onClick={eliminarConfiguracion}
                disabled={eliminando}
              >
                <Trash2 size={14} />
                {eliminando ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return embedded ? (
    contenido
  ) : (
    <AdminLayout
      title="Periodizacion"
      subtitle={
        esModoPersonal
          ? "Configura los periodos academicos de tu espacio personal por año lectivo."
          : "Configure los periodos academicos por contexto y año lectivo."
      }
    >
      {contenido}
    </AdminLayout>
  );
}

export default PeriodizacionPage;
