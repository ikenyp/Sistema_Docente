import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import { cursosAPI, periodizacionAPI } from "../../services/api";
import { notify } from "../../components/notify";

const TIPOS_PERIODIZACION = {
  quimestral: { label: "Quimestral", cantidad: 2, singular: "Quimestre" },
  trimestral: { label: "Trimestral", cantidad: 3, singular: "Trimestre" },
  bimestral: { label: "Bimestral", cantidad: 4, singular: "Bimestre" },
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

function PeriodizacionPage() {
  const navigate = useNavigate();
  const [anios, setAnios] = useState([]);
  const [anioSel, setAnioSel] = useState("");
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [tipoPeriodizacion, setTipoPeriodizacion] = useState("trimestral");
  const [periodosForm, setPeriodosForm] = useState(crearPeriodos(3));
  const [configuracionActual, setConfiguracionActual] = useState(null);

  const appMode =
    (localStorage.getItem("app_mode") || "institucional").toLowerCase();
  const esModoPersonal = appMode === "personal";

  const aniosSugeridos = useMemo(() => {
    const year = new Date().getFullYear();
    return [`${year}-${year + 1}`, `${year - 1}-${year}`];
  }, []);

  const aniosDisponibles = anios.length > 0 ? anios : aniosSugeridos;

  const resumenConfiguracion = useMemo(() => {
    const cantidad = configuracionActual?.periodos?.length || 0;
    const tipo = detectarTipo(cantidad);
    return {
      cantidad,
      completa: cantidad === TIPOS_PERIODIZACION[tipo].cantidad,
      tipo,
    };
  }, [configuracionActual]);

  const calcularAniosDisponibles = (cursosData = []) => {
    const aniosSet = new Set(
      cursosData.map((c) => c.anio_lectivo).filter(Boolean),
    );
    return Array.from(aniosSet).sort().reverse();
  };

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const cl = await cursosAPI.listar({ size: 100 });
      setAnios(calcularAniosDisponibles(cl || []));
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
    if (!anioSel) return;
    let cancelado = false;

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

  const actualizarPeriodo = (index, campo, valor) => {
    setPeriodosForm((prev) => {
      const copia = [...prev];
      copia[index] = { ...copia[index], [campo]: valor };
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
        return `Los periodos ${previo.numero_periodo} y ${actual.numero_periodo} se solapan o no respetan continuidad`;
      }
    }

    return null;
  };

  const guardarConfiguracion = async () => {
    if (!anioSel) {
      notify("error", "Selecciona un año lectivo");
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

  const tipoActual = TIPOS_PERIODIZACION[tipoPeriodizacion];
  const volverA = esModoPersonal ? "/docente" : "/admin";

  return (
    <AdminLayout
      title="Periodizacion"
      subtitle={
        esModoPersonal
          ? "Configura los periodos academicos de tu espacio personal por año lectivo."
          : "Configure los periodos academicos por contexto y año lectivo."
      }
    >
      <div className="admin-hub-toolbar">
        <button
          type="button"
          className="btn-secondary btn-back-link"
          onClick={() => navigate(volverA)}
        >
          Volver
        </button>
      </div>

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
          <p className="stat-sub">Registrados para {anioSel || "el año"}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Estado</p>
          <h3 className="stat-value">
            {resumenConfiguracion.completa ? "Completa" : "Pendiente"}
          </h3>
          <p className="stat-sub">Revise continuidad y fechas</p>
        </div>
      </div>

      <div className="admin-year-bar" style={{ marginBottom: 16 }}>
        <label className="admin-inline-label">
          Año lectivo
          <select value={anioSel} onChange={(e) => setAnioSel(e.target.value)}>
            {aniosDisponibles.map((anio) => (
              <option key={anio} value={anio}>
                {anio}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="section-block">
        <div className="section-block-head">
          <h3>Configuracion general</h3>
          <p>
            {esModoPersonal
              ? "Esta pantalla administra la configuracion academica de tu contexto personal."
              : "Esta pantalla administra la configuracion academica del año lectivo."}
          </p>
        </div>

        <div className="dashboard-grid dashboard-grid-2 admin-action-grid">
          {Object.entries(TIPOS_PERIODIZACION).map(([key, config]) => (
            <button
              key={key}
              type="button"
              className="admin-action-card"
              onClick={() => cambiarTipo(key)}
              style={{
                border:
                  tipoPeriodizacion === key
                    ? "2px solid #2f72b5"
                    : "1px solid #dce5f4",
              }}
            >
              <span className="admin-action-title">{config.label}</span>
              <span className="admin-action-sub">
                {config.cantidad} periodos por año lectivo
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="panel-divider" />

      <div className="section-block">
        <div className="section-block-head">
          <h3>Definicion de periodos</h3>
          <p>
            Complete fechas continuas y sin solapamientos para cada
            {` ${tipoActual.singular.toLowerCase()}`}.
          </p>
        </div>

        <div className="table-container">
          {periodosForm.map((periodo, index) => (
            <div
              key={periodo.numero_periodo}
              style={{
                display: "grid",
                gridTemplateColumns: "160px 1fr 1fr",
                gap: 12,
                marginBottom: 12,
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
              />
              <input
                type="date"
                value={periodo.fecha_fin}
                onChange={(e) =>
                  actualizarPeriodo(index, "fecha_fin", e.target.value)
                }
              />
            </div>
          ))}

          <div className="modal-buttons" style={{ justifyContent: "flex-start" }}>
            <button
              className="btn-save"
              onClick={guardarConfiguracion}
              disabled={guardando || cargando}
            >
              {guardando ? "Guardando..." : "Guardar periodizacion"}
            </button>
          </div>
        </div>
      </div>

      <div className="panel-divider" />

      <div className="section-block">
        <div className="section-block-head">
          <h3>Periodos registrados</h3>
          <p>Vista actual del año lectivo seleccionado.</p>
        </div>

        <div className="table-container">
          {cargando ? (
            <p>Cargando...</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Periodo</th>
                  <th>Año lectivo</th>
                  <th>Fecha inicio</th>
                  <th>Fecha fin</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {(configuracionActual?.periodos || []).map((item) => (
                  <tr key={item.id_periodo}>
                    <td>
                      {item.nombre_periodo ||
                        `${tipoActual.singular} ${item.numero_periodo}`}
                    </td>
                    <td>{anioSel}</td>
                    <td>{item.fecha_inicio?.slice(0, 10) || "-"}</td>
                    <td>{item.fecha_fin?.slice(0, 10) || "-"}</td>
                    <td>-</td>
                  </tr>
                ))}
                {(!configuracionActual?.periodos ||
                  configuracionActual.periodos.length === 0) && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center" }}>
                      No hay periodos configurados para este año lectivo
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

export default PeriodizacionPage;
